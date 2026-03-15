from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from auth import require_business_access, TokenData
from database import get_db
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update, insert, func, or_

router = APIRouter(prefix="/dashboard", tags=["Business Owner"])

def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def generate_temp_password():
    import secrets, string
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

def serialize(obj, exclude=None):
    if obj is None:
        return None
    exclude = exclude or []
    result = {}
    for key in obj.__table__.columns.keys():
        if key in exclude:
            continue
        val = getattr(obj, key)
        if isinstance(val, datetime):
            result[key] = val.isoformat()
        elif hasattr(val, 'value'):
            result[key] = val.value
        else:
            result[key] = val
    return result

class AdminUserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str

class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None

PLAN_LIMITS = {
    "starter": 5,
    "growth": 25,
    "enterprise": 99999
}

@router.get("")
async def business_dashboard(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import Business, Employee, Invoice, Expense, Product, ActivityLog, EmployeeStatus, InvoiceStatus, ExpenseStatus
    business_id = current_user.business_id
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")

    now = utc_now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Business info
    biz = await db.execute(select(Business).where(Business.id == business_id))
    business = biz.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Employees
    emp_result = await db.execute(select(func.count()).where(Employee.business_id == business_id, Employee.status == EmployeeStatus.active))
    total_employees = emp_result.scalar() or 0

    new_emp_result = await db.execute(select(func.count()).where(Employee.business_id == business_id, Employee.created_at >= month_start))
    new_employees = new_emp_result.scalar() or 0

    # Revenue this month
    rev_result = await db.execute(select(func.sum(Invoice.total_amount)).where(
        Invoice.business_id == business_id,
        Invoice.status == InvoiceStatus.paid,
        Invoice.created_at >= month_start
    ))
    revenue_this_month = float(rev_result.scalar() or 0)

    # Revenue last month
    rev_last_result = await db.execute(select(func.sum(Invoice.total_amount)).where(
        Invoice.business_id == business_id,
        Invoice.status == InvoiceStatus.paid,
        Invoice.created_at >= last_month_start,
        Invoice.created_at < month_start
    ))
    revenue_last_month = float(rev_last_result.scalar() or 0)
    revenue_change = ((revenue_this_month - revenue_last_month) / revenue_last_month * 100) if revenue_last_month > 0 else 0

    # Outstanding invoices
    outstanding_result = await db.execute(select(func.sum(Invoice.balance_due)).where(
        Invoice.business_id == business_id,
        Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.partially_paid, InvoiceStatus.overdue])
    ))
    outstanding_amount = float(outstanding_result.scalar() or 0)

    overdue_result = await db.execute(select(func.count()).where(
        Invoice.business_id == business_id,
        Invoice.status == InvoiceStatus.overdue
    ))
    overdue_count = overdue_result.scalar() or 0

    # Low stock
    low_stock_result = await db.execute(select(func.count()).where(
        Product.business_id == business_id,
        Product.current_stock < Product.minimum_stock
    ))
    low_stock_count = low_stock_result.scalar() or 0

    # Expenses
    exp_result = await db.execute(select(func.sum(Expense.amount)).where(
        Expense.business_id == business_id,
        Expense.status == ExpenseStatus.approved,
        Expense.created_at >= month_start
    ))
    total_expenses = float(exp_result.scalar() or 0)

    # Recent activity
    activity_result = await db.execute(
        select(ActivityLog).where(ActivityLog.business_id == business_id)
        .order_by(ActivityLog.created_at.desc()).limit(10)
    )
    recent_activity = [serialize(a) for a in activity_result.scalars()]

    # Chart data (last 8 months)
    chart_data = []
    for i in range(7, -1, -1):
        m = (now.month - i - 1) % 12 + 1
        y = now.year - ((now.month - i - 1) // 12 + (1 if now.month - i <= 0 else 0))
        month_name = datetime(y, m, 1).strftime("%b")
        m_start = datetime(y, m, 1, tzinfo=timezone.utc)
        m_end = datetime(y, m + 1 if m < 12 else 1, 1, tzinfo=timezone.utc)

        m_rev = await db.execute(select(func.sum(Invoice.total_amount)).where(
            Invoice.business_id == business_id,
            Invoice.status == InvoiceStatus.paid,
            Invoice.created_at >= m_start,
            Invoice.created_at < m_end
        ))
        m_exp = await db.execute(select(func.sum(Expense.amount)).where(
            Expense.business_id == business_id,
            Expense.status == ExpenseStatus.approved,
            Expense.created_at >= m_start,
            Expense.created_at < m_end
        ))
        chart_data.append({
            "month": month_name,
            "revenue": float(m_rev.scalar() or 0),
            "expenses": float(m_exp.scalar() or 0)
        })

    return {
        "stats": {
            "monthly_revenue": revenue_this_month,
            "revenue_change": round(revenue_change, 1),
            "total_employees": total_employees,
            "new_employees": new_employees,
            "outstanding_invoices": outstanding_amount,
            "overdue_count": overdue_count,
            "low_stock_count": low_stock_count,
            "total_expenses": total_expenses,
            "net_profit": revenue_this_month - total_expenses
        },
        "alerts": {
            "payroll_due": False,
            "overdue_invoices": overdue_count > 0,
            "low_stock": low_stock_count > 0
        },
        "chart_data": chart_data,
        "recent_activity": recent_activity,
        "business": serialize(business)
    }

@router.get("/settings")
async def get_business_settings(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import Business, ManualPayment
    business_id = current_user.business_id
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")

    biz = await db.execute(select(Business).where(Business.id == business_id))
    business = biz.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    now = utc_now()
    days_remaining = (business.subscription_expires_at - now).days if business.subscription_expires_at else 0

    payments_result = await db.execute(
        select(ManualPayment).where(ManualPayment.business_id == business_id)
        .order_by(ManualPayment.created_at.desc())
    )
    payment_history = [serialize(p) for p in payments_result.scalars()]

    return {
        "business": serialize(business),
        "subscription": {
            "plan": business.plan.value if business.plan else None,
            "status": business.status.value if business.status else None,
            "expires_at": business.subscription_expires_at.isoformat() if business.subscription_expires_at else None,
            "days_remaining": days_remaining
        },
        "payment_history": payment_history
    }

@router.put("/settings")
async def update_business_settings(data: BusinessProfileUpdate, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import Business
    business_id = current_user.business_id
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = utc_now()

    await db.execute(update(Business).where(Business.id == business_id).values(**update_data))
    await db.commit()

    biz = await db.execute(select(Business).where(Business.id == business_id))
    business = biz.scalar_one_or_none()

    return {"message": "Settings updated", "business": serialize(business)}

@router.get("/users")
async def list_admin_users(current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import User, Business, UserRole
    business_id = current_user.business_id

    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can manage users")

    users_result = await db.execute(
        select(User).where(User.business_id == business_id)
    )
    users = [serialize(u, exclude=["password_hash"]) for u in users_result.scalars()]

    biz = await db.execute(select(Business).where(Business.id == business_id))
    business = biz.scalar_one_or_none()
    plan = business.plan.value if business and business.plan else "starter"
    user_limit = PLAN_LIMITS.get(plan, 5)

    return {
        "users": users,
        "total": len(users),
        "limit": user_limit,
        "can_add_more": len(users) < user_limit
    }

@router.post("/users")
async def create_admin_user(data: AdminUserCreate, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import User, Business, UserRole
    from auth import get_password_hash
    from email_service import send_welcome_email

    business_id = current_user.business_id

    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owners can create users")

    if data.role not in ["hr_admin", "finance_admin", "inventory_admin", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    biz = await db.execute(select(Business).where(Business.id == business_id))
    business = biz.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    plan = business.plan.value if business.plan else "starter"
    user_limit = PLAN_LIMITS.get(plan, 5)

    count_result = await db.execute(select(func.count()).where(User.business_id == business_id))
    current_count = count_result.scalar() or 0

    if current_count >= user_limit:
        raise HTTPException(status_code=400, detail=f"User limit reached ({user_limit}) for your plan. Please upgrade.")

    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user_id = generate_id()
    temp_password = generate_temp_password()
    now = utc_now()

    await db.execute(insert(User).values(
        id=user_id,
        business_id=business_id,
        email=data.email.lower(),
        password_hash=get_password_hash(temp_password),
        role=UserRole(data.role),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        is_active=True,
        created_at=now,
        updated_at=now
    ))
    await db.commit()

    await send_welcome_email(data.email, f"{data.first_name} {data.last_name}", temp_password)

    return {
        "id": user_id,
        "message": "User created successfully",
        "credentials": {
            "email": data.email,
            "temporary_password": temp_password
        }
    }

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import User
    business_id = current_user.business_id

    result = await db.execute(select(User).where(User.id == user_id, User.business_id == business_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role.value == "business_owner":
        raise HTTPException(status_code=400, detail="Cannot deactivate business owner")

    await db.execute(update(User).where(User.id == user_id).values(is_active=False, updated_at=utc_now()))
    await db.commit()
    return {"message": "User deactivated"}

@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    from models import User
    business_id = current_user.business_id

    result = await db.execute(select(User).where(User.id == user_id, User.business_id == business_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(update(User).where(User.id == user_id).values(is_active=True, updated_at=utc_now()))
    await db.commit()
    return {"message": "User activated"}
