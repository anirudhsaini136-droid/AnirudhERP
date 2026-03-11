from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
import uuid

from auth import get_current_user, require_business_access, TokenData
from database import get_db
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/dashboard", tags=["Business Owner"])

def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# Schemas
class AdminUserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str  # hr_admin, finance_admin, inventory_admin

class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None

# Import store from server module
def get_store():
    from server import store, use_memory_store
    return store, use_memory_store()

@router.get("")
async def business_dashboard(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    now = utc_now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    if use_memory:
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Employee stats
        employees = [e for e in store.employees.values() if e.get("business_id") == business_id and e.get("status") == "active"]
        new_employees = len([e for e in employees if datetime.fromisoformat(e["created_at"]) >= month_start])
        
        # Revenue this month (paid invoices)
        invoices_this_month = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") == "paid"
            and datetime.fromisoformat(i["created_at"]) >= month_start]
        revenue_this_month = sum([float(i.get("total_amount", 0)) for i in invoices_this_month])
        
        # Revenue last month
        invoices_last_month = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") == "paid"
            and last_month_start <= datetime.fromisoformat(i["created_at"]) < month_start]
        revenue_last_month = sum([float(i.get("total_amount", 0)) for i in invoices_last_month])
        
        revenue_change = ((revenue_this_month - revenue_last_month) / revenue_last_month * 100) if revenue_last_month > 0 else 0
        
        # Outstanding invoices
        outstanding_invoices = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") in ["sent", "partially_paid", "overdue"]]
        outstanding_amount = sum([float(i.get("balance_due", 0)) for i in outstanding_invoices])
        overdue_count = len([i for i in outstanding_invoices if i.get("status") == "overdue"])
        
        # Low stock items
        low_stock = [p for p in store.products.values() 
            if p.get("business_id") == business_id 
            and p.get("current_stock", 0) < p.get("minimum_stock", 5)]
        
        # Expenses this month
        expenses_this_month = [e for e in store.expenses.values() 
            if e.get("business_id") == business_id 
            and e.get("status") == "approved"
            and datetime.fromisoformat(e["created_at"]) >= month_start]
        total_expenses = sum([float(e.get("amount", 0)) for e in expenses_this_month])
        
        # Recent activity
        recent_activity = sorted(
            [a for a in store.activity_logs.values() if a.get("business_id") == business_id],
            key=lambda x: x["created_at"], reverse=True
        )[:10]
        
        # Top products (by stock movement)
        product_sales = {}
        for m in store.stock_movements.values():
            if m.get("business_id") == business_id and m.get("movement_type") == "stock_out":
                pid = m.get("product_id")
                product_sales[pid] = product_sales.get(pid, 0) + m.get("quantity", 0)
        
        top_products = []
        for pid, qty in sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:5]:
            product = store.products.get(pid)
            if product:
                top_products.append({"name": product["name"], "sold": qty})
        
        # Revenue chart data (last 8 months)
        chart_data = []
        for i in range(7, -1, -1):
            m = (now.month - i - 1) % 12 + 1
            y = now.year - ((now.month - i - 1) // 12 + (1 if now.month - i <= 0 else 0))
            month_name = datetime(y, m, 1).strftime("%b")
            
            month_revenue = sum([float(inv.get("total_amount", 0)) for inv in store.invoices.values()
                if inv.get("business_id") == business_id
                and inv.get("status") == "paid"
                and datetime.fromisoformat(inv["created_at"]).month == m
                and datetime.fromisoformat(inv["created_at"]).year == y])
            
            month_expenses = sum([float(exp.get("amount", 0)) for exp in store.expenses.values()
                if exp.get("business_id") == business_id
                and exp.get("status") == "approved"
                and datetime.fromisoformat(exp["created_at"]).month == m
                and datetime.fromisoformat(exp["created_at"]).year == y])
            
            chart_data.append({"month": month_name, "revenue": month_revenue, "expenses": month_expenses})
        
        return {
            "stats": {
                "monthly_revenue": revenue_this_month,
                "revenue_change": round(revenue_change, 1),
                "total_employees": len(employees),
                "new_employees": new_employees,
                "outstanding_invoices": outstanding_amount,
                "overdue_count": overdue_count,
                "low_stock_count": len(low_stock),
                "total_expenses": total_expenses,
                "net_profit": revenue_this_month - total_expenses
            },
            "alerts": {
                "payroll_due": False,
                "overdue_invoices": overdue_count > 0,
                "low_stock": len(low_stock) > 0
            },
            "chart_data": chart_data,
            "recent_activity": recent_activity,
            "top_products": top_products,
            "business": business
        }
    else:
        # Database implementation would go here
        return {"message": "Database mode - implement with SQLAlchemy"}

@router.get("/settings")
async def get_business_settings(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    if use_memory:
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Get subscription info
        now = utc_now()
        expires_at = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else None
        days_remaining = (expires_at - now).days if expires_at else 0
        
        # Get payment history
        manual_payments = sorted(
            [p for p in store.manual_payments.values() if p.get("business_id") == business_id],
            key=lambda x: x["created_at"], reverse=True
        )
        
        return {
            "business": business,
            "subscription": {
                "plan": business["plan"],
                "status": business["status"],
                "expires_at": business.get("subscription_expires_at"),
                "days_remaining": days_remaining
            },
            "payment_history": manual_payments
        }
    else:
        return {"message": "Database mode"}

@router.put("/settings")
async def update_business_settings(data: BusinessProfileUpdate, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    if use_memory:
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                business[key] = value
        business["updated_at"] = utc_now().isoformat()
        
        return {"message": "Settings updated", "business": business}
    else:
        return {"message": "Database mode"}

@router.get("/users")
async def list_admin_users(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can manage users")
    
    if use_memory:
        users = [
            {k: v for k, v in u.items() if k != "password_hash"}
            for u in store.users.values() 
            if u.get("business_id") == business_id
        ]
        
        # Get user limit
        business = store.businesses.get(business_id)
        plan = business["plan"] if business else "starter"
        from server import PLAN_LIMITS
        user_limit = PLAN_LIMITS.get(plan, {}).get("users", 5)
        
        return {
            "users": users,
            "total": len(users),
            "limit": user_limit,
            "can_add_more": len(users) < user_limit
        }
    else:
        return {"message": "Database mode"}

@router.post("/users")
async def create_admin_user(data: AdminUserCreate, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can create users")
    
    if data.role not in ["hr_admin", "finance_admin", "inventory_admin", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if use_memory:
        # Check user limit
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        from server import PLAN_LIMITS, get_password_hash, generate_temp_password
        from email_service import send_welcome_email
        
        user_limit = PLAN_LIMITS.get(business["plan"], {}).get("users", 5)
        current_users = len([u for u in store.users.values() if u.get("business_id") == business_id])
        
        if current_users >= user_limit:
            raise HTTPException(status_code=400, detail=f"You have reached the maximum users ({user_limit}) for your plan. Please upgrade to add more users.")
        
        # Check email uniqueness
        if any(u["email"].lower() == data.email.lower() for u in store.users.values()):
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        user_id = generate_id()
        temp_password = generate_temp_password()
        now = utc_now()
        
        store.users[user_id] = {
            "id": user_id,
            "business_id": business_id,
            "email": data.email.lower(),
            "password_hash": get_password_hash(temp_password),
            "visible_password": temp_password,
            "role": data.role,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "avatar_url": None,
            "is_active": True,
            "last_login": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Send welcome email
        await send_welcome_email(data.email, f"{data.first_name} {data.last_name}", temp_password)
        
        return {
            "id": user_id,
            "message": "User created successfully",
            "credentials": {
                "email": data.email,
                "temporary_password": temp_password
            }
        }
    else:
        return {"message": "Database mode"}

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can deactivate users")
    
    if use_memory:
        user = store.users.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Cannot deactivate user from another business")
        
        if user.get("role") == "business_owner":
            raise HTTPException(status_code=400, detail="Cannot deactivate business owner")
        
        user["is_active"] = False
        user["updated_at"] = utc_now().isoformat()
        
        return {"message": "User deactivated"}
    else:
        return {"message": "Database mode"}

@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can activate users")
    
    if use_memory:
        user = store.users.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Cannot activate user from another business")
        
        user["is_active"] = True
        user["updated_at"] = utc_now().isoformat()
        
        return {"message": "User activated"}
    else:
        return {"message": "Database mode"}
