import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@nexuserp.com')

logger = logging.getLogger(__name__)

# Initialize resend only if API key is valid
if RESEND_API_KEY and not RESEND_API_KEY.startswith('re_your'):
    resend.api_key = RESEND_API_KEY

def get_email_template(title: str, body: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #07090F;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #07090F; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #161C2D; border-radius: 8px; overflow: hidden;">
                        <tr>
                            <td style="padding: 30px 40px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <h1 style="margin: 0; color: #C9A84C; font-family: Georgia, serif; font-size: 28px;">NexusERP</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px 0; color: #FFFFFF; font-family: Georgia, serif; font-size: 24px;">{title}</h2>
                                <div style="color: #E5E7EB; font-size: 16px; line-height: 1.6;">
                                    {body}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px 40px; background-color: #0F1420; border-top: 1px solid rgba(255,255,255,0.1);">
                                <p style="margin: 0; color: #9CA3AF; font-size: 14px; text-align: center;">
                                    NexusERP — Business Management Platform
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

async def send_email(to_email: str, subject: str, body_html: str) -> dict:
    """Send email using Resend API. Returns status dict."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith('re_your'):
        logger.info(f"[EMAIL MOCK] To: {to_email}, Subject: {subject}")
        return {"status": "mocked", "message": "Email mocked - no valid API key"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": body_html
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return {"status": "error", "message": str(e)}

# Pre-built email functions
async def send_welcome_email(to_email: str, name: str, password: str):
    body = f"""
    <p>Hello {name},</p>
    <p>Welcome to NexusERP! Your account has been created successfully.</p>
    <p>Here are your login credentials:</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Email:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{to_email}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Password:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{password}</strong></td></tr>
    </table>
    <p>Please login and change your password immediately.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Welcome to NexusERP", body)
    return await send_email(to_email, "Welcome to NexusERP", html)

async def send_subscription_extended_email(to_email: str, name: str, new_expiry_date: str):
    body = f"""
    <p>Hello {name},</p>
    <p>Great news! Your NexusERP subscription has been extended.</p>
    <p style="background-color: #0F1420; padding: 20px; border-radius: 8px; text-align: center;">
        <span style="color: #9CA3AF;">Your access is now valid until:</span><br>
        <span style="color: #1DB584; font-size: 24px; font-weight: bold;">{new_expiry_date}</span>
    </p>
    <p>Thank you for continuing with NexusERP!</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Subscription Extended", body)
    return await send_email(to_email, "Your NexusERP Subscription Has Been Extended", html)

async def send_subscription_expiring_warning(to_email: str, name: str, days_remaining: int):
    urgency = "urgent" if days_remaining <= 3 else "warning"
    color = "#E8485A" if days_remaining <= 3 else "#F0A432"
    body = f"""
    <p>Hello {name},</p>
    <p>This is a reminder that your NexusERP subscription is expiring soon.</p>
    <p style="background-color: #0F1420; padding: 20px; border-radius: 8px; text-align: center;">
        <span style="color: {color}; font-size: 36px; font-weight: bold;">{days_remaining}</span><br>
        <span style="color: #9CA3AF;">days remaining</span>
    </p>
    <p>Please contact us to renew your subscription and avoid any interruption to your service.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Subscription Expiring Soon", body)
    return await send_email(to_email, f"{'URGENT: ' if urgency == 'urgent' else ''}Your NexusERP Subscription Expires in {days_remaining} Days", html)

async def send_subscription_expired_email(to_email: str, name: str):
    body = f"""
    <p>Hello {name},</p>
    <p>Your NexusERP subscription has expired. Your access to the platform has been suspended.</p>
    <p style="background-color: #0F1420; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #E8485A;">
        <span style="color: #E8485A; font-weight: bold;">Your access has been suspended</span>
    </p>
    <p>To restore access, please contact our support team or your administrator to renew your subscription.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Subscription Expired", body)
    return await send_email(to_email, "Your NexusERP Subscription Has Expired", html)

async def send_leave_request_notification(to_email: str, hr_name: str, employee_name: str, leave_type: str, start_date: str, end_date: str):
    body = f"""
    <p>Hello {hr_name},</p>
    <p>A new leave request has been submitted and requires your review.</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Employee:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{employee_name}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Leave Type:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{leave_type}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">From:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{start_date}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">To:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{end_date}</strong></td></tr>
    </table>
    <p>Please log in to NexusERP to approve or deny this request.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("New Leave Request", body)
    return await send_email(to_email, f"Leave Request from {employee_name}", html)

async def send_leave_status_email(to_email: str, employee_name: str, status: str, leave_type: str, start_date: str, end_date: str, notes: str = ""):
    status_color = "#1DB584" if status == "approved" else "#E8485A"
    status_text = "Approved" if status == "approved" else "Denied"
    body = f"""
    <p>Hello {employee_name},</p>
    <p>Your leave request has been reviewed.</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Status:</td><td style="color: {status_color}; padding: 5px 0;"><strong>{status_text}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Leave Type:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{leave_type}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">From:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{start_date}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">To:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{end_date}</strong></td></tr>
        {f'<tr><td style="color: #9CA3AF; padding: 5px 0;">Notes:</td><td style="color: #FFFFFF; padding: 5px 0;">{notes}</td></tr>' if notes else ''}
    </table>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template(f"Leave Request {status_text}", body)
    return await send_email(to_email, f"Your Leave Request Has Been {status_text}", html)

async def send_payroll_ready_email(to_email: str, employee_name: str, month: str, year: int):
    body = f"""
    <p>Hello {employee_name},</p>
    <p>Your payslip for <strong>{month} {year}</strong> is now ready.</p>
    <p style="background-color: #0F1420; padding: 20px; border-radius: 8px; text-align: center;">
        <span style="color: #1DB584; font-weight: bold;">Payslip Available</span><br>
        <span style="color: #9CA3AF;">Log in to view and download your payslip</span>
    </p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Payslip Ready", body)
    return await send_email(to_email, f"Your Payslip for {month} {year} is Ready", html)

async def send_invoice_email(to_email: str, client_name: str, invoice_number: str, total_amount: str, due_date: str):
    body = f"""
    <p>Dear {client_name},</p>
    <p>Please find your invoice details below.</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Invoice Number:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{invoice_number}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Total Amount:</td><td style="color: #C9A84C; padding: 5px 0;"><strong>{total_amount}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Due Date:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{due_date}</strong></td></tr>
    </table>
    <p>Please make payment by the due date to avoid any late fees.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template(f"Invoice {invoice_number}", body)
    return await send_email(to_email, f"Invoice {invoice_number} - Payment Due {due_date}", html)

async def send_invoice_overdue_email(to_email: str, client_name: str, invoice_number: str, total_amount: str, days_overdue: int):
    body = f"""
    <p>Dear {client_name},</p>
    <p>This is a reminder that your invoice is overdue.</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%; border-left: 4px solid #E8485A;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Invoice Number:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{invoice_number}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Amount Due:</td><td style="color: #E8485A; padding: 5px 0;"><strong>{total_amount}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Days Overdue:</td><td style="color: #E8485A; padding: 5px 0;"><strong>{days_overdue} days</strong></td></tr>
    </table>
    <p>Please make payment as soon as possible to avoid additional charges.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Invoice Overdue Reminder", body)
    return await send_email(to_email, f"OVERDUE: Invoice {invoice_number} - {days_overdue} Days Past Due", html)

async def send_low_stock_alert(to_email: str, admin_name: str, product_name: str, current_stock: int, minimum_stock: int):
    body = f"""
    <p>Hello {admin_name},</p>
    <p>A product has fallen below its minimum stock level.</p>
    <table style="margin: 20px 0; background-color: #0F1420; padding: 20px; border-radius: 8px; width: 100%; border-left: 4px solid #F0A432;">
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Product:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{product_name}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Current Stock:</td><td style="color: #E8485A; padding: 5px 0;"><strong>{current_stock}</strong></td></tr>
        <tr><td style="color: #9CA3AF; padding: 5px 0;">Minimum Stock:</td><td style="color: #FFFFFF; padding: 5px 0;"><strong>{minimum_stock}</strong></td></tr>
    </table>
    <p>Please reorder this product to maintain inventory levels.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Low Stock Alert", body)
    return await send_email(to_email, f"Low Stock Alert: {product_name}", html)

async def send_password_reset_email(to_email: str, name: str, reset_link: str):
    body = f"""
    <p>Hello {name},</p>
    <p>We received a request to reset your password.</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" style="background-color: #C9A84C; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
        </a>
    </p>
    <p style="color: #9CA3AF; font-size: 14px;">If you didn't request this, please ignore this email. This link will expire in 1 hour.</p>
    <p style="margin-top: 30px;">Best regards,<br>The NexusERP Team</p>
    """
    html = get_email_template("Password Reset", body)
    return await send_email(to_email, "Reset Your NexusERP Password", html)
