from flask import current_app
from flask_mail import Message
import traceback

try:
    from flask_mail import Mail
    mail = Mail()
    MAIL_AVAILABLE = True
except ImportError:
    mail = None
    MAIL_AVAILABLE = False

# Import user service for consistent user resolution
from services.user_service import user_service

def init_mail(app):
    """Initialize Flask-Mail with the application"""
    global mail
    if MAIL_AVAILABLE:
        mail.init_app(app)
    else:
        print("⚠️ Flask-Mail not available - email functionality disabled")

def send_email(to_email, subject, html_body):
    """
    Send HTML email with validation
    
    Args:
        to_email: Email address to send to
        subject: Email subject
        html_body: HTML content of the email
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not MAIL_AVAILABLE or not mail:
        print(f"📧 Email not sent (service unavailable): {subject} to {to_email}")
        return False
    
    # Validate email format
    if not to_email or '@' not in to_email:
        print(f"❌ Invalid email address: {to_email}")
        return False
        
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html_body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@truthguard.com')
        )
        mail.send(msg)
        print(f"✅ Email sent successfully: {subject} to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        traceback.print_exc()
        return False

def send_email_to_user(recipient_identifier, subject, html_body):
    """
    Send email to user with automatic username-to-email resolution
    
    Args:
        recipient_identifier: Username or email of recipient
        subject: Email subject
        html_body: HTML content of the email
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Use user service to get verified email address
    user_info = user_service.ensure_valid_email_recipient(recipient_identifier)
    if not user_info:
        print(f"❌ Cannot send email: Invalid recipient '{recipient_identifier}'")
        return False
    
    return send_email(user_info['email'], subject, html_body)

def send_password_reset_token_notification(recipient_identifier, reset_token):
    """
    Send password reset token notification to user
    
    Args:
        recipient_identifier: Username or email of the user requesting reset
        reset_token: Secure token for password reset
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Use user service to get verified user details
    user_info = user_service.ensure_valid_email_recipient(recipient_identifier)
    if not user_info:
        print(f"❌ Cannot send password reset token: Invalid recipient '{recipient_identifier}'")
        return False
    
    username = user_info['username']
    user_email = user_info['email']
    
    subject = "Password Reset Link - TruthGuard"
    
    reset_url = f"http://localhost:5000/passwordreset/reset-password?token={reset_token}"
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">Password Reset Request</h2>
        </div>
        
        <p>Hello <strong>{username}</strong>,</p>
        
        <p>Your password reset request has been approved by an administrator.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 15px;">Click the button below to reset your password:</p>
            <a href="{reset_url}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 15px;">
                🔐 Reset My Password
            </a>
            <p style="font-size: 14px; color: #666;">This link will take you directly to the password reset form</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;"><strong>Important Security Notes:</strong></p>
            <ul style="color: #856404; margin: 10px 0;">
                <li>This link expires in 1 hour for security</li>
                <li>You can only use this link once</li>
                <li>Choose a strong password during reset</li>
                <li>Delete this email after completing the reset</li>
            </ul>
        </div>
        
        <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #495057; text-align: center;"><strong>Link Expires in 1 Hour</strong></p>
            <p style="color: #666; font-size: 14px; text-align: center; margin: 5px 0 0 0;">
                For security, this reset link will expire soon. If you need help, contact: 
                <a href="mailto:admin@truthguard.com" style="color: #007bff;">admin@truthguard.com</a>
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, please contact an administrator immediately.
        </p>
        
        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            TruthGuard Administration Team
        </p>
    </div>
    """
    
    success = send_email(user_email, subject, html_body)
    if success:
        print(f"✅ Password reset token sent to {username} <{user_email}>")
    else:
        print(f"❌ Failed to send password reset token to {username} <{user_email}>")
    
    return success

def send_password_reset_notification(recipient_identifier, new_password):
    """
    Send password reset confirmation to user (Legacy function - deprecated)
    
    Args:
        recipient_identifier: Username or email of the user
        new_password: Temporary password (DEPRECATED - use token-based system instead)
        
    Returns:
        bool: True if email sent successfully, False otherwise
        
    Note: This function is deprecated. Use send_password_reset_token_notification instead.
    """
    print("⚠️ Warning: Using deprecated send_password_reset_notification function")
    
    # Use user service to get verified user details
    user_info = user_service.ensure_valid_email_recipient(recipient_identifier)
    if not user_info:
        print(f"❌ Cannot send password reset notification: Invalid recipient '{recipient_identifier}'")
        return False
    
    username = user_info['username']
    user_email = user_info['email']
    subject = "Password Reset Completed - TruthGuard"
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">Password Reset Completed</h2>
        </div>
        
        <p>Hello <strong>{username}</strong>,</p>
        
        <p>Your TruthGuard password has been successfully reset by an administrator.</p>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">Your New Password</h3>
            <div style="background: white; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold; color: #333; border: 2px dashed #28a745;">
                {new_password}
            </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;"><strong>Important Security Notes:</strong></p>
            <ul style="color: #856404; margin: 10px 0;">
                <li>Use the temporary password below to log in</li>
                <li>You'll be prompted to set a new password immediately</li>
                <li>Keep this password secure and don't share it</li>
                <li>Delete this email after completing the reset</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 15px;">Click the button below to reset your password:</p>
            <a href="http://localhost:5000/passwordreset/reset-password?token={username}_{new_password}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 15px;">
                🔐 Reset My Password
            </a>
            <p style="font-size: 14px; color: #666;">This link will take you directly to the password reset form</p>
        </div>
        
        <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #495057; text-align: center;"><strong>Link Expires Soon</strong></p>
            <p style="color: #666; font-size: 14px; text-align: center; margin: 5px 0 0 0;">
                For security, this reset link will expire in 1 hour. If you need help, contact: 
                <a href="mailto:admin@truthguard.com" style="color: #007bff;">admin@truthguard.com</a>
            </p>
        </div>
        
        <p>You can also manually log in to TruthGuard using your new password:</p>
        <p><a href="http://localhost:5000/auth/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Login to TruthGuard</a></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, please contact an administrator immediately.
        </p>
        
        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            TruthGuard Administration Team
        </p>
    </div>
    """
    
    return send_email(user_email, subject, html_body)