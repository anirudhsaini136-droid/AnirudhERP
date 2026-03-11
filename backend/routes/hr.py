from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
import uuid

from auth import get_current_user, require_roles, require_business_access, TokenData
from database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/hr", tags=["HR Admin"])

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
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    status: Optional[str] = None
    profile_photo_url: Optional[str] = None

class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    status: str = "present"
    clock_in_time: Optional[str] = None
    clock_out_time: Optional[str] = None
    notes: Optional[str] = None

class LeaveReview(BaseModel):
    status: str
    notes: Optional[str] = None

class PayrollItemUpdate(BaseModel):
    bonus: float = 0
    overtime_pay: float = 0
    allowances: float = 0
    tax_deduction: float = 0
    other_deductions: float = 0

def get_store():
    from server import store, use_memory_store
    return store, use_memory_store()

def require_hr_access():
    async def checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in ["hr_admin", "business_owner", "super_admin"]:
            raise HTTPException(status_code=403, detail="HR access required")
        return current_user
    return checker

@router.get("")
async def hr_dashboard(current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    now = utc_now()
    today = now.date()
    
    if use_memory:
        # Employee stats
        employees = [e for e in store.employees.values() if e.get("business_id") == business_id]
        active_employees = [e for e in employees if e.get("status") == "active"]
        
        # Today's attendance
        today_attendance = [a for a in store.attendance.values() 
            if a.get("business_id") == business_id 
            and a.get("date") == today.isoformat()]
        
        present_today = len([a for a in today_attendance if a.get("status") in ["present", "late"]])
        on_leave_today = len([a for a in today_attendance if a.get("status") == "on_leave"])
        absent_today = len(active_employees) - present_today - on_leave_today
        
        # Pending leave requests
        pending_leaves = [l for l in store.leave_requests.values() 
            if l.get("business_id") == business_id 
            and l.get("status") == "pending"]
        
        # Current month payroll
        current_payroll = next((p for p in store.payroll_runs.values() 
            if p.get("business_id") == business_id 
            and p.get("month") == now.month 
            and p.get("year") == now.year), None)
        
        # Attendance rate this month
        month_start = today.replace(day=1)
        work_days = sum(1 for d in range((today - month_start).days + 1) 
            if (month_start + timedelta(days=d)).weekday() < 5)
        
        month_attendance = [a for a in store.attendance.values() 
            if a.get("business_id") == business_id 
            and a.get("date") >= month_start.isoformat()
            and a.get("status") in ["present", "late"]]
        
        attendance_rate = (len(month_attendance) / (work_days * len(active_employees)) * 100) if work_days > 0 and active_employees else 0
        
        # Department breakdown
        dept_counts = {}
        for e in active_employees:
            dept = e.get("department") or "Unassigned"
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
        
        return {
            "stats": {
                "total_employees": len(active_employees),
                "present_today": present_today,
                "on_leave_today": on_leave_today,
                "absent_today": max(0, absent_today),
                "pending_leave_requests": len(pending_leaves),
                "attendance_rate": round(attendance_rate, 1),
                "payroll_status": current_payroll["status"] if current_payroll else "not_started"
            },
            "departments": [{"name": k, "count": v} for k, v in dept_counts.items()],
            "recent_leaves": sorted(pending_leaves, key=lambda x: x["created_at"], reverse=True)[:5]
        }
    else:
        return {"message": "Database mode"}

@router.get("/employees")
async def list_employees(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    employment_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_hr_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employees = [e for e in store.employees.values() if e.get("business_id") == business_id]
        
        if search:
            search_lower = search.lower()
            employees = [e for e in employees if 
                search_lower in e.get("first_name", "").lower() or
                search_lower in e.get("last_name", "").lower() or
                search_lower in e.get("email", "").lower() or
                search_lower in e.get("employee_code", "").lower()]
        
        if department and department != "all":
            employees = [e for e in employees if e.get("department") == department]
        
        if status and status != "all":
            employees = [e for e in employees if e.get("status") == status]
        
        if employment_type and employment_type != "all":
            employees = [e for e in employees if e.get("employment_type") == employment_type]
        
        employees.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        total = len(employees)
        start = (page - 1) * limit
        employees = employees[start:start + limit]
        
        # Get unique departments for filter
        all_employees = [e for e in store.employees.values() if e.get("business_id") == business_id]
        departments = list(set([e.get("department") for e in all_employees if e.get("department")]))
        
        return {
            "employees": employees,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "departments": departments
        }
    else:
        return {"message": "Database mode"}

@router.post("/employees")
async def create_employee(data: EmployeeCreate, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        from server import get_password_hash, generate_temp_password, PLAN_LIMITS
        from email_service import send_welcome_email
        
        employee_id = generate_id()
        now = utc_now()
        
        # Generate employee code
        emp_count = len([e for e in store.employees.values() if e.get("business_id") == business_id])
        employee_code = f"EMP-{business_id[:4].upper()}-{str(emp_count + 1).zfill(4)}"
        
        store.employees[employee_id] = {
            "id": employee_id,
            "business_id": business_id,
            "user_id": None,
            "employee_code": employee_code,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email,
            "phone": data.phone,
            "department": data.department,
            "job_title": data.job_title,
            "employment_type": data.employment_type,
            "start_date": data.start_date,
            "base_salary": data.base_salary,
            "salary_currency": data.salary_currency,
            "bank_account_number": data.bank_account_number,
            "bank_name": data.bank_name,
            "national_id": data.national_id,
            "date_of_birth": data.date_of_birth,
            "gender": data.gender,
            "address": data.address,
            "emergency_contact_name": data.emergency_contact_name,
            "emergency_contact_phone": data.emergency_contact_phone,
            "profile_photo_url": None,
            "status": "active",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Create leave balance
        balance_id = generate_id()
        store.leave_balances[balance_id] = {
            "id": balance_id,
            "business_id": business_id,
            "employee_id": employee_id,
            "year": now.year,
            "annual_total": 21,
            "annual_used": 0,
            "sick_total": 10,
            "sick_used": 0,
            "updated_at": now.isoformat()
        }
        
        # Create user account if requested
        user_credentials = None
        if data.create_user_account and data.email:
            business = store.businesses.get(business_id)
            user_limit = PLAN_LIMITS.get(business["plan"], {}).get("users", 5)
            current_users = len([u for u in store.users.values() if u.get("business_id") == business_id])
            
            if current_users < user_limit:
                user_id = generate_id()
                temp_password = generate_temp_password()
                
                store.users[user_id] = {
                    "id": user_id,
                    "business_id": business_id,
                    "email": data.email.lower(),
                    "password_hash": get_password_hash(temp_password),
                    "role": "staff",
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                    "phone": data.phone,
                    "avatar_url": None,
                    "is_active": True,
                    "last_login": None,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
                
                store.employees[employee_id]["user_id"] = user_id
                
                await send_welcome_email(data.email, f"{data.first_name} {data.last_name}", temp_password)
                
                user_credentials = {
                    "email": data.email,
                    "temporary_password": temp_password
                }
        
        return {
            "id": employee_id,
            "employee_code": employee_code,
            "message": "Employee created successfully",
            "user_credentials": user_credentials
        }
    else:
        return {"message": "Database mode"}

@router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = store.employees.get(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        if employee.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get leave balance
        leave_balance = next((lb for lb in store.leave_balances.values() 
            if lb.get("employee_id") == employee_id), None)
        
        # Get attendance summary (this month)
        now = utc_now()
        month_start = now.date().replace(day=1).isoformat()
        month_attendance = [a for a in store.attendance.values() 
            if a.get("employee_id") == employee_id 
            and a.get("date") >= month_start]
        
        present_days = len([a for a in month_attendance if a.get("status") == "present"])
        late_days = len([a for a in month_attendance if a.get("status") == "late"])
        absent_days = len([a for a in month_attendance if a.get("status") == "absent"])
        
        # Get recent payroll
        recent_payroll = sorted(
            [pi for pi in store.payroll_items.values() if pi.get("employee_id") == employee_id],
            key=lambda x: x.get("created_at", ""), reverse=True
        )[:6]
        
        # Get leave requests
        leave_requests = sorted(
            [lr for lr in store.leave_requests.values() if lr.get("employee_id") == employee_id],
            key=lambda x: x.get("created_at", ""), reverse=True
        )[:10]
        
        return {
            "employee": employee,
            "leave_balance": leave_balance,
            "attendance_summary": {
                "present": present_days,
                "late": late_days,
                "absent": absent_days
            },
            "recent_payroll": recent_payroll,
            "leave_requests": leave_requests
        }
    else:
        return {"message": "Database mode"}

@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeeUpdate, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = store.employees.get(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        if employee.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                employee[key] = value
        employee["updated_at"] = utc_now().isoformat()
        
        return {"message": "Employee updated", "employee": employee}
    else:
        return {"message": "Database mode"}

@router.get("/attendance")
async def list_attendance(
    date: Optional[str] = None,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: TokenData = Depends(require_hr_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        attendance = [a for a in store.attendance.values() if a.get("business_id") == business_id]
        
        if date:
            attendance = [a for a in attendance if a.get("date") == date]
        
        if employee_id:
            attendance = [a for a in attendance if a.get("employee_id") == employee_id]
        
        if status and status != "all":
            attendance = [a for a in attendance if a.get("status") == status]
        
        attendance.sort(key=lambda x: (x.get("date", ""), x.get("created_at", "")), reverse=True)
        
        total = len(attendance)
        start = (page - 1) * limit
        attendance = attendance[start:start + limit]
        
        # Enrich with employee names
        for a in attendance:
            emp = store.employees.get(a.get("employee_id"))
            if emp:
                a["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                a["department"] = emp.get("department")
        
        return {
            "attendance": attendance,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    else:
        return {"message": "Database mode"}

@router.post("/attendance")
async def record_attendance(data: AttendanceCreate, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = store.employees.get(data.employee_id)
        if not employee or employee.get("business_id") != business_id:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Check if attendance already exists for this date
        existing = next((a for a in store.attendance.values() 
            if a.get("employee_id") == data.employee_id 
            and a.get("date") == data.date), None)
        
        if existing:
            # Update existing
            if data.clock_in_time:
                existing["clock_in_time"] = data.clock_in_time
            if data.clock_out_time:
                existing["clock_out_time"] = data.clock_out_time
            if data.status:
                existing["status"] = data.status
            if data.notes:
                existing["notes"] = data.notes
            
            # Calculate hours worked
            if existing.get("clock_in_time") and existing.get("clock_out_time"):
                in_time = datetime.fromisoformat(existing["clock_in_time"])
                out_time = datetime.fromisoformat(existing["clock_out_time"])
                existing["hours_worked"] = round((out_time - in_time).total_seconds() / 3600, 2)
            
            return {"message": "Attendance updated", "attendance": existing}
        else:
            # Create new
            att_id = generate_id()
            now = utc_now()
            
            hours_worked = None
            if data.clock_in_time and data.clock_out_time:
                in_time = datetime.fromisoformat(data.clock_in_time)
                out_time = datetime.fromisoformat(data.clock_out_time)
                hours_worked = round((out_time - in_time).total_seconds() / 3600, 2)
            
            store.attendance[att_id] = {
                "id": att_id,
                "business_id": business_id,
                "employee_id": data.employee_id,
                "date": data.date,
                "clock_in_time": data.clock_in_time,
                "clock_out_time": data.clock_out_time,
                "hours_worked": hours_worked,
                "status": data.status,
                "clock_in_method": "manual",
                "notes": data.notes,
                "created_at": now.isoformat()
            }
            
            return {"message": "Attendance recorded", "attendance": store.attendance[att_id]}
    else:
        return {"message": "Database mode"}

@router.get("/leave")
async def list_leave_requests(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: TokenData = Depends(require_hr_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        leaves = [l for l in store.leave_requests.values() if l.get("business_id") == business_id]
        
        if status and status != "all":
            leaves = [l for l in leaves if l.get("status") == status]
        
        if employee_id:
            leaves = [l for l in leaves if l.get("employee_id") == employee_id]
        
        # Sort: pending first, then by date
        leaves.sort(key=lambda x: (0 if x.get("status") == "pending" else 1, x.get("created_at", "")), reverse=True)
        
        total = len(leaves)
        start = (page - 1) * limit
        leaves = leaves[start:start + limit]
        
        # Enrich with employee names
        for l in leaves:
            emp = store.employees.get(l.get("employee_id"))
            if emp:
                l["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                l["department"] = emp.get("department")
        
        return {
            "leave_requests": leaves,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    else:
        return {"message": "Database mode"}

@router.put("/leave/{leave_id}/review")
async def review_leave_request(leave_id: str, data: LeaveReview, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if data.status not in ["approved", "denied"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'denied'")
    
    if use_memory:
        from email_service import send_leave_status_email
        
        leave = store.leave_requests.get(leave_id)
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        if leave.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if leave.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Leave request already reviewed")
        
        now = utc_now()
        leave["status"] = data.status
        leave["reviewed_by"] = current_user.user_id
        leave["reviewed_at"] = now.isoformat()
        leave["review_notes"] = data.notes
        
        # Update leave balance if approved
        if data.status == "approved":
            balance = next((lb for lb in store.leave_balances.values() 
                if lb.get("employee_id") == leave.get("employee_id")), None)
            
            if balance:
                leave_type = leave.get("leave_type")
                days = leave.get("days_count", 0)
                
                if leave_type in ["annual"]:
                    balance["annual_used"] = balance.get("annual_used", 0) + days
                elif leave_type in ["sick"]:
                    balance["sick_used"] = balance.get("sick_used", 0) + days
                
                balance["updated_at"] = now.isoformat()
        
        # Send email
        employee = store.employees.get(leave.get("employee_id"))
        if employee and employee.get("email"):
            await send_leave_status_email(
                employee["email"],
                f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
                data.status,
                leave.get("leave_type"),
                format_date(leave.get("start_date")),
                format_date(leave.get("end_date")),
                data.notes or ""
            )
        
        return {"message": f"Leave request {data.status}", "leave": leave}
    else:
        return {"message": "Database mode"}

@router.get("/payroll")
async def list_payroll_runs(
    year: Optional[int] = None,
    status: Optional[str] = None,
    current_user: TokenData = Depends(require_hr_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        payrolls = [p for p in store.payroll_runs.values() if p.get("business_id") == business_id]
        
        if year:
            payrolls = [p for p in payrolls if p.get("year") == year]
        
        if status and status != "all":
            payrolls = [p for p in payrolls if p.get("status") == status]
        
        payrolls.sort(key=lambda x: (x.get("year", 0), x.get("month", 0)), reverse=True)
        
        return {"payroll_runs": payrolls}
    else:
        return {"message": "Database mode"}

@router.post("/payroll")
async def create_payroll_run(month: int, year: int, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        # Check if payroll already exists
        existing = next((p for p in store.payroll_runs.values() 
            if p.get("business_id") == business_id 
            and p.get("month") == month 
            and p.get("year") == year), None)
        
        if existing:
            raise HTTPException(status_code=400, detail="Payroll run already exists for this period")
        
        now = utc_now()
        payroll_id = generate_id()
        
        # Get active employees
        employees = [e for e in store.employees.values() 
            if e.get("business_id") == business_id 
            and e.get("status") == "active"]
        
        total_gross = 0
        total_deductions = 0
        total_net = 0
        
        # Create payroll items for each employee
        for emp in employees:
            item_id = generate_id()
            base_salary = float(emp.get("base_salary", 0))
            tax_deduction = round(base_salary * 0.1, 2)  # Simple 10% tax
            net_pay = base_salary - tax_deduction
            
            store.payroll_items[item_id] = {
                "id": item_id,
                "payroll_run_id": payroll_id,
                "business_id": business_id,
                "employee_id": emp["id"],
                "base_salary": base_salary,
                "bonus": 0,
                "overtime_pay": 0,
                "allowances": 0,
                "tax_deduction": tax_deduction,
                "other_deductions": 0,
                "net_pay": net_pay,
                "payslip_url": None,
                "status": "pending",
                "created_at": now.isoformat()
            }
            
            total_gross += base_salary
            total_deductions += tax_deduction
            total_net += net_pay
        
        store.payroll_runs[payroll_id] = {
            "id": payroll_id,
            "business_id": business_id,
            "month": month,
            "year": year,
            "status": "draft",
            "total_gross": total_gross,
            "total_deductions": total_deductions,
            "total_net": total_net,
            "employee_count": len(employees),
            "approved_by": None,
            "approved_at": None,
            "processed_at": None,
            "created_at": now.isoformat()
        }
        
        return {
            "id": payroll_id,
            "message": "Payroll run created",
            "payroll": store.payroll_runs[payroll_id]
        }
    else:
        return {"message": "Database mode"}

@router.get("/payroll/{payroll_id}")
async def get_payroll_run(payroll_id: str, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        payroll = store.payroll_runs.get(payroll_id)
        if not payroll:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        if payroll.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get items with employee names
        items = [pi for pi in store.payroll_items.values() if pi.get("payroll_run_id") == payroll_id]
        for item in items:
            emp = store.employees.get(item.get("employee_id"))
            if emp:
                item["employee_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}"
                item["department"] = emp.get("department")
                item["job_title"] = emp.get("job_title")
        
        return {"payroll": payroll, "items": items}
    else:
        return {"message": "Database mode"}

@router.put("/payroll/{payroll_id}/items/{item_id}")
async def update_payroll_item(payroll_id: str, item_id: str, data: PayrollItemUpdate, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        payroll = store.payroll_runs.get(payroll_id)
        if not payroll or payroll.get("business_id") != business_id:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        if payroll.get("status") not in ["draft", "processing"]:
            raise HTTPException(status_code=400, detail="Cannot modify approved payroll")
        
        item = store.payroll_items.get(item_id)
        if not item or item.get("payroll_run_id") != payroll_id:
            raise HTTPException(status_code=404, detail="Payroll item not found")
        
        # Update item
        item["bonus"] = data.bonus
        item["overtime_pay"] = data.overtime_pay
        item["allowances"] = data.allowances
        item["tax_deduction"] = data.tax_deduction
        item["other_deductions"] = data.other_deductions
        
        # Recalculate net pay
        gross = float(item["base_salary"]) + data.bonus + data.overtime_pay + data.allowances
        deductions = data.tax_deduction + data.other_deductions
        item["net_pay"] = gross - deductions
        
        # Update totals
        items = [pi for pi in store.payroll_items.values() if pi.get("payroll_run_id") == payroll_id]
        payroll["total_gross"] = sum([float(i.get("base_salary", 0)) + float(i.get("bonus", 0)) + float(i.get("overtime_pay", 0)) + float(i.get("allowances", 0)) for i in items])
        payroll["total_deductions"] = sum([float(i.get("tax_deduction", 0)) + float(i.get("other_deductions", 0)) for i in items])
        payroll["total_net"] = sum([float(i.get("net_pay", 0)) for i in items])
        
        return {"message": "Payroll item updated", "item": item}
    else:
        return {"message": "Database mode"}

@router.post("/payroll/{payroll_id}/submit")
async def submit_payroll(payroll_id: str, current_user: TokenData = Depends(require_hr_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        payroll = store.payroll_runs.get(payroll_id)
        if not payroll or payroll.get("business_id") != business_id:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        if payroll.get("status") != "draft":
            raise HTTPException(status_code=400, detail="Payroll already submitted")
        
        payroll["status"] = "processing"
        
        # Create notification for business owner
        owners = [u for u in store.users.values() 
            if u.get("business_id") == business_id 
            and u.get("role") == "business_owner"]
        
        for owner in owners:
            notif_id = generate_id()
            month_name = datetime(payroll["year"], payroll["month"], 1).strftime("%B")
            store.notifications[notif_id] = {
                "id": notif_id,
                "business_id": business_id,
                "user_id": owner["id"],
                "type": "payroll_pending",
                "title": "Payroll Pending Approval",
                "message": f"Payroll for {month_name} {payroll['year']} is ready for your approval",
                "is_read": False,
                "action_url": f"/dashboard/payroll/{payroll_id}",
                "created_at": utc_now().isoformat()
            }
        
        return {"message": "Payroll submitted for approval", "payroll": payroll}
    else:
        return {"message": "Database mode"}

@router.post("/payroll/{payroll_id}/approve")
async def approve_payroll(payroll_id: str, current_user: TokenData = Depends(require_business_access), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if current_user.role not in ["business_owner", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only business owner can approve payroll")
    
    if use_memory:
        from email_service import send_payroll_ready_email
        
        payroll = store.payroll_runs.get(payroll_id)
        if not payroll or payroll.get("business_id") != business_id:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        if payroll.get("status") != "processing":
            raise HTTPException(status_code=400, detail="Payroll not ready for approval")
        
        now = utc_now()
        payroll["status"] = "completed"
        payroll["approved_by"] = current_user.user_id
        payroll["approved_at"] = now.isoformat()
        payroll["processed_at"] = now.isoformat()
        
        # Update items status
        items = [pi for pi in store.payroll_items.values() if pi.get("payroll_run_id") == payroll_id]
        for item in items:
            item["status"] = "processed"
        
        # Send emails to employees
        month_name = datetime(payroll["year"], payroll["month"], 1).strftime("%B")
        for item in items:
            emp = store.employees.get(item.get("employee_id"))
            if emp and emp.get("email"):
                await send_payroll_ready_email(
                    emp["email"],
                    f"{emp.get('first_name', '')} {emp.get('last_name', '')}",
                    month_name,
                    payroll["year"]
                )
        
        return {"message": "Payroll approved and processed", "payroll": payroll}
    else:
        return {"message": "Database mode"}
