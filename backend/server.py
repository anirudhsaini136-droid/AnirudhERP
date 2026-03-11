from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
import json
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader

from database import get_db, AsyncSessionLocal, engine, Base
from auth import (
    get_password_hash, verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user, require_roles, require_super_admin, 
    require_business_access, TokenData
)
from email_service import (
    send_welcome_email, send_subscription_extended_email, send_subscription_expiring_warning,
    send_subscription_expired_email, send_leave_request_notification, send_leave_status_email,
    send_payroll_ready_email, send_invoice_email, send_invoice_overdue_email,
    send_low_stock_alert, send_password_reset_email
)
from models import (
    Business, User, Employee, Department, Attendance, LeaveRequest, LeaveBalance,
    PayrollRun, PayrollItem, Invoice, InvoiceItem, InvoicePayment, Expense, ExpenseCategory,
    Product, StockMovement, Supplier, PurchaseOrder, PurchaseOrderItem, ManualPayment,
    SubscriptionHistory, Notification, ActivityLog, PaymentTransaction, PlatformSettings,
    PlanType, BusinessStatus, PaymentType, UserRole, EmploymentType, EmployeeStatus,
    Gender, AttendanceStatus, ClockInMethod, LeaveType, LeaveStatus, PayrollStatus,
    PayrollItemStatus, InvoiceStatus, ExpenseStatus, ProductStatus, MovementType,
    PurchaseOrderStatus, SupplierStatus, ManualPaymentMethod, SubscriptionAction
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'your_cloud_name'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', 'your_api_key'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 'your_api_secret'),
    secure=True
)

# Stripe setup
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Plan pricing
PLAN_PRICES = {
    "starter": {"monthly": 2499.00, "yearly": 24990.00},
    "growth": {"monthly": 6499.00, "yearly": 64990.00},
    "enterprise": {"monthly": 16499.00, "yearly": 164990.00}
}

PLAN_LIMITS = {
    "starter": {"users": 5},
    "growth": {"users": 25},
    "enterprise": {"users": 99999}
}

TRIAL_DAYS = 14

app = FastAPI(title="NexusERP API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== PYDANTIC SCHEMAS ==============
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

class BusinessCreate(BaseModel):
    name: str
    owner_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    plan: str = "starter"
    initial_days: int = 30
    payment_method: str = "cash"
    amount_paid: float = 0
    notes: Optional[str] = None

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None

class ExtendSubscription(BaseModel):
    duration_days: int
    payment_method: str
    amount: float
    currency: str = "INR"
    payment_date: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ChangePlan(BaseModel):
    new_plan: str

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str
    password: Optional[str] = None

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: str = "full_time"
    start_date: Optional[str] = None
    base_salary: float = 0
    salary_currency: str = "INR"
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    national_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    create_user_account: bool = False

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    base_salary: Optional[float] = None
    salary_currency: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    national_id: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    status: Optional[str] = None

class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    status: str = "present"
    clock_in_time: Optional[str] = None
    clock_out_time: Optional[str] = None
    notes: Optional[str] = None

class ClockAction(BaseModel):
    action: str  # "clock_in" or "clock_out"

class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: Optional[str] = None

class LeaveReview(BaseModel):
    status: str  # "approved" or "denied"
    notes: Optional[str] = None

class PayrollRunCreate(BaseModel):
    month: int
    year: int

class PayrollItemUpdate(BaseModel):
    bonus: float = 0
    overtime_pay: float = 0
    allowances: float = 0
    tax_deduction: float = 0
    other_deductions: float = 0

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_phone: Optional[str] = None
    issue_date: str
    due_date: str
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    currency: str = "INR"
    tax_rate: float = 0
    discount_amount: float = 0
    items: List[dict]

class InvoicePaymentCreate(BaseModel):
    amount: float
    payment_date: str
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

class ExpenseCreate(BaseModel):
    category: str
    description: Optional[str] = None
    amount: float
    currency: str = "INR"
    date: str
    receipt_url: Optional[str] = None

class ExpenseReview(BaseModel):
    status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: float = 0
    cost_price: float = 0
    current_stock: int = 0
    minimum_stock: int = 5
    maximum_stock: Optional[int] = None
    unit_of_measure: Optional[str] = None
    barcode: Optional[str] = None

class StockMovementCreate(BaseModel):
    product_id: str
    movement_type: str
    quantity: int
    reference: Optional[str] = None
    notes: Optional[str] = None

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    expected_delivery_date: Optional[str] = None
    notes: Optional[str] = None
    items: List[dict]

class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: Optional[str] = None
    action_url: Optional[str] = None

class PlatformSettingUpdate(BaseModel):
    setting_key: str
    setting_value: str

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target: str = "all"  # "all", "starter", "growth", "enterprise"

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# ============== HELPER FUNCTIONS ==============
def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def format_date(d):
    if isinstance(d, str):
        return d
    if isinstance(d, (datetime, date)):
        return d.strftime("%B %d, %Y")
    return str(d)

def parse_date(d):
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d, "%Y-%m-%d").date()
    return None

def decimal_to_float(val):
    if isinstance(val, Decimal):
        return float(val)
    return val

def serialize_model(obj, exclude_fields=None):
    if obj is None:
        return None
    exclude_fields = exclude_fields or []
    result = {}
    for key in obj.__table__.columns.keys():
        if key in exclude_fields:
            continue
        val = getattr(obj, key)
        if isinstance(val, datetime):
            result[key] = val.isoformat()
        elif isinstance(val, date):
            result[key] = val.isoformat()
        elif isinstance(val, Decimal):
            result[key] = float(val)
        elif hasattr(val, 'value'):
            result[key] = val.value
        else:
            result[key] = val
    return result

def generate_employee_code(business_id: str) -> str:
    return f"EMP-{business_id[:4].upper()}-{str(uuid.uuid4())[:6].upper()}"

def generate_invoice_number(business_id: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M")
    return f"INV-{timestamp}-{str(uuid.uuid4())[:4].upper()}"

def generate_order_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M")
    return f"PO-{timestamp}-{str(uuid.uuid4())[:4].upper()}"

def generate_temp_password():
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))

async def log_activity(db, business_id: str, user_id: str, action: str, entity_type: str = None, entity_id: str = None, description: str = None, ip_address: str = None):
    if db is None:
        return
    from sqlalchemy import insert
    stmt = insert(ActivityLog).values(
        id=generate_id(),
        business_id=business_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        created_at=utc_now()
    )
    await db.execute(stmt)
    await db.commit()

async def create_notification(db, business_id: str, user_id: str, type: str, title: str, message: str = None, action_url: str = None):
    if db is None:
        return
    from sqlalchemy import insert
    stmt = insert(Notification).values(
        id=generate_id(),
        business_id=business_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        action_url=action_url,
        is_read=False,
        created_at=utc_now()
    )
    await db.execute(stmt)
    await db.commit()

async def check_subscription_status(db, business_id: str):
    """Check and update subscription status if expired"""
    if db is None:
        return None
    from sqlalchemy import select, update
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        return None
    
    now = utc_now()
    if business.subscription_expires_at and business.subscription_expires_at < now:
        if business.status not in [BusinessStatus.suspended, BusinessStatus.expired, BusinessStatus.cancelled]:
            stmt = update(Business).where(Business.id == business_id).values(
                status=BusinessStatus.expired,
                updated_at=now
            )
            await db.execute(stmt)
            
            # Log subscription history
            from sqlalchemy import insert
            hist_stmt = insert(SubscriptionHistory).values(
                id=generate_id(),
                business_id=business_id,
                action=SubscriptionAction.expired,
                old_value=business.status.value if business.status else None,
                new_value="expired",
                notes="Subscription expired automatically",
                created_at=now
            )
            await db.execute(hist_stmt)
            await db.commit()
            
            # Send expiry email
            await send_subscription_expired_email(business.email, business.owner_name)
            
            return "expired"
    return business.status.value if business.status else None

# ============== IN-MEMORY STORE (for demo without DB) ==============
# This allows the app to work even without Supabase configured
class InMemoryStore:
    def __init__(self):
        self.businesses = {}
        self.users = {}
        self.employees = {}
        self.departments = {}
        self.attendance = {}
        self.leave_requests = {}
        self.leave_balances = {}
        self.payroll_runs = {}
        self.payroll_items = {}
        self.invoices = {}
        self.invoice_items = {}
        self.invoice_payments = {}
        self.expenses = {}
        self.expense_categories = {}
        self.products = {}
        self.stock_movements = {}
        self.suppliers = {}
        self.purchase_orders = {}
        self.purchase_order_items = {}
        self.manual_payments = {}
        self.subscription_history = {}
        self.notifications = {}
        self.activity_logs = {}
        self.payment_transactions = {}
        self.platform_settings = {
            "trial_days": "14",
            "starter_price_monthly": "29.00",
            "starter_price_yearly": "290.00",
            "growth_price_monthly": "79.00",
            "growth_price_yearly": "790.00",
            "enterprise_price_monthly": "199.00",
            "enterprise_price_yearly": "1990.00"
        }
        self._init_super_admin()
    
    def _init_super_admin(self):
        admin_id = generate_id()
        self.users[admin_id] = {
            "id": admin_id,
            "business_id": None,
            "email": "admin@nexuserp.com",
            "password_hash": get_password_hash("Admin123!"),
            "visible_password": "Admin123!",
            "role": "super_admin",
            "first_name": "Super",
            "last_name": "Admin",
            "phone": None,
            "avatar_url": None,
            "is_active": True,
            "last_login": None,
            "created_at": utc_now().isoformat(),
            "updated_at": utc_now().isoformat()
        }

store = InMemoryStore()

def use_memory_store():
    return AsyncSessionLocal is None

# ============== AUTH ROUTES ==============
@api_router.post("/auth/login")
async def login(request: LoginRequest, db=Depends(get_db)):
    email = request.email.lower()
    
    if use_memory_store():
        user = next((u for u in store.users.values() if u["email"].lower() == email), None)
        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user["is_active"]:
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Check subscription for non-super_admin
        if user["role"] != "super_admin" and user["business_id"]:
            business = store.businesses.get(user["business_id"])
            if business:
                expires_at = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else None
                if expires_at and expires_at < utc_now():
                    if business["status"] not in ["suspended", "expired", "cancelled"]:
                        business["status"] = "expired"
        
        user["last_login"] = utc_now().isoformat()
        
        token_data = {
            "user_id": user["id"],
            "business_id": user["business_id"],
            "role": user["role"],
            "email": user["email"]
        }
        
        return {
            "access_token": create_access_token(token_data),
            "refresh_token": create_refresh_token(token_data),
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "business_id": user["business_id"],
                "avatar_url": user["avatar_url"]
            }
        }
    else:
        from sqlalchemy import select, update
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Check subscription
        if user.role != UserRole.super_admin and user.business_id:
            status = await check_subscription_status(db, user.business_id)
            if status in ["suspended", "expired", "cancelled"]:
                pass  # Let them login but frontend will redirect to expired page
        
        # Update last login
        stmt = update(User).where(User.id == user.id).values(last_login=utc_now())
        await db.execute(stmt)
        await db.commit()
        
        token_data = {
            "user_id": user.id,
            "business_id": user.business_id,
            "role": user.role.value,
            "email": user.email
        }
        
        return {
            "access_token": create_access_token(token_data),
            "refresh_token": create_refresh_token(token_data),
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role.value,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "business_id": user.business_id,
                "avatar_url": user.avatar_url
            }
        }

@api_router.post("/auth/refresh")
async def refresh_token(request: RefreshRequest):
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    token_data = {
        "user_id": payload.get("user_id"),
        "business_id": payload.get("business_id"),
        "role": payload.get("role"),
        "email": payload.get("email")
    }
    
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data)
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    if use_memory_store():
        user = store.users.get(current_user.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        business = None
        subscription_status = None
        days_remaining = None
        
        if user["business_id"]:
            business = store.businesses.get(user["business_id"])
            if business:
                expires_at = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else None
                if expires_at:
                    days_remaining = (expires_at - utc_now()).days
                    if days_remaining < 0:
                        subscription_status = "expired"
                    else:
                        subscription_status = business["status"]
        
        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "phone": user["phone"],
                "avatar_url": user["avatar_url"],
                "business_id": user["business_id"]
            },
            "business": {
                "id": business["id"],
                "name": business["name"],
                "plan": business["plan"],
                "status": subscription_status or business["status"],
                "subscription_expires_at": business.get("subscription_expires_at"),
                "days_remaining": days_remaining
            } if business else None,
            "impersonating": current_user.impersonating
        }
    else:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == current_user.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        business_data = None
        if user.business_id:
            await check_subscription_status(db, user.business_id)
            biz_result = await db.execute(select(Business).where(Business.id == user.business_id))
            business = biz_result.scalar_one_or_none()
            if business:
                days_remaining = None
                if business.subscription_expires_at:
                    days_remaining = (business.subscription_expires_at - utc_now()).days
                business_data = {
                    "id": business.id,
                    "name": business.name,
                    "plan": business.plan.value if business.plan else None,
                    "status": business.status.value if business.status else None,
                    "subscription_expires_at": business.subscription_expires_at.isoformat() if business.subscription_expires_at else None,
                    "days_remaining": days_remaining
                }
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role.value,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "avatar_url": user.avatar_url,
                "business_id": user.business_id
            },
            "business": business_data,
            "impersonating": current_user.impersonating
        }

@api_router.get("/auth/check-subscription")
async def check_subscription(current_user: TokenData = Depends(get_current_user), db=Depends(get_db)):
    if current_user.role == "super_admin":
        return {"status": "active", "is_valid": True}
    
    if not current_user.business_id:
        return {"status": "no_business", "is_valid": False}
    
    if use_memory_store():
        business = store.businesses.get(current_user.business_id)
        if not business:
            return {"status": "no_business", "is_valid": False}
        
        expires_at = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else None
        if expires_at and expires_at < utc_now():
            return {"status": "expired", "is_valid": False}
        
        if business["status"] in ["suspended", "expired", "cancelled"]:
            return {"status": business["status"], "is_valid": False}
        
        days_remaining = (expires_at - utc_now()).days if expires_at else 0
        return {
            "status": business["status"],
            "is_valid": True,
            "days_remaining": days_remaining,
            "is_trial": business["status"] == "trial"
        }
    else:
        status = await check_subscription_status(db, current_user.business_id)
        from sqlalchemy import select
        result = await db.execute(select(Business).where(Business.id == current_user.business_id))
        business = result.scalar_one_or_none()
        
        if not business:
            return {"status": "no_business", "is_valid": False}
        
        if business.status in [BusinessStatus.suspended, BusinessStatus.expired, BusinessStatus.cancelled]:
            return {"status": business.status.value, "is_valid": False}
        
        days_remaining = 0
        if business.subscription_expires_at:
            days_remaining = (business.subscription_expires_at - utc_now()).days
        
        return {
            "status": business.status.value,
            "is_valid": True,
            "days_remaining": days_remaining,
            "is_trial": business.status == BusinessStatus.trial
        }

# ============== SUPER ADMIN ROUTES ==============
@api_router.get("/super-admin/dashboard")
async def super_admin_dashboard(current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        businesses = list(store.businesses.values())
        total = len(businesses)
        active = len([b for b in businesses if b["status"] == "active"])
        trial = len([b for b in businesses if b["status"] == "trial"])
        suspended = len([b for b in businesses if b["status"] == "suspended"])
        expired = len([b for b in businesses if b["status"] == "expired"])
        
        # Calculate MRR
        mrr = sum([
            PLAN_PRICES.get(b["plan"], {}).get("monthly", 0)
            for b in businesses if b["status"] == "active"
        ])
        
        # Expiring soon
        now = utc_now()
        expiring_14_days = []
        expiring_3_days = []
        for b in businesses:
            if b.get("subscription_expires_at"):
                expires_at = datetime.fromisoformat(b["subscription_expires_at"])
                days = (expires_at - now).days
                if 0 < days <= 14:
                    expiring_14_days.append({**b, "days_remaining": days})
                if 0 < days <= 3:
                    expiring_3_days.append({**b, "days_remaining": days})
        
        # This month stats
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_signups = len([b for b in businesses if datetime.fromisoformat(b["created_at"]) >= month_start])
        
        manual_payments_this_month = sum([
            p["amount"] for p in store.manual_payments.values()
            if datetime.fromisoformat(p["created_at"]) >= month_start
        ])
        
        # Recent activity
        recent_activity = sorted(store.activity_logs.values(), key=lambda x: x["created_at"], reverse=True)[:20]
        
        return {
            "stats": {
                "total_businesses": total,
                "active_businesses": active,
                "trial_businesses": trial,
                "suspended_businesses": suspended,
                "expired_businesses": expired,
                "mrr": mrr,
                "new_signups_this_month": new_signups,
                "manual_payments_this_month": manual_payments_this_month,
                "stripe_revenue_this_month": 0
            },
            "expiring_warnings": {
                "within_14_days": expiring_14_days,
                "within_3_days": expiring_3_days
            },
            "recent_activity": recent_activity
        }
    else:
        from sqlalchemy import select, func
        
        # Business counts
        total_result = await db.execute(select(func.count(Business.id)))
        total = total_result.scalar() or 0
        
        active_result = await db.execute(select(func.count(Business.id)).where(Business.status == BusinessStatus.active))
        active = active_result.scalar() or 0
        
        trial_result = await db.execute(select(func.count(Business.id)).where(Business.status == BusinessStatus.trial))
        trial = trial_result.scalar() or 0
        
        suspended_result = await db.execute(select(func.count(Business.id)).where(Business.status == BusinessStatus.suspended))
        suspended = suspended_result.scalar() or 0
        
        expired_result = await db.execute(select(func.count(Business.id)).where(Business.status == BusinessStatus.expired))
        expired = expired_result.scalar() or 0
        
        # MRR calculation
        mrr = 0
        active_businesses = await db.execute(select(Business).where(Business.status == BusinessStatus.active))
        for biz in active_businesses.scalars():
            if biz.plan:
                mrr += PLAN_PRICES.get(biz.plan.value, {}).get("monthly", 0)
        
        # Expiring soon
        now = utc_now()
        in_14_days = now + timedelta(days=14)
        in_3_days = now + timedelta(days=3)
        
        expiring_14 = await db.execute(
            select(Business).where(
                Business.subscription_expires_at > now,
                Business.subscription_expires_at <= in_14_days,
                Business.status.notin_([BusinessStatus.suspended, BusinessStatus.expired, BusinessStatus.cancelled])
            )
        )
        expiring_14_days = []
        for b in expiring_14.scalars():
            days = (b.subscription_expires_at - now).days
            expiring_14_days.append({**serialize_model(b), "days_remaining": days})
        
        expiring_3 = await db.execute(
            select(Business).where(
                Business.subscription_expires_at > now,
                Business.subscription_expires_at <= in_3_days,
                Business.status.notin_([BusinessStatus.suspended, BusinessStatus.expired, BusinessStatus.cancelled])
            )
        )
        expiring_3_days = []
        for b in expiring_3.scalars():
            days = (b.subscription_expires_at - now).days
            expiring_3_days.append({**serialize_model(b), "days_remaining": days})
        
        # This month stats
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        new_signups_result = await db.execute(
            select(func.count(Business.id)).where(Business.created_at >= month_start)
        )
        new_signups = new_signups_result.scalar() or 0
        
        manual_total = await db.execute(
            select(func.sum(ManualPayment.amount)).where(ManualPayment.created_at >= month_start)
        )
        manual_payments_this_month = float(manual_total.scalar() or 0)
        
        # Recent activity
        recent = await db.execute(
            select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(20)
        )
        recent_activity = [serialize_model(a) for a in recent.scalars()]
        
        return {
            "stats": {
                "total_businesses": total,
                "active_businesses": active,
                "trial_businesses": trial,
                "suspended_businesses": suspended,
                "expired_businesses": expired,
                "mrr": mrr,
                "new_signups_this_month": new_signups,
                "manual_payments_this_month": manual_payments_this_month,
                "stripe_revenue_this_month": 0
            },
            "expiring_warnings": {
                "within_14_days": expiring_14_days,
                "within_3_days": expiring_3_days
            },
            "recent_activity": recent_activity
        }

@api_router.get("/super-admin/businesses")
async def list_businesses(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_super_admin),
    db=Depends(get_db)
):
    if use_memory_store():
        businesses = list(store.businesses.values())
        
        if search:
            search_lower = search.lower()
            businesses = [b for b in businesses if search_lower in b["name"].lower() or search_lower in b["email"].lower()]
        
        if plan and plan != "all":
            businesses = [b for b in businesses if b["plan"] == plan]
        
        if status and status != "all":
            businesses = [b for b in businesses if b["status"] == status]
        
        # Add days remaining and MRR
        now = utc_now()
        for b in businesses:
            expires_at = datetime.fromisoformat(b["subscription_expires_at"]) if b.get("subscription_expires_at") else None
            b["days_remaining"] = (expires_at - now).days if expires_at else 0
            b["mrr"] = PLAN_PRICES.get(b["plan"], {}).get("monthly", 0) if b["status"] == "active" else 0
        
        # Sort by created_at desc
        businesses.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Paginate
        total = len(businesses)
        start = (page - 1) * limit
        businesses = businesses[start:start + limit]
        
        return {
            "businesses": businesses,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    else:
        from sqlalchemy import select, func, or_
        
        query = select(Business)
        count_query = select(func.count(Business.id))
        
        if search:
            search_filter = or_(
                Business.name.ilike(f"%{search}%"),
                Business.email.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        if plan and plan != "all":
            query = query.where(Business.plan == PlanType(plan))
            count_query = count_query.where(Business.plan == PlanType(plan))
        
        if status and status != "all":
            query = query.where(Business.status == BusinessStatus(status))
            count_query = count_query.where(Business.status == BusinessStatus(status))
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        query = query.order_by(Business.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await db.execute(query)
        
        now = utc_now()
        businesses = []
        for b in result.scalars():
            data = serialize_model(b)
            days_remaining = 0
            if b.subscription_expires_at:
                days_remaining = (b.subscription_expires_at - now).days
            data["days_remaining"] = days_remaining
            data["mrr"] = PLAN_PRICES.get(b.plan.value, {}).get("monthly", 0) if b.status == BusinessStatus.active else 0
            businesses.append(data)
        
        return {
            "businesses": businesses,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }

@api_router.post("/super-admin/businesses")
async def create_business(data: BusinessCreate, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    now = utc_now()
    business_id = generate_id()
    user_id = generate_id()
    temp_password = generate_temp_password()
    
    expires_at = now + timedelta(days=data.initial_days)
    initial_status = "trial" if data.initial_days <= TRIAL_DAYS else "active"
    
    if use_memory_store():
        # Check email uniqueness
        if any(b["email"].lower() == data.email.lower() for b in store.businesses.values()):
            raise HTTPException(status_code=400, detail="Business with this email already exists")
        if any(u["email"].lower() == data.email.lower() for u in store.users.values()):
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Create business
        store.businesses[business_id] = {
            "id": business_id,
            "name": data.name,
            "owner_name": data.owner_name,
            "email": data.email.lower(),
            "phone": data.phone,
            "address": data.address,
            "city": data.city,
            "country": data.country,
            "logo_url": None,
            "plan": data.plan,
            "status": initial_status,
            "trial_ends_at": (now + timedelta(days=TRIAL_DAYS)).isoformat() if initial_status == "trial" else None,
            "subscription_expires_at": expires_at.isoformat(),
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "payment_type": "manual",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Create owner user
        store.users[user_id] = {
            "id": user_id,
            "business_id": business_id,
            "email": data.email.lower(),
            "password_hash": get_password_hash(temp_password),
            "visible_password": temp_password,
            "role": "business_owner",
            "first_name": data.owner_name.split()[0] if data.owner_name else "Owner",
            "last_name": " ".join(data.owner_name.split()[1:]) if data.owner_name and len(data.owner_name.split()) > 1 else "",
            "phone": data.phone,
            "avatar_url": None,
            "is_active": True,
            "last_login": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Record manual payment if amount > 0
        if data.amount_paid > 0:
            payment_id = generate_id()
            store.manual_payments[payment_id] = {
                "id": payment_id,
                "business_id": business_id,
                "amount": data.amount_paid,
                "currency": "INR",
                "payment_method": data.payment_method,
                "payment_date": now.date().isoformat(),
                "duration_days": data.initial_days,
                "notes": data.notes,
                "reference_number": None,
                "extended_by": current_user.user_id,
                "previous_expiry_date": None,
                "new_expiry_date": expires_at.isoformat(),
                "created_at": now.isoformat()
            }
        
        # Subscription history
        hist_id = generate_id()
        store.subscription_history[hist_id] = {
            "id": hist_id,
            "business_id": business_id,
            "action": "created",
            "old_value": None,
            "new_value": data.plan,
            "performed_by": current_user.user_id,
            "notes": data.notes,
            "created_at": now.isoformat()
        }
        
        # Activity log
        log_id = generate_id()
        store.activity_logs[log_id] = {
            "id": log_id,
            "business_id": business_id,
            "user_id": current_user.user_id,
            "action": "business_created",
            "entity_type": "business",
            "entity_id": business_id,
            "description": f"Created business: {data.name}",
            "ip_address": None,
            "created_at": now.isoformat()
        }
        
        # Send welcome email
        await send_welcome_email(data.email, data.owner_name, temp_password)
        
        return {
            "id": business_id,
            "message": "Business created successfully",
            "owner_credentials": {
                "email": data.email,
                "temporary_password": temp_password
            }
        }
    else:
        from sqlalchemy import insert, select
        
        # Check uniqueness
        existing_biz = await db.execute(select(Business).where(Business.email == data.email.lower()))
        if existing_biz.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Business with this email already exists")
        
        existing_user = await db.execute(select(User).where(User.email == data.email.lower()))
        if existing_user.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Create business
        biz_stmt = insert(Business).values(
            id=business_id,
            name=data.name,
            owner_name=data.owner_name,
            email=data.email.lower(),
            phone=data.phone,
            address=data.address,
            city=data.city,
            country=data.country,
            plan=PlanType(data.plan),
            status=BusinessStatus(initial_status),
            trial_ends_at=now + timedelta(days=TRIAL_DAYS) if initial_status == "trial" else None,
            subscription_expires_at=expires_at,
            payment_type=PaymentType.manual,
            created_at=now,
            updated_at=now
        )
        await db.execute(biz_stmt)
        
        # Create owner user
        first_name = data.owner_name.split()[0] if data.owner_name else "Owner"
        last_name = " ".join(data.owner_name.split()[1:]) if data.owner_name and len(data.owner_name.split()) > 1 else ""
        
        user_stmt = insert(User).values(
            id=user_id,
            business_id=business_id,
            email=data.email.lower(),
            password_hash=get_password_hash(temp_password),
            role=UserRole.business_owner,
            first_name=first_name,
            last_name=last_name,
            phone=data.phone,
            is_active=True,
            created_at=now,
            updated_at=now
        )
        await db.execute(user_stmt)
        
        # Record manual payment
        if data.amount_paid > 0:
            payment_stmt = insert(ManualPayment).values(
                id=generate_id(),
                business_id=business_id,
                amount=data.amount_paid,
                currency="INR",
                payment_method=ManualPaymentMethod(data.payment_method),
                payment_date=now.date(),
                duration_days=data.initial_days,
                notes=data.notes,
                extended_by=current_user.user_id,
                new_expiry_date=expires_at,
                created_at=now
            )
            await db.execute(payment_stmt)
        
        # Subscription history
        hist_stmt = insert(SubscriptionHistory).values(
            id=generate_id(),
            business_id=business_id,
            action=SubscriptionAction.created,
            new_value=data.plan,
            performed_by=current_user.user_id,
            notes=data.notes,
            created_at=now
        )
        await db.execute(hist_stmt)
        
        await db.commit()
        await log_activity(db, business_id, current_user.user_id, "business_created", "business", business_id, f"Created business: {data.name}")
        
        # Send welcome email
        await send_welcome_email(data.email, data.owner_name, temp_password)
        
        return {
            "id": business_id,
            "message": "Business created successfully",
            "owner_credentials": {
                "email": data.email,
                "temporary_password": temp_password
            }
        }

@api_router.get("/super-admin/businesses/{business_id}")
async def get_business_detail(business_id: str, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        now = utc_now()
        expires_at = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else None
        days_remaining = (expires_at - now).days if expires_at else 0
        
        # Get users (include visible_password for admin view, exclude password_hash)
        users = [
            {k: v for k, v in u.items() if k != "password_hash"}
            for u in store.users.values() if u.get("business_id") == business_id
        ]
        
        # Get manual payments
        manual_payments = [p for p in store.manual_payments.values() if p.get("business_id") == business_id]
        manual_payments.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Get subscription history
        sub_history = [h for h in store.subscription_history.values() if h.get("business_id") == business_id]
        sub_history.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Get activity logs
        activity = [a for a in store.activity_logs.values() if a.get("business_id") == business_id]
        activity.sort(key=lambda x: x["created_at"], reverse=True)
        activity = activity[:50]
        
        return {
            "business": {
                **business,
                "days_remaining": days_remaining,
                "mrr": PLAN_PRICES.get(business["plan"], {}).get("monthly", 0) if business["status"] == "active" else 0
            },
            "users": users,
            "manual_payments": manual_payments,
            "subscription_history": sub_history,
            "activity_logs": activity
        }
    else:
        from sqlalchemy import select
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        now = utc_now()
        days_remaining = (business.subscription_expires_at - now).days if business.subscription_expires_at else 0
        
        # Get users
        users_result = await db.execute(select(User).where(User.business_id == business_id))
        users = [serialize_model(u, exclude_fields=["password_hash"]) for u in users_result.scalars()]
        
        # Get manual payments
        payments_result = await db.execute(
            select(ManualPayment).where(ManualPayment.business_id == business_id).order_by(ManualPayment.created_at.desc())
        )
        manual_payments = [serialize_model(p) for p in payments_result.scalars()]
        
        # Get subscription history
        history_result = await db.execute(
            select(SubscriptionHistory).where(SubscriptionHistory.business_id == business_id).order_by(SubscriptionHistory.created_at.desc())
        )
        sub_history = [serialize_model(h) for h in history_result.scalars()]
        
        # Get activity logs
        activity_result = await db.execute(
            select(ActivityLog).where(ActivityLog.business_id == business_id).order_by(ActivityLog.created_at.desc()).limit(50)
        )
        activity_logs = [serialize_model(a) for a in activity_result.scalars()]
        
        business_data = serialize_model(business)
        business_data["days_remaining"] = days_remaining
        business_data["mrr"] = PLAN_PRICES.get(business.plan.value, {}).get("monthly", 0) if business.status == BusinessStatus.active else 0
        
        return {
            "business": business_data,
            "users": users,
            "manual_payments": manual_payments,
            "subscription_history": sub_history,
            "activity_logs": activity_logs
        }

@api_router.put("/super-admin/businesses/{business_id}")
async def update_business(business_id: str, data: BusinessUpdate, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                business[key] = value
        business["updated_at"] = utc_now().isoformat()
        
        return {"message": "Business updated successfully", "business": business}
    else:
        from sqlalchemy import select, update
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = utc_now()
        
        stmt = update(Business).where(Business.id == business_id).values(**update_data)
        await db.execute(stmt)
        await db.commit()
        
        await log_activity(db, business_id, current_user.user_id, "business_updated", "business", business_id, f"Updated business: {business.name}")
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        updated = result.scalar_one()
        
        return {"message": "Business updated successfully", "business": serialize_model(updated)}

@api_router.post("/super-admin/businesses/{business_id}/extend")
async def extend_subscription(business_id: str, data: ExtendSubscription, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    now = utc_now()
    
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Calculate new expiry
        current_expiry = datetime.fromisoformat(business["subscription_expires_at"]) if business.get("subscription_expires_at") else now
        if current_expiry < now:
            current_expiry = now
        
        new_expiry = current_expiry + timedelta(days=data.duration_days)
        previous_expiry = business.get("subscription_expires_at")
        
        # Update business
        business["subscription_expires_at"] = new_expiry.isoformat()
        if business["status"] in ["suspended", "expired"]:
            business["status"] = "active"
        business["updated_at"] = now.isoformat()
        
        # Record manual payment
        payment_id = generate_id()
        store.manual_payments[payment_id] = {
            "id": payment_id,
            "business_id": business_id,
            "amount": data.amount,
            "currency": data.currency,
            "payment_method": data.payment_method,
            "payment_date": data.payment_date,
            "duration_days": data.duration_days,
            "notes": data.notes,
            "reference_number": data.reference_number,
            "extended_by": current_user.user_id,
            "previous_expiry_date": previous_expiry,
            "new_expiry_date": new_expiry.isoformat(),
            "created_at": now.isoformat()
        }
        
        # Subscription history
        hist_id = generate_id()
        store.subscription_history[hist_id] = {
            "id": hist_id,
            "business_id": business_id,
            "action": "extended",
            "old_value": previous_expiry,
            "new_value": new_expiry.isoformat(),
            "performed_by": current_user.user_id,
            "notes": f"Extended by {data.duration_days} days. Payment: {data.currency} {data.amount} via {data.payment_method}",
            "created_at": now.isoformat()
        }
        
        # Activity log
        log_id = generate_id()
        store.activity_logs[log_id] = {
            "id": log_id,
            "business_id": business_id,
            "user_id": current_user.user_id,
            "action": "subscription_extended",
            "entity_type": "business",
            "entity_id": business_id,
            "description": f"Extended subscription by {data.duration_days} days",
            "ip_address": None,
            "created_at": now.isoformat()
        }
        
        days_remaining = (new_expiry - now).days
        
        # Send email
        await send_subscription_extended_email(business["email"], business["owner_name"], format_date(new_expiry))
        
        return {
            "message": f"Access extended until {format_date(new_expiry)}. {days_remaining} days remaining.",
            "new_expiry_date": new_expiry.isoformat(),
            "days_remaining": days_remaining
        }
    else:
        from sqlalchemy import select, update, insert
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Calculate new expiry
        current_expiry = business.subscription_expires_at or now
        if current_expiry < now:
            current_expiry = now
        
        new_expiry = current_expiry + timedelta(days=data.duration_days)
        previous_expiry = business.subscription_expires_at
        
        # Update business
        new_status = business.status
        if business.status in [BusinessStatus.suspended, BusinessStatus.expired]:
            new_status = BusinessStatus.active
        
        stmt = update(Business).where(Business.id == business_id).values(
            subscription_expires_at=new_expiry,
            status=new_status,
            updated_at=now
        )
        await db.execute(stmt)
        
        # Record manual payment
        payment_stmt = insert(ManualPayment).values(
            id=generate_id(),
            business_id=business_id,
            amount=data.amount,
            currency=data.currency,
            payment_method=ManualPaymentMethod(data.payment_method),
            payment_date=parse_date(data.payment_date),
            duration_days=data.duration_days,
            notes=data.notes,
            reference_number=data.reference_number,
            extended_by=current_user.user_id,
            previous_expiry_date=previous_expiry,
            new_expiry_date=new_expiry,
            created_at=now
        )
        await db.execute(payment_stmt)
        
        # Subscription history
        hist_stmt = insert(SubscriptionHistory).values(
            id=generate_id(),
            business_id=business_id,
            action=SubscriptionAction.extended,
            old_value=previous_expiry.isoformat() if previous_expiry else None,
            new_value=new_expiry.isoformat(),
            performed_by=current_user.user_id,
            notes=f"Extended by {data.duration_days} days. Payment: {data.currency} {data.amount} via {data.payment_method}",
            created_at=now
        )
        await db.execute(hist_stmt)
        
        await db.commit()
        await log_activity(db, business_id, current_user.user_id, "subscription_extended", "business", business_id, f"Extended subscription by {data.duration_days} days")
        
        days_remaining = (new_expiry - now).days
        
        # Send email
        await send_subscription_extended_email(business.email, business.owner_name, format_date(new_expiry))
        
        return {
            "message": f"Access extended until {format_date(new_expiry)}. {days_remaining} days remaining.",
            "new_expiry_date": new_expiry.isoformat(),
            "days_remaining": days_remaining
        }

@api_router.post("/super-admin/businesses/{business_id}/suspend")
async def suspend_business(business_id: str, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    now = utc_now()
    
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        old_status = business["status"]
        business["status"] = "suspended"
        business["updated_at"] = now.isoformat()
        
        # Subscription history
        hist_id = generate_id()
        store.subscription_history[hist_id] = {
            "id": hist_id,
            "business_id": business_id,
            "action": "suspended",
            "old_value": old_status,
            "new_value": "suspended",
            "performed_by": current_user.user_id,
            "notes": "Manually suspended by super admin",
            "created_at": now.isoformat()
        }
        
        return {"message": "Business suspended successfully"}
    else:
        from sqlalchemy import select, update, insert
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        old_status = business.status.value if business.status else None
        
        stmt = update(Business).where(Business.id == business_id).values(
            status=BusinessStatus.suspended,
            updated_at=now
        )
        await db.execute(stmt)
        
        hist_stmt = insert(SubscriptionHistory).values(
            id=generate_id(),
            business_id=business_id,
            action=SubscriptionAction.suspended,
            old_value=old_status,
            new_value="suspended",
            performed_by=current_user.user_id,
            notes="Manually suspended by super admin",
            created_at=now
        )
        await db.execute(hist_stmt)
        
        await db.commit()
        
        return {"message": "Business suspended successfully"}

@api_router.post("/super-admin/businesses/{business_id}/change-plan")
async def change_business_plan(business_id: str, data: ChangePlan, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    now = utc_now()
    
    if data.new_plan not in ["starter", "growth", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        old_plan = business["plan"]
        business["plan"] = data.new_plan
        business["updated_at"] = now.isoformat()
        
        action = "plan_upgraded" if ["starter", "growth", "enterprise"].index(data.new_plan) > ["starter", "growth", "enterprise"].index(old_plan) else "plan_downgraded"
        
        hist_id = generate_id()
        store.subscription_history[hist_id] = {
            "id": hist_id,
            "business_id": business_id,
            "action": action,
            "old_value": old_plan,
            "new_value": data.new_plan,
            "performed_by": current_user.user_id,
            "notes": f"Plan changed from {old_plan} to {data.new_plan}",
            "created_at": now.isoformat()
        }
        
        return {"message": f"Plan changed to {data.new_plan}", "new_plan": data.new_plan}
    else:
        from sqlalchemy import select, update, insert
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        old_plan = business.plan.value if business.plan else None
        plans = ["starter", "growth", "enterprise"]
        action = SubscriptionAction.plan_upgraded if plans.index(data.new_plan) > plans.index(old_plan or "starter") else SubscriptionAction.plan_downgraded
        
        stmt = update(Business).where(Business.id == business_id).values(
            plan=PlanType(data.new_plan),
            updated_at=now
        )
        await db.execute(stmt)
        
        hist_stmt = insert(SubscriptionHistory).values(
            id=generate_id(),
            business_id=business_id,
            action=action,
            old_value=old_plan,
            new_value=data.new_plan,
            performed_by=current_user.user_id,
            notes=f"Plan changed from {old_plan} to {data.new_plan}",
            created_at=now
        )
        await db.execute(hist_stmt)
        
        await db.commit()
        
        return {"message": f"Plan changed to {data.new_plan}", "new_plan": data.new_plan}

@api_router.post("/super-admin/businesses/{business_id}/impersonate")
async def impersonate_business(business_id: str, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        business = store.businesses.get(business_id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Find owner user
        owner = next((u for u in store.users.values() if u.get("business_id") == business_id and u.get("role") == "business_owner"), None)
        if not owner:
            raise HTTPException(status_code=404, detail="Business owner not found")
        
        # Create impersonation token
        original_token = create_access_token({
            "user_id": current_user.user_id,
            "business_id": None,
            "role": "super_admin",
            "email": current_user.email
        })
        
        impersonation_token = create_access_token({
            "user_id": owner["id"],
            "business_id": business_id,
            "role": "business_owner",
            "email": owner["email"],
            "impersonating": True,
            "original_admin_token": original_token
        })
        
        # Log activity
        log_id = generate_id()
        store.activity_logs[log_id] = {
            "id": log_id,
            "business_id": business_id,
            "user_id": current_user.user_id,
            "action": "impersonation_started",
            "entity_type": "user",
            "entity_id": owner["id"],
            "description": f"Super admin impersonated business owner",
            "ip_address": None,
            "created_at": utc_now().isoformat()
        }
        
        return {
            "access_token": impersonation_token,
            "original_admin_token": original_token,
            "business": business,
            "impersonating_user": {
                "id": owner["id"],
                "email": owner["email"],
                "first_name": owner["first_name"],
                "last_name": owner["last_name"]
            }
        }
    else:
        from sqlalchemy import select
        
        result = await db.execute(select(Business).where(Business.id == business_id))
        business = result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        owner_result = await db.execute(
            select(User).where(User.business_id == business_id, User.role == UserRole.business_owner)
        )
        owner = owner_result.scalar_one_or_none()
        if not owner:
            raise HTTPException(status_code=404, detail="Business owner not found")
        
        original_token = create_access_token({
            "user_id": current_user.user_id,
            "business_id": None,
            "role": "super_admin",
            "email": current_user.email
        })
        
        impersonation_token = create_access_token({
            "user_id": owner.id,
            "business_id": business_id,
            "role": "business_owner",
            "email": owner.email,
            "impersonating": True,
            "original_admin_token": original_token
        })
        
        await log_activity(db, business_id, current_user.user_id, "impersonation_started", "user", owner.id, "Super admin impersonated business owner")
        
        return {
            "access_token": impersonation_token,
            "original_admin_token": original_token,
            "business": serialize_model(business),
            "impersonating_user": {
                "id": owner.id,
                "email": owner.email,
                "first_name": owner.first_name,
                "last_name": owner.last_name
            }
        }

@api_router.post("/super-admin/end-impersonation")
async def end_impersonation(current_user: TokenData = Depends(get_current_user)):
    if not current_user.impersonating or not current_user.original_admin_token:
        raise HTTPException(status_code=400, detail="Not currently impersonating")
    
    return {"access_token": current_user.original_admin_token}

# --- Password Reset Endpoints ---
class ResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str

@api_router.post("/super-admin/reset-password")
async def super_admin_reset_password(data: ResetPasswordRequest, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        user = store.users.get(data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user["password_hash"] = get_password_hash(data.new_password)
        user["visible_password"] = data.new_password
        user["updated_at"] = utc_now().isoformat()
        return {"message": "Password reset successfully", "visible_password": data.new_password}
    else:
        from sqlalchemy import select, update as sql_update
        result = await db.execute(select(User).where(User.id == data.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        stmt = sql_update(User).where(User.id == data.user_id).values(password_hash=get_password_hash(data.new_password), updated_at=utc_now())
        await db.execute(stmt)
        await db.commit()
        return {"message": "Password reset successfully"}

@api_router.post("/dashboard/reset-password")
async def business_owner_reset_password(data: ResetPasswordRequest, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    if use_memory_store():
        user = store.users.get(data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.get("business_id") != current_user.business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        user["password_hash"] = get_password_hash(data.new_password)
        user["visible_password"] = data.new_password
        user["updated_at"] = utc_now().isoformat()
        return {"message": "Password reset successfully", "visible_password": data.new_password}
    else:
        from sqlalchemy import select, update as sql_update
        result = await db.execute(select(User).where(User.id == data.user_id, User.business_id == current_user.business_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        stmt = sql_update(User).where(User.id == data.user_id).values(password_hash=get_password_hash(data.new_password), updated_at=utc_now())
        await db.execute(stmt)
        await db.commit()
        return {"message": "Password reset successfully"}

@api_router.get("/super-admin/settings")
async def get_platform_settings(current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        return {"settings": store.platform_settings}
    else:
        from sqlalchemy import select
        result = await db.execute(select(PlatformSettings))
        settings = {s.setting_key: s.setting_value for s in result.scalars()}
        return {"settings": settings}

@api_router.put("/super-admin/settings")
async def update_platform_settings(data: PlatformSettingUpdate, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    if use_memory_store():
        store.platform_settings[data.setting_key] = data.setting_value
        return {"message": "Setting updated", "key": data.setting_key, "value": data.setting_value}
    else:
        from sqlalchemy import select, update, insert
        
        result = await db.execute(select(PlatformSettings).where(PlatformSettings.setting_key == data.setting_key))
        existing = result.scalar_one_or_none()
        
        if existing:
            stmt = update(PlatformSettings).where(PlatformSettings.setting_key == data.setting_key).values(
                setting_value=data.setting_value,
                updated_at=utc_now()
            )
        else:
            stmt = insert(PlatformSettings).values(
                id=generate_id(),
                setting_key=data.setting_key,
                setting_value=data.setting_value,
                updated_at=utc_now()
            )
        
        await db.execute(stmt)
        await db.commit()
        
        return {"message": "Setting updated", "key": data.setting_key, "value": data.setting_value}

@api_router.post("/super-admin/announcements")
async def send_announcement(data: AnnouncementCreate, current_user: TokenData = Depends(require_super_admin), db=Depends(get_db)):
    now = utc_now()
    
    if use_memory_store():
        # Get target businesses
        if data.target == "all":
            target_businesses = list(store.businesses.values())
        else:
            target_businesses = [b for b in store.businesses.values() if b["plan"] == data.target]
        
        # Create notifications for all business owners
        for business in target_businesses:
            owners = [u for u in store.users.values() if u.get("business_id") == business["id"] and u.get("role") == "business_owner"]
            for owner in owners:
                notif_id = generate_id()
                store.notifications[notif_id] = {
                    "id": notif_id,
                    "business_id": business["id"],
                    "user_id": owner["id"],
                    "type": "announcement",
                    "title": data.title,
                    "message": data.message,
                    "is_read": False,
                    "action_url": None,
                    "created_at": now.isoformat()
                }
        
        return {"message": f"Announcement sent to {len(target_businesses)} businesses"}
    else:
        from sqlalchemy import select, insert
        
        query = select(Business)
        if data.target != "all":
            query = query.where(Business.plan == PlanType(data.target))
        
        result = await db.execute(query)
        businesses = result.scalars().all()
        
        for business in businesses:
            users_result = await db.execute(
                select(User).where(User.business_id == business.id, User.role == UserRole.business_owner)
            )
            for user in users_result.scalars():
                stmt = insert(Notification).values(
                    id=generate_id(),
                    business_id=business.id,
                    user_id=user.id,
                    type="announcement",
                    title=data.title,
                    message=data.message,
                    is_read=False,
                    created_at=now
                )
                await db.execute(stmt)
        
        await db.commit()
        
        return {"message": f"Announcement sent to {len(businesses)} businesses"}

# ============== INCLUDE ROUTERS ==============
from routes.dashboard import router as dashboard_router
from routes.hr import router as hr_router
from routes.finance import router as finance_router
from routes.staff import router as staff_router
from routes.common import router as common_router

api_router.include_router(dashboard_router)
api_router.include_router(hr_router)
api_router.include_router(finance_router)
api_router.include_router(staff_router)

app.include_router(api_router)
app.include_router(common_router)

@app.get("/")
async def root():
    return {"message": "NexusERP API", "version": "1.0.0"}
