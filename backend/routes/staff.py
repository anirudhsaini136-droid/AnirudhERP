from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta, date
import uuid

from auth import get_current_user, TokenData
from database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/staff", tags=["Staff Portal"])

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
class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: Optional[str] = None

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    profile_photo_url: Optional[str] = None

def get_store():
    from server import store, use_memory_store
    return store, use_memory_store()

def require_staff_access():
    async def checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in ["staff", "hr_admin", "finance_admin", "inventory_admin", "business_owner", "super_admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user
    return checker

def get_employee_for_user(store, user_id: str, business_id: str):
    """Get employee record for a user"""
    employee = next((e for e in store.employees.values() 
        if e.get("user_id") == user_id and e.get("business_id") == business_id), None)
    return employee

@router.get("")
async def staff_home(current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if not business_id:
        raise HTTPException(status_code=403, detail="Business access required")
    
    if use_memory:
        # Get employee record
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            # For admins without employee record, show basic info
            user = store.users.get(current_user.user_id)
            return {
                "employee": None,
                "user": {k: v for k, v in user.items() if k != "password_hash"} if user else None,
                "today_status": None,
                "leave_balance": None,
                "stats": {}
            }
        
        now = utc_now()
        today = now.date()
        
        # Today's attendance
        today_attendance = next((a for a in store.attendance.values() 
            if a.get("employee_id") == employee["id"] 
            and a.get("date") == today.isoformat()), None)
        
        # Leave balance
        leave_balance = next((lb for lb in store.leave_balances.values() 
            if lb.get("employee_id") == employee["id"]), None)
        
        # Days worked this month
        month_start = today.replace(day=1).isoformat()
        month_attendance = [a for a in store.attendance.values() 
            if a.get("employee_id") == employee["id"] 
            and a.get("date") >= month_start
            and a.get("status") in ["present", "late"]]
        
        # Pending leave requests
        pending_leaves = len([l for l in store.leave_requests.values() 
            if l.get("employee_id") == employee["id"] 
            and l.get("status") == "pending"])
        
        return {
            "employee": {k: v for k, v in employee.items() if k not in ["bank_account_number", "national_id"]},
            "today_status": today_attendance,
            "is_clocked_in": today_attendance is not None and today_attendance.get("clock_in_time") and not today_attendance.get("clock_out_time"),
            "leave_balance": leave_balance,
            "stats": {
                "days_worked_this_month": len(month_attendance),
                "pending_leave_requests": pending_leaves,
                "annual_leave_remaining": (leave_balance.get("annual_total", 21) - leave_balance.get("annual_used", 0)) if leave_balance else 21,
                "sick_leave_remaining": (leave_balance.get("sick_total", 10) - leave_balance.get("sick_used", 0)) if leave_balance else 10
            }
        }
    else:
        return {"message": "Database mode"}

@router.post("/clock")
async def clock_in_out(action: str, current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if action not in ["clock_in", "clock_out"]:
        raise HTTPException(status_code=400, detail="Action must be 'clock_in' or 'clock_out'")
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")
        
        now = utc_now()
        today = now.date()
        
        # Find today's attendance
        today_attendance = next((a for a in store.attendance.values() 
            if a.get("employee_id") == employee["id"] 
            and a.get("date") == today.isoformat()), None)
        
        if action == "clock_in":
            if today_attendance and today_attendance.get("clock_in_time"):
                raise HTTPException(status_code=400, detail="Already clocked in today")
            
            # Determine if late (after 9 AM)
            status = "present"
            if now.hour >= 9 and now.minute > 15:
                status = "late"
            
            if today_attendance:
                today_attendance["clock_in_time"] = now.isoformat()
                today_attendance["status"] = status
                today_attendance["clock_in_method"] = "mobile_app"
            else:
                att_id = generate_id()
                store.attendance[att_id] = {
                    "id": att_id,
                    "business_id": business_id,
                    "employee_id": employee["id"],
                    "date": today.isoformat(),
                    "clock_in_time": now.isoformat(),
                    "clock_out_time": None,
                    "hours_worked": None,
                    "status": status,
                    "clock_in_method": "mobile_app",
                    "notes": None,
                    "created_at": now.isoformat()
                }
                today_attendance = store.attendance[att_id]
            
            return {
                "message": f"Clocked in at {now.strftime('%I:%M %p')}",
                "status": status,
                "attendance": today_attendance
            }
        
        else:  # clock_out
            if not today_attendance or not today_attendance.get("clock_in_time"):
                raise HTTPException(status_code=400, detail="Not clocked in today")
            
            if today_attendance.get("clock_out_time"):
                raise HTTPException(status_code=400, detail="Already clocked out today")
            
            today_attendance["clock_out_time"] = now.isoformat()
            
            # Calculate hours worked
            clock_in = datetime.fromisoformat(today_attendance["clock_in_time"])
            hours = round((now - clock_in).total_seconds() / 3600, 2)
            today_attendance["hours_worked"] = hours
            
            return {
                "message": f"Clocked out at {now.strftime('%I:%M %p')}. Worked {hours:.2f} hours.",
                "hours_worked": hours,
                "attendance": today_attendance
            }
    else:
        return {"message": "Database mode"}

@router.get("/payslips")
async def list_payslips(current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            return {"payslips": []}
        
        # Get payroll items for this employee
        payroll_items = sorted(
            [pi for pi in store.payroll_items.values() 
                if pi.get("employee_id") == employee["id"]
                and pi.get("status") == "processed"],
            key=lambda x: x.get("created_at", ""), reverse=True
        )[:12]
        
        # Enrich with payroll run info
        for item in payroll_items:
            payroll = store.payroll_runs.get(item.get("payroll_run_id"))
            if payroll:
                item["month"] = payroll.get("month")
                item["year"] = payroll.get("year")
                item["month_name"] = datetime(payroll["year"], payroll["month"], 1).strftime("%B")
        
        return {"payslips": payroll_items}
    else:
        return {"message": "Database mode"}

@router.get("/payslips/{payslip_id}")
async def get_payslip(payslip_id: str, current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")
        
        payslip = store.payroll_items.get(payslip_id)
        if not payslip:
            raise HTTPException(status_code=404, detail="Payslip not found")
        
        if payslip.get("employee_id") != employee["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        payroll = store.payroll_runs.get(payslip.get("payroll_run_id"))
        
        return {
            "payslip": payslip,
            "employee": {k: v for k, v in employee.items() if k not in ["bank_account_number", "national_id"]},
            "period": {
                "month": payroll.get("month") if payroll else None,
                "year": payroll.get("year") if payroll else None,
                "month_name": datetime(payroll["year"], payroll["month"], 1).strftime("%B") if payroll else None
            }
        }
    else:
        return {"message": "Database mode"}

@router.get("/leave")
async def list_my_leave_requests(current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            return {"leave_requests": [], "leave_balance": None}
        
        # Get leave requests
        leave_requests = sorted(
            [l for l in store.leave_requests.values() if l.get("employee_id") == employee["id"]],
            key=lambda x: x.get("created_at", ""), reverse=True
        )
        
        # Get leave balance
        leave_balance = next((lb for lb in store.leave_balances.values() 
            if lb.get("employee_id") == employee["id"]), None)
        
        return {
            "leave_requests": leave_requests,
            "leave_balance": leave_balance
        }
    else:
        return {"message": "Database mode"}

@router.post("/leave")
async def create_leave_request(data: LeaveRequestCreate, current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if data.leave_type not in ["annual", "sick", "emergency", "maternity", "paternity", "unpaid"]:
        raise HTTPException(status_code=400, detail="Invalid leave type")
    
    if use_memory:
        from email_service import send_leave_request_notification
        
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")
        
        now = utc_now()
        
        # Calculate days
        start = parse_date(data.start_date)
        end = parse_date(data.end_date)
        
        if start > end:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        days_count = (end - start).days + 1
        
        # Check leave balance
        leave_balance = next((lb for lb in store.leave_balances.values() 
            if lb.get("employee_id") == employee["id"]), None)
        
        if leave_balance:
            if data.leave_type == "annual":
                remaining = leave_balance.get("annual_total", 21) - leave_balance.get("annual_used", 0)
                if days_count > remaining:
                    raise HTTPException(status_code=400, detail=f"Insufficient annual leave balance. Remaining: {remaining} days")
            elif data.leave_type == "sick":
                remaining = leave_balance.get("sick_total", 10) - leave_balance.get("sick_used", 0)
                if days_count > remaining:
                    raise HTTPException(status_code=400, detail=f"Insufficient sick leave balance. Remaining: {remaining} days")
        
        leave_id = generate_id()
        store.leave_requests[leave_id] = {
            "id": leave_id,
            "business_id": business_id,
            "employee_id": employee["id"],
            "leave_type": data.leave_type,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "days_count": days_count,
            "reason": data.reason,
            "status": "pending",
            "reviewed_by": None,
            "reviewed_at": None,
            "review_notes": None,
            "created_at": now.isoformat()
        }
        
        # Notify HR admins
        hr_admins = [u for u in store.users.values() 
            if u.get("business_id") == business_id 
            and u.get("role") in ["hr_admin", "business_owner"]]
        
        for hr in hr_admins:
            notif_id = generate_id()
            store.notifications[notif_id] = {
                "id": notif_id,
                "business_id": business_id,
                "user_id": hr["id"],
                "type": "leave_request",
                "title": "New Leave Request",
                "message": f"{employee.get('first_name')} {employee.get('last_name')} requested {data.leave_type} leave",
                "is_read": False,
                "action_url": f"/hr/leave/{leave_id}",
                "created_at": now.isoformat()
            }
            
            if hr.get("email"):
                await send_leave_request_notification(
                    hr["email"],
                    f"{hr.get('first_name', '')} {hr.get('last_name', '')}",
                    f"{employee.get('first_name')} {employee.get('last_name')}",
                    data.leave_type,
                    format_date(start),
                    format_date(end)
                )
        
        return {
            "id": leave_id,
            "message": "Leave request submitted",
            "leave": store.leave_requests[leave_id]
        }
    else:
        return {"message": "Database mode"}

@router.delete("/leave/{leave_id}")
async def cancel_leave_request(leave_id: str, current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee record not found")
        
        leave = store.leave_requests.get(leave_id)
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        if leave.get("employee_id") != employee["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if leave.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Can only cancel pending requests")
        
        leave["status"] = "cancelled"
        
        return {"message": "Leave request cancelled"}
    else:
        return {"message": "Database mode"}

@router.get("/attendance")
async def my_attendance(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: TokenData = Depends(require_staff_access()),
    db=Depends(get_db)
):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        if not employee:
            return {"attendance": [], "summary": {}}
        
        now = utc_now()
        target_month = month or now.month
        target_year = year or now.year
        
        # Get attendance for the month
        attendance = [a for a in store.attendance.values() 
            if a.get("employee_id") == employee["id"]
            and datetime.fromisoformat(a["date"] + "T00:00:00").month == target_month
            and datetime.fromisoformat(a["date"] + "T00:00:00").year == target_year]
        
        attendance.sort(key=lambda x: x.get("date", ""))
        
        # Calculate summary
        present = len([a for a in attendance if a.get("status") == "present"])
        late = len([a for a in attendance if a.get("status") == "late"])
        absent = len([a for a in attendance if a.get("status") == "absent"])
        on_leave = len([a for a in attendance if a.get("status") == "on_leave"])
        total_hours = sum([float(a.get("hours_worked", 0) or 0) for a in attendance])
        
        return {
            "attendance": attendance,
            "month": target_month,
            "year": target_year,
            "month_name": datetime(target_year, target_month, 1).strftime("%B"),
            "summary": {
                "present": present,
                "late": late,
                "absent": absent,
                "on_leave": on_leave,
                "total_hours": round(total_hours, 2)
            }
        }
    else:
        return {"message": "Database mode"}

@router.get("/profile")
async def get_my_profile(current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        user = store.users.get(current_user.user_id)
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        
        return {
            "user": {k: v for k, v in user.items() if k != "password_hash"} if user else None,
            "employee": {k: v for k, v in employee.items() if k not in ["bank_account_number", "national_id", "base_salary"]} if employee else None
        }
    else:
        return {"message": "Database mode"}

@router.put("/profile")
async def update_my_profile(data: ProfileUpdate, current_user: TokenData = Depends(require_staff_access()), db=Depends(get_db)):
    store, use_memory = get_store()
    business_id = current_user.business_id
    
    if use_memory:
        employee = get_employee_for_user(store, current_user.user_id, business_id)
        
        if employee:
            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                if value is not None:
                    employee[key] = value
            employee["updated_at"] = utc_now().isoformat()
        
        # Also update user if phone changed
        if data.phone:
            user = store.users.get(current_user.user_id)
            if user:
                user["phone"] = data.phone
                user["updated_at"] = utc_now().isoformat()
        
        return {"message": "Profile updated"}
    else:
        return {"message": "Database mode"}
