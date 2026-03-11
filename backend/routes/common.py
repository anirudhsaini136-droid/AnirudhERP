from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import uuid
import time
import os
import cloudinary
import cloudinary.utils
import cloudinary.uploader

from auth import get_current_user, TokenData
from database import get_db
from pydantic import BaseModel

router = APIRouter(tags=["Common"])

def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def get_store():
    from server import store, use_memory_store
    return store, use_memory_store()

# ============== NOTIFICATIONS ==============
@router.get("/api/notifications")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: TokenData = Depends(get_current_user),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    
    if use_memory:
        notifications = [n for n in store.notifications.values() if n.get("user_id") == current_user.user_id]
        
        if unread_only:
            notifications = [n for n in notifications if not n.get("is_read")]
        
        notifications.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        notifications = notifications[:limit]
        
        unread_count = len([n for n in store.notifications.values() 
            if n.get("user_id") == current_user.user_id and not n.get("is_read")])
        
        return {
            "notifications": notifications,
            "unread_count": unread_count
        }
    else:
        return {"notifications": [], "unread_count": 0}

@router.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    store, use_memory = get_store()
    
    if use_memory:
        notification = store.notifications.get(notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if notification.get("user_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        notification["is_read"] = True
        
        return {"message": "Notification marked as read"}
    else:
        return {"message": "Database mode"}

@router.put("/api/notifications/read-all")
async def mark_all_notifications_read(current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    store, use_memory = get_store()
    
    if use_memory:
        for n in store.notifications.values():
            if n.get("user_id") == current_user.user_id:
                n["is_read"] = True
        
        return {"message": "All notifications marked as read"}
    else:
        return {"message": "Database mode"}

# ============== CLOUDINARY ==============
ALLOWED_FOLDERS = ("users/", "employees/", "businesses/", "invoices/", "receipts/", "products/", "uploads/")

@router.get("/api/cloudinary/signature")
async def generate_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "video", "raw"]),
    folder: str = "uploads",
    current_user: TokenData = Depends(get_current_user)
):
    # Validate folder
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS) and folder not in ["uploads"]:
        # Add business_id prefix for security
        folder = f"businesses/{current_user.business_id}/{folder}" if current_user.business_id else f"users/{current_user.user_id}/{folder}"
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    api_secret = os.environ.get('CLOUDINARY_API_SECRET', 'your_api_secret')
    
    # Check if cloudinary is properly configured
    if api_secret == 'your_api_secret':
        return {
            "error": "Cloudinary not configured",
            "message": "Please add valid Cloudinary credentials to .env file"
        }
    
    signature = cloudinary.utils.api_sign_request(params, api_secret)
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get('CLOUDINARY_CLOUD_NAME', 'your_cloud_name'),
        "api_key": os.environ.get('CLOUDINARY_API_KEY', 'your_api_key'),
        "folder": folder,
        "resource_type": resource_type
    }

@router.delete("/api/cloudinary/{public_id:path}")
async def delete_cloudinary_asset(public_id: str, current_user: TokenData = Depends(get_current_user)):
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return {"message": "Asset deleted", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== STRIPE PAYMENTS ==============
@router.post("/api/stripe/create-checkout")
async def create_stripe_checkout(
    plan: str,
    billing_period: str = "monthly",
    origin_url: str = None,
    current_user: TokenData = Depends(get_current_user),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    
    from server import PLAN_PRICES, STRIPE_API_KEY
    
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if billing_period not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid billing period")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="Origin URL required")
    
    amount = PLAN_PRICES[plan][billing_period]
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        webhook_url = f"{origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/dashboard/settings?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/dashboard/settings"
        
        checkout_request = CheckoutSessionRequest(
            amount=float(amount),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "business_id": current_user.business_id or "",
                "user_id": current_user.user_id,
                "plan": plan,
                "billing_period": billing_period
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Record transaction
        if use_memory:
            tx_id = generate_id()
            store.payment_transactions[tx_id] = {
                "id": tx_id,
                "business_id": current_user.business_id,
                "session_id": session.session_id,
                "amount": amount,
                "currency": "USD",
                "payment_status": "pending",
                "status": "initiated",
                "metadata": str({
                    "plan": plan,
                    "billing_period": billing_period
                }),
                "created_at": utc_now().isoformat(),
                "updated_at": utc_now().isoformat()
            }
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.get("/api/stripe/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    store, use_memory = get_store()
    
    from server import STRIPE_API_KEY
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction if payment completed
        if use_memory and status.payment_status == "paid":
            tx = next((t for t in store.payment_transactions.values() if t.get("session_id") == session_id), None)
            if tx and tx.get("payment_status") != "paid":
                tx["payment_status"] = "paid"
                tx["status"] = "completed"
                tx["updated_at"] = utc_now().isoformat()
                
                # Update business subscription
                business_id = current_user.business_id
                if business_id:
                    business = store.businesses.get(business_id)
                    if business:
                        metadata = status.metadata or {}
                        plan = metadata.get("plan", business["plan"])
                        billing_period = metadata.get("billing_period", "monthly")
                        
                        # Calculate new expiry
                        now = utc_now()
                        current_expiry = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else now
                        if current_expiry < now:
                            current_expiry = now
                        
                        days_to_add = 365 if billing_period == "yearly" else 30
                        new_expiry = current_expiry + timedelta(days=days_to_add)
                        
                        business["subscription_expires_at"] = new_expiry.isoformat()
                        business["plan"] = plan
                        business["status"] = "active"
                        business["payment_type"] = "stripe"
                        business["updated_at"] = now.isoformat()
                        
                        # Record in subscription history
                        hist_id = generate_id()
                        store.subscription_history[hist_id] = {
                            "id": hist_id,
                            "business_id": business_id,
                            "action": "extended",
                            "old_value": None,
                            "new_value": new_expiry.isoformat(),
                            "performed_by": current_user.user_id,
                            "notes": f"Stripe payment: {plan} {billing_period}",
                            "created_at": now.isoformat()
                        }
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")

@router.post("/api/webhook/stripe")
async def stripe_webhook(request_body: bytes, stripe_signature: str = None, db=Depends(get_db)):
    # Handle stripe webhook
    # This would process subscription updates from Stripe
    return {"received": True}

# ============== PROFILE ==============
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.put("/api/profile")
async def update_profile(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
    avatar_url: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    
    if use_memory:
        user = store.users.get(current_user.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if first_name:
            user["first_name"] = first_name
        if last_name:
            user["last_name"] = last_name
        if phone:
            user["phone"] = phone
        if avatar_url:
            user["avatar_url"] = avatar_url
        
        user["updated_at"] = utc_now().isoformat()
        
        return {"message": "Profile updated", "user": {k: v for k, v in user.items() if k != "password_hash"}}
    else:
        return {"message": "Database mode"}

@router.put("/api/profile/password")
async def change_password(data: PasswordChange, current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    store, use_memory = get_store()
    
    from server import verify_password, get_password_hash
    
    if use_memory:
        user = store.users.get(current_user.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not verify_password(data.current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        if len(data.new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        
        user["password_hash"] = get_password_hash(data.new_password)
        user["updated_at"] = utc_now().isoformat()
        
        return {"message": "Password changed successfully"}
    else:
        return {"message": "Database mode"}

# Import timedelta for stripe checkout
from datetime import timedelta
