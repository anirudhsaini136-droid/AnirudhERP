import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, Date, 
    ForeignKey, Enum as SQLEnum, Numeric, Index
)
from sqlalchemy.orm import relationship
from database import Base
import enum

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# Enums
class PlanType(str, enum.Enum):
    starter = "starter"
    growth = "growth"
    enterprise = "enterprise"

class BusinessStatus(str, enum.Enum):
    trial = "trial"
    active = "active"
    suspended = "suspended"
    expired = "expired"
    cancelled = "cancelled"

class PaymentType(str, enum.Enum):
    stripe = "stripe"
    manual = "manual"
    mixed = "mixed"

class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    business_owner = "business_owner"
    hr_admin = "hr_admin"
    finance_admin = "finance_admin"
    inventory_admin = "inventory_admin"
    staff = "staff"

class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"

class EmployeeStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    suspended = "suspended"
    terminated = "terminated"

class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    on_leave = "on_leave"

class ClockInMethod(str, enum.Enum):
    manual = "manual"
    qr_code = "qr_code"
    mobile_app = "mobile_app"

class LeaveType(str, enum.Enum):
    annual = "annual"
    sick = "sick"
    emergency = "emergency"
    maternity = "maternity"
    paternity = "paternity"
    unpaid = "unpaid"

class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"
    cancelled = "cancelled"

class PayrollStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    approved = "approved"
    completed = "completed"
    cancelled = "cancelled"

class PayrollItemStatus(str, enum.Enum):
    pending = "pending"
    processed = "processed"

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class ExpenseStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class ProductStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    discontinued = "discontinued"

class MovementType(str, enum.Enum):
    stock_in = "stock_in"
    stock_out = "stock_out"
    adjustment = "adjustment"
    return_item = "return"
    damage = "damage"

class PurchaseOrderStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    confirmed = "confirmed"
    partially_delivered = "partially_delivered"
    delivered = "delivered"
    cancelled = "cancelled"

class SupplierStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class ManualPaymentMethod(str, enum.Enum):
    cash = "cash"
    bank_transfer = "bank_transfer"
    cheque = "cheque"
    mobile_money = "mobile_money"
    other = "other"

class SubscriptionAction(str, enum.Enum):
    created = "created"
    extended = "extended"
    suspended = "suspended"
    reactivated = "reactivated"
    plan_upgraded = "plan_upgraded"
    plan_downgraded = "plan_downgraded"
    expired = "expired"
    cancelled = "cancelled"
    trial_started = "trial_started"

# Models
class Business(Base):
    __tablename__ = 'businesses'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    owner_name = Column(String(255))
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    logo_url = Column(String(500))
    plan = Column(SQLEnum(PlanType), default=PlanType.starter)
    status = Column(SQLEnum(BusinessStatus), default=BusinessStatus.trial)
    trial_ends_at = Column(DateTime(timezone=True))
    subscription_expires_at = Column(DateTime(timezone=True))
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    payment_type = Column(SQLEnum(PaymentType), default=PaymentType.manual)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="business", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(50))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    business = relationship("Business", back_populates="users")
    employee = relationship("Employee", back_populates="user", uselist=False)

class Employee(Base):
    __tablename__ = 'employees'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    employee_code = Column(String(50))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    department = Column(String(100))
    job_title = Column(String(100))
    employment_type = Column(SQLEnum(EmploymentType), default=EmploymentType.full_time)
    start_date = Column(Date)
    base_salary = Column(Numeric(12, 2), default=0)
    salary_currency = Column(String(10), default='INR')
    bank_account_number = Column(String(100))
    bank_name = Column(String(255))
    national_id = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(SQLEnum(Gender))
    address = Column(Text)
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(50))
    profile_photo_url = Column(String(500))
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.active)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    business = relationship("Business", back_populates="employees")
    user = relationship("User", back_populates="employee")
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    leave_balance = relationship("LeaveBalance", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    payroll_items = relationship("PayrollItem", back_populates="employee", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = 'departments'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    manager_id = Column(String(36), ForeignKey('employees.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Attendance(Base):
    __tablename__ = 'attendance'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    clock_in_time = Column(DateTime(timezone=True))
    clock_out_time = Column(DateTime(timezone=True))
    hours_worked = Column(Numeric(4, 2))
    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.present)
    clock_in_method = Column(SQLEnum(ClockInMethod), default=ClockInMethod.manual)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    employee = relationship("Employee", back_populates="attendance_records")
    
    __table_args__ = (
        Index('ix_attendance_employee_date', 'employee_id', 'date'),
    )

class LeaveRequest(Base):
    __tablename__ = 'leave_requests'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    leave_type = Column(SQLEnum(LeaveType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_count = Column(Integer, nullable=False)
    reason = Column(Text)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.pending)
    reviewed_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    reviewed_at = Column(DateTime(timezone=True))
    review_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    employee = relationship("Employee", back_populates="leave_requests")

class LeaveBalance(Base):
    __tablename__ = 'leave_balances'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    year = Column(Integer, nullable=False)
    annual_total = Column(Integer, default=21)
    annual_used = Column(Integer, default=0)
    sick_total = Column(Integer, default=10)
    sick_used = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    employee = relationship("Employee", back_populates="leave_balance")

class PayrollRun(Base):
    __tablename__ = 'payroll_runs'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(SQLEnum(PayrollStatus), default=PayrollStatus.draft)
    total_gross = Column(Numeric(14, 2), default=0)
    total_deductions = Column(Numeric(14, 2), default=0)
    total_net = Column(Numeric(14, 2), default=0)
    employee_count = Column(Integer, default=0)
    approved_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    approved_at = Column(DateTime(timezone=True))
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    items = relationship("PayrollItem", back_populates="payroll_run", cascade="all, delete-orphan")

class PayrollItem(Base):
    __tablename__ = 'payroll_items'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    payroll_run_id = Column(String(36), ForeignKey('payroll_runs.id', ondelete='CASCADE'), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    base_salary = Column(Numeric(12, 2), default=0)
    bonus = Column(Numeric(12, 2), default=0)
    overtime_pay = Column(Numeric(12, 2), default=0)
    allowances = Column(Numeric(12, 2), default=0)
    tax_deduction = Column(Numeric(12, 2), default=0)
    other_deductions = Column(Numeric(12, 2), default=0)
    net_pay = Column(Numeric(12, 2), default=0)
    payslip_url = Column(String(500))
    status = Column(SQLEnum(PayrollItemStatus), default=PayrollItemStatus.pending)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    payroll_run = relationship("PayrollRun", back_populates="items")
    employee = relationship("Employee", back_populates="payroll_items")

class Invoice(Base):
    __tablename__ = 'invoices'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    invoice_number = Column(String(50), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_address = Column(Text)
    client_phone = Column(String(50))
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    subtotal = Column(Numeric(14, 2), default=0)
    tax_rate = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    discount_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    amount_paid = Column(Numeric(14, 2), default=0)
    balance_due = Column(Numeric(14, 2), default=0)
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.draft)
    notes = Column(Text)
    payment_terms = Column(String(255))
    currency = Column(String(10), default='INR')
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = 'invoice_items'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    invoice = relationship("Invoice", back_populates="items")

class InvoicePayment(Base):
    __tablename__ = 'invoice_payments'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String(100))
    reference = Column(String(255))
    notes = Column(Text)
    recorded_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    invoice = relationship("Invoice", back_populates="payments")

class Expense(Base):
    __tablename__ = 'expenses'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    category = Column(String(100))
    description = Column(Text)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default='INR')
    date = Column(Date, nullable=False)
    receipt_url = Column(String(500))
    submitted_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    approved_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.pending)
    rejection_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class ExpenseCategory(Base):
    __tablename__ = 'expense_categories'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), index=True)
    category = Column(String(100))
    description = Column(Text)
    unit_price = Column(Numeric(12, 2), default=0)
    cost_price = Column(Numeric(12, 2), default=0)
    current_stock = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=5)
    maximum_stock = Column(Integer)
    unit_of_measure = Column(String(50))
    supplier_id = Column(String(36), ForeignKey('suppliers.id', ondelete='SET NULL'))
    image_url = Column(String(500))
    barcode = Column(String(100))
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.active)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class StockMovement(Base):
    __tablename__ = 'stock_movements'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True)
    movement_type = Column(SQLEnum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    previous_stock = Column(Integer)
    new_stock = Column(Integer)
    reference = Column(String(255))
    notes = Column(Text)
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Supplier(Base):
    __tablename__ = 'suppliers'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    payment_terms = Column(String(255))
    lead_time_days = Column(Integer)
    rating = Column(Integer)
    notes = Column(Text)
    status = Column(SQLEnum(SupplierStatus), default=SupplierStatus.active)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey('suppliers.id', ondelete='SET NULL'), index=True)
    order_number = Column(String(50), nullable=False, index=True)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    actual_delivery_date = Column(Date)
    status = Column(SQLEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.draft)
    subtotal = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    notes = Column(Text)
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = 'purchase_order_items'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_order_id = Column(String(36), ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")

class ManualPayment(Base):
    __tablename__ = 'manual_payments'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default='INR')
    payment_method = Column(SQLEnum(ManualPaymentMethod), nullable=False)
    payment_date = Column(Date, nullable=False)
    duration_days = Column(Integer, nullable=False)
    notes = Column(Text)
    reference_number = Column(String(255))
    extended_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    previous_expiry_date = Column(DateTime(timezone=True))
    new_expiry_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class SubscriptionHistory(Base):
    __tablename__ = 'subscription_history'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    action = Column(SQLEnum(SubscriptionAction), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    performed_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    type = Column(String(100))
    title = Column(String(255), nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    action_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(String(36))
    description = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class PaymentTransaction(Base):
    __tablename__ = 'payment_transactions'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    session_id = Column(String(255), unique=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default='INR')
    payment_status = Column(String(50), default='pending')
    status = Column(String(50), default='initiated')
    payment_metadata = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class PlatformSettings(Base):
    __tablename__ = 'platform_settings'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
