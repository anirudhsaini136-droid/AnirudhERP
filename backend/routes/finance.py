from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
import uuid

from auth import get_current_user, require_business_access, TokenData
from database import get_db
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/finance", tags=["Finance Admin"])

def generate_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def parse_date(d):
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d, "%Y-%m-%d").date()
    return None

def format_date(d):
    if isinstance(d, str):
        return d
    if isinstance(d, (datetime, date)):
        return d.strftime("%B %d, %Y")
    return str(d)

# Schemas
class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float

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
    items: List[InvoiceItemCreate]

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
    status: str
    rejection_reason: Optional[str] = None

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

def get_store():
    from server import store, use_memory_store
    return store, use_memory_store()

def require_finance_access():
    async def checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in ["finance_admin", "business_owner", "super_admin"]:
            raise HTTPException(status_code=403, detail="Finance access required")
        return current_user
    return checker

@router.get("")
async def finance_dashboard(current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    now = utc_now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    if use_memory:
        # Revenue this month
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
        
        # Expenses this month
        expenses_this_month = [e for e in store.expenses.values() 
            if e.get("business_id") == business_id 
            and e.get("status") == "approved"
            and datetime.fromisoformat(e["created_at"]) >= month_start]
        total_expenses = sum([float(e.get("amount", 0)) for e in expenses_this_month])
        
        # Net profit
        net_profit = revenue_this_month - total_expenses
        
        # Outstanding invoices
        outstanding = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") in ["sent", "partially_paid"]]
        outstanding_amount = sum([float(i.get("balance_due", 0)) for i in outstanding])
        
        # Overdue invoices
        today = now.date()
        overdue = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") in ["sent", "partially_paid"]
            and parse_date(i.get("due_date")) < today]
        overdue_amount = sum([float(i.get("balance_due", 0)) for i in overdue])
        
        # Recent invoices
        recent_invoices = sorted(
            [i for i in store.invoices.values() if i.get("business_id") == business_id],
            key=lambda x: x.get("created_at", ""), reverse=True
        )[:10]
        
        # Expense breakdown by category
        expense_by_category = {}
        for e in expenses_this_month:
            cat = e.get("category") or "Uncategorized"
            expense_by_category[cat] = expense_by_category.get(cat, 0) + float(e.get("amount", 0))
        
        # Revenue trend (last 6 months)
        revenue_trend = []
        for i in range(5, -1, -1):
            m = (now.month - i - 1) % 12 + 1
            y = now.year - ((now.month - i - 1) // 12 + (1 if now.month - i <= 0 else 0))
            month_name = datetime(y, m, 1).strftime("%b")
            
            month_revenue = sum([float(inv.get("total_amount", 0)) for inv in store.invoices.values()
                if inv.get("business_id") == business_id
                and inv.get("status") == "paid"
                and datetime.fromisoformat(inv["created_at"]).month == m
                and datetime.fromisoformat(inv["created_at"]).year == y])
            
            revenue_trend.append({"month": month_name, "revenue": month_revenue})
        
        return {
            "stats": {
                "revenue_this_month": revenue_this_month,
                "revenue_last_month": revenue_last_month,
                "revenue_change": round(((revenue_this_month - revenue_last_month) / revenue_last_month * 100) if revenue_last_month > 0 else 0, 1),
                "expenses_this_month": total_expenses,
                "net_profit": net_profit,
                "outstanding_amount": outstanding_amount,
                "overdue_count": len(overdue),
                "overdue_amount": overdue_amount
            },
            "recent_invoices": recent_invoices,
            "expense_by_category": [{"category": k, "amount": v} for k, v in expense_by_category.items()],
            "revenue_trend": revenue_trend
        }
    else:
        return {"message": "Database mode"}

@router.get("/invoices")
async def list_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_finance_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        invoices = [i for i in store.invoices.values() if i.get("business_id") == business_id]
        
        if search:
            search_lower = search.lower()
            invoices = [i for i in invoices if 
                search_lower in i.get("invoice_number", "").lower() or
                search_lower in i.get("client_name", "").lower()]
        
        if status and status != "all":
            invoices = [i for i in invoices if i.get("status") == status]
        
        invoices.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        total = len(invoices)
        start = (page - 1) * limit
        invoices = invoices[start:start + limit]
        
        return {
            "invoices": invoices,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    else:
        return {"message": "Database mode"}

@router.post("/invoices")
async def create_invoice(data: InvoiceCreate, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        from email_service import send_invoice_email
        
        invoice_id = generate_id()
        now = utc_now()
        
        # Generate invoice number
        invoice_count = len([i for i in store.invoices.values() if i.get("business_id") == business_id])
        timestamp = now.strftime("%Y%m")
        invoice_number = f"INV-{timestamp}-{str(invoice_count + 1).zfill(4)}"
        
        # Calculate totals
        subtotal = sum([item.quantity * item.unit_price for item in data.items])
        tax_amount = round(subtotal * data.tax_rate / 100, 2) if data.tax_rate > 0 else 0
        total_amount = subtotal + tax_amount - data.discount_amount
        
        store.invoices[invoice_id] = {
            "id": invoice_id,
            "business_id": business_id,
            "invoice_number": invoice_number,
            "client_name": data.client_name,
            "client_email": data.client_email,
            "client_address": data.client_address,
            "client_phone": data.client_phone,
            "issue_date": data.issue_date,
            "due_date": data.due_date,
            "subtotal": subtotal,
            "tax_rate": data.tax_rate,
            "tax_amount": tax_amount,
            "discount_amount": data.discount_amount,
            "total_amount": total_amount,
            "amount_paid": 0,
            "balance_due": total_amount,
            "status": "draft",
            "notes": data.notes,
            "payment_terms": data.payment_terms,
            "currency": data.currency,
            "created_by": current_user.user_id,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Create invoice items
        for item in data.items:
            item_id = generate_id()
            store.invoice_items[item_id] = {
                "id": item_id,
                "invoice_id": invoice_id,
                "business_id": business_id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.quantity * item.unit_price,
                "created_at": now.isoformat()
            }
        
        return {
            "id": invoice_id,
            "invoice_number": invoice_number,
            "message": "Invoice created",
            "invoice": store.invoices[invoice_id]
        }
    else:
        return {"message": "Database mode"}

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        invoice = store.invoices.get(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        items = [i for i in store.invoice_items.values() if i.get("invoice_id") == invoice_id]
        payments = sorted(
            [p for p in store.invoice_payments.values() if p.get("invoice_id") == invoice_id],
            key=lambda x: x.get("created_at", ""), reverse=True
        )
        
        return {
            "invoice": invoice,
            "items": items,
            "payments": payments
        }
    else:
        return {"message": "Database mode"}

@router.post("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        from email_service import send_invoice_email
        
        invoice = store.invoices.get(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        invoice["status"] = "sent"
        invoice["updated_at"] = utc_now().isoformat()
        
        # Send email if client email exists
        if invoice.get("client_email"):
            await send_invoice_email(
                invoice["client_email"],
                invoice["client_name"],
                invoice["invoice_number"],
                f"{invoice['currency']} {invoice['total_amount']:.2f}",
                format_date(invoice["due_date"])
            )
        
        return {"message": "Invoice sent", "invoice": invoice}
    else:
        return {"message": "Database mode"}

@router.post("/invoices/{invoice_id}/payments")
async def record_invoice_payment(invoice_id: str, data: InvoicePaymentCreate, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        invoice = store.invoices.get(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be positive")
        
        if data.amount > float(invoice.get("balance_due", 0)):
            raise HTTPException(status_code=400, detail="Payment amount exceeds balance due")
        
        now = utc_now()
        payment_id = generate_id()
        
        store.invoice_payments[payment_id] = {
            "id": payment_id,
            "invoice_id": invoice_id,
            "business_id": business_id,
            "amount": data.amount,
            "payment_date": data.payment_date,
            "payment_method": data.payment_method,
            "reference": data.reference,
            "notes": data.notes,
            "recorded_by": current_user.user_id,
            "created_at": now.isoformat()
        }
        
        # Update invoice
        new_amount_paid = float(invoice.get("amount_paid", 0)) + data.amount
        new_balance = float(invoice.get("total_amount", 0)) - new_amount_paid
        
        invoice["amount_paid"] = new_amount_paid
        invoice["balance_due"] = new_balance
        invoice["updated_at"] = now.isoformat()
        
        # Update status
        if new_balance <= 0:
            invoice["status"] = "paid"
        elif new_amount_paid > 0:
            invoice["status"] = "partially_paid"
        
        return {
            "message": "Payment recorded",
            "payment": store.invoice_payments[payment_id],
            "invoice": invoice
        }
    else:
        return {"message": "Database mode"}

@router.get("/expenses")
async def list_expenses(
    category: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_finance_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        expenses = [e for e in store.expenses.values() if e.get("business_id") == business_id]
        
        if category and category != "all":
            expenses = [e for e in expenses if e.get("category") == category]
        
        if status and status != "all":
            expenses = [e for e in expenses if e.get("status") == status]
        
        expenses.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        total = len(expenses)
        start = (page - 1) * limit
        expenses = expenses[start:start + limit]
        
        # Get categories
        categories = list(set([e.get("category") for e in store.expenses.values() 
            if e.get("business_id") == business_id and e.get("category")]))
        
        return {
            "expenses": expenses,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "categories": categories
        }
    else:
        return {"message": "Database mode"}

@router.post("/expenses")
async def create_expense(data: ExpenseCreate, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        expense_id = generate_id()
        now = utc_now()
        
        store.expenses[expense_id] = {
            "id": expense_id,
            "business_id": business_id,
            "category": data.category,
            "description": data.description,
            "amount": data.amount,
            "currency": data.currency,
            "date": data.date,
            "receipt_url": data.receipt_url,
            "submitted_by": current_user.user_id,
            "approved_by": None,
            "status": "pending",
            "rejection_reason": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        return {
            "id": expense_id,
            "message": "Expense created",
            "expense": store.expenses[expense_id]
        }
    else:
        return {"message": "Database mode"}

@router.put("/expenses/{expense_id}/review")
async def review_expense(expense_id: str, data: ExpenseReview, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    if use_memory:
        expense = store.expenses.get(expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if expense.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Expense already reviewed")
        
        now = utc_now()
        expense["status"] = data.status
        expense["approved_by"] = current_user.user_id
        expense["updated_at"] = now.isoformat()
        
        if data.status == "rejected":
            expense["rejection_reason"] = data.rejection_reason
        
        return {"message": f"Expense {data.status}", "expense": expense}
    else:
        return {"message": "Database mode"}

@router.get("/expense-categories")
async def list_expense_categories(current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        categories = [c for c in store.expense_categories.values() if c.get("business_id") == business_id]
        
        # Add default categories if empty
        if not categories:
            default_cats = ["Travel", "Office Supplies", "Software", "Marketing", "Utilities", "Professional Services", "Equipment", "Meals & Entertainment"]
            for cat_name in default_cats:
                cat_id = generate_id()
                store.expense_categories[cat_id] = {
                    "id": cat_id,
                    "business_id": business_id,
                    "name": cat_name,
                    "description": None,
                    "created_at": utc_now().isoformat()
                }
            categories = [c for c in store.expense_categories.values() if c.get("business_id") == business_id]
        
        return {"categories": categories}
    else:
        return {"message": "Database mode"}

@router.post("/expense-categories")
async def create_expense_category(data: ExpenseCategoryCreate, current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        cat_id = generate_id()
        now = utc_now()
        
        store.expense_categories[cat_id] = {
            "id": cat_id,
            "business_id": business_id,
            "name": data.name,
            "description": data.description,
            "created_at": now.isoformat()
        }
        
        return {"id": cat_id, "message": "Category created", "category": store.expense_categories[cat_id]}
    else:
        return {"message": "Database mode"}

@router.get("/reports/profit-loss")
async def profit_loss_report(
    start_date: str,
    end_date: str,
    current_user: TokenData = Depends(require_finance_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        start = parse_date(start_date)
        end = parse_date(end_date)
        
        # Revenue
        invoices = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") == "paid"
            and start <= parse_date(i.get("issue_date")) <= end]
        total_revenue = sum([float(i.get("total_amount", 0)) for i in invoices])
        
        # Expenses
        expenses = [e for e in store.expenses.values() 
            if e.get("business_id") == business_id 
            and e.get("status") == "approved"
            and start <= parse_date(e.get("date")) <= end]
        total_expenses = sum([float(e.get("amount", 0)) for e in expenses])
        
        # Breakdown by category
        expense_breakdown = {}
        for e in expenses:
            cat = e.get("category") or "Uncategorized"
            expense_breakdown[cat] = expense_breakdown.get(cat, 0) + float(e.get("amount", 0))
        
        return {
            "period": {"start": start_date, "end": end_date},
            "revenue": total_revenue,
            "expenses": total_expenses,
            "net_profit": total_revenue - total_expenses,
            "profit_margin": round((total_revenue - total_expenses) / total_revenue * 100, 1) if total_revenue > 0 else 0,
            "expense_breakdown": [{"category": k, "amount": v} for k, v in expense_breakdown.items()]
        }
    else:
        return {"message": "Database mode"}

@router.get("/reports/invoice-aging")
async def invoice_aging_report(current_user: TokenData = Depends(require_finance_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        today = utc_now().date()
        
        # Get unpaid invoices
        unpaid = [i for i in store.invoices.values() 
            if i.get("business_id") == business_id 
            and i.get("status") in ["sent", "partially_paid", "overdue"]
            and float(i.get("balance_due", 0)) > 0]
        
        # Categorize by age
        current = []      # Not yet due
        days_1_30 = []    # 1-30 days overdue
        days_31_60 = []   # 31-60 days overdue
        days_61_90 = []   # 61-90 days overdue
        over_90 = []      # Over 90 days overdue
        
        for inv in unpaid:
            due_date = parse_date(inv.get("due_date"))
            if due_date >= today:
                current.append(inv)
            else:
                days_overdue = (today - due_date).days
                if days_overdue <= 30:
                    days_1_30.append(inv)
                elif days_overdue <= 60:
                    days_31_60.append(inv)
                elif days_overdue <= 90:
                    days_61_90.append(inv)
                else:
                    over_90.append(inv)
        
        return {
            "aging": {
                "current": {
                    "count": len(current),
                    "amount": sum([float(i.get("balance_due", 0)) for i in current])
                },
                "1_30_days": {
                    "count": len(days_1_30),
                    "amount": sum([float(i.get("balance_due", 0)) for i in days_1_30])
                },
                "31_60_days": {
                    "count": len(days_31_60),
                    "amount": sum([float(i.get("balance_due", 0)) for i in days_31_60])
                },
                "61_90_days": {
                    "count": len(days_61_90),
                    "amount": sum([float(i.get("balance_due", 0)) for i in days_61_90])
                },
                "over_90_days": {
                    "count": len(over_90),
                    "amount": sum([float(i.get("balance_due", 0)) for i in over_90])
                }
            },
            "total_outstanding": sum([float(i.get("balance_due", 0)) for i in unpaid]),
            "invoices": unpaid
        }
    else:
        return {"message": "Database mode"}
