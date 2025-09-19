from flask import Blueprint, request, render_template, redirect, url_for, flash, session
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database import DatabaseService, User, PHILIPPINE_TZ
from services.user_service import user_service
from functools import wraps
import secrets
import string
import hashlib
import time
import os

# Create blueprint
passwordreset_bp = Blueprint('passwordreset', __name__, url_prefix='/passwordreset')

def admin_required(f):
    """Decorator to require admin role for access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('auth.login'))
        
        from database import DatabaseService
        user = DatabaseService.get_user_by_id(session['user_id'])
        if not user or user.get('role') != 'admin':
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('main.index'))
        
        return f(*args, **kwargs)
    return decorated_function

# Generate a random secret key for this session if not in environment
_SESSION_SECRET_KEY = os.environ.get('PASSWORD_RESET_SECRET_KEY') or secrets.token_urlsafe(64)

# Helper function to generate secure reset token
def generate_reset_token(user_id, email):
    """Generate a secure time-based reset token"""
    timestamp = str(int(time.time()))
    # Add random salt for additional security
    salt = secrets.token_urlsafe(16)
    token_data = f"{user_id}:{email}:{timestamp}:{salt}"
    token_hash = hashlib.sha256(f"{token_data}:{_SESSION_SECRET_KEY}".encode()).hexdigest()
    # Return token without exposing the secret key
    return f"{user_id}.{timestamp}.{salt}.{token_hash}"

def verify_reset_token(token, user_id, email, max_age_hours=None):
    """Verify a reset token and check if it's not expired"""
    if max_age_hours is None:
        max_age_hours = int(os.environ.get('PASSWORD_RESET_TOKEN_EXPIRY_HOURS', 1))
    
    try:
        parts = token.split('.')
        if len(parts) != 4:
            return False
        
        token_user_id, timestamp, salt, token_hash = parts
        
        # Check if user_id matches
        if str(user_id) != token_user_id:
            return False
        
        # Check if token is expired (configurable from environment)
        token_time = int(timestamp)
        current_time = int(time.time())
        if current_time - token_time > (max_age_hours * 3600):
            return False
        
        # Verify token integrity using the session secret key
        token_data = f"{user_id}:{email}:{timestamp}:{salt}"
        expected_hash = hashlib.sha256(f"{token_data}:{_SESSION_SECRET_KEY}".encode()).hexdigest()
        
        return token_hash == expected_hash
    except (ValueError, IndexError):
        return False

@passwordreset_bp.route('/request', methods=['POST'])
def request_password_reset():
    """User submits password reset request"""
    user_identifier = request.form.get('user_identifier')
    
    if not user_identifier:
        flash('Please enter your username or email', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        # Use centralized user service for consistent user resolution
        user_info = user_service.get_user_display_info(user_identifier)
        if not user_info:
            # Be direct about non-existent accounts
            flash('User does not exist. Please check your username or email and try again.', 'error')
            return redirect(url_for('auth.login'))
        
        db = DatabaseService()
        
        # Create password reset request using verified user info
        reset_request = {
            'user_id': user_info['user_id'],
            'username': user_info['username'],
            'email': user_info['email'],
            'requested_at': datetime.now(PHILIPPINE_TZ),
            'status': 'pending',
            'ip_address': request.remote_addr
        }
        
        db.create_password_reset_request(reset_request)
        
        flash('Password reset request submitted. You will receive an email with instructions.', 'success')
        
    except Exception as e:
        print(f"Password reset request error: {e}")
        flash('An error occurred. Please try again later.', 'error')
    
    return redirect(url_for('auth.login'))

@passwordreset_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    """Direct password reset from email link with token"""
    
    if request.method == 'GET':
        token = request.args.get('token')
        
        if not token:
            flash('Invalid or missing reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Parse token and verify
        try:
            parts = token.split('.')
            if len(parts) != 4:
                flash('Invalid reset token format', 'error')
                return redirect(url_for('auth.login'))
            
            user_id = int(parts[0])
            
            # Get user from database
            db = DatabaseService()
            user = db.get_user_by_id(user_id)
            
            if not user:
                flash('Invalid reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Verify token is valid and not expired
            if not verify_reset_token(token, user['id'], user['email']):
                flash('Invalid or expired reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Render password reset page with user info
            return render_template('auth/reset_password.html', 
                                 user_data={'username': user['username'], 'email': user['email']},
                                 token=token)
                                 
        except (ValueError, IndexError) as e:
            flash('Invalid reset token format', 'error')
            return redirect(url_for('auth.login'))
        except Exception as e:
            print(f"Reset password error: {e}")
            flash('An error occurred. Please try again.', 'error')
            return redirect(url_for('auth.login'))
    
    # Handle POST (password change submission)
    token = request.form.get('token')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if not token or not new_password or not confirm_password:
        flash('All fields are required', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))
    
    if new_password != confirm_password:
        flash('Passwords do not match', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))
    
    if len(new_password) < 6:
        flash('Password must be at least 6 characters long', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))
    
    try:
        # Parse and verify token again
        parts = token.split('.')
        user_id = int(parts[0])
        
        db = DatabaseService()
        user = db.get_user_by_id(user_id)
        
        if not user or not verify_reset_token(token, user['id'], user['email']):
            flash('Invalid or expired reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Update password
        password_hash = generate_password_hash(new_password)
        success = db.update_user_password(user['id'], password_hash)
        
        if success:
            # Auto-login the user
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user.get('role') == 'admin'
            
            # Update last login since user is now logged in
            db.update_last_login(user['id'])
            
            flash('Password updated successfully! You are now logged in.', 'success')
            return redirect(url_for('main.index'))
        else:
            flash('Failed to update password', 'error')
            return redirect(url_for('passwordreset.reset_password', token=token))
            
    except Exception as e:
        print(f"Password update error: {e}")
        flash('An error occurred while updating password', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))

# Admin routes for password reset management
@passwordreset_bp.route('/approve', methods=['POST'])
@admin_required
def approve_password_reset():
    """Admin approves password reset request - generates token instead of temp password"""
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.admin_dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request:
            flash('Request not found', 'error')
            return redirect(url_for('admin.admin_dashboard'))
        
        # Check if already approved
        if reset_request['status'] == 'approved':
            flash(f'Password reset for {reset_request["username"]} was already approved', 'info')
            return redirect(url_for('admin.admin_dashboard'))
        
        # Generate secure reset token
        reset_token = generate_reset_token(reset_request['user_id'], reset_request['email'])
        
        # Mark request as approved
        db.update_password_reset_request(request_id, 'approved')
        
        # Try to send email notification with token
        try:
            from services.email_service import send_password_reset_token_notification
            # Use username as identifier - user service will resolve to correct email
            email_sent = send_password_reset_token_notification(
                reset_request['username'], 
                reset_token
            )
        except ImportError:
            email_sent = False
            print("Email service not available - email notification skipped")
        
        # Log admin action
        admin_id = session.get('user_id')
        db.log_admin_action(admin_id, 'approve_password_reset', f"Approved reset for: {reset_request['username']}")
        
        if email_sent:
            flash(f"Password reset approved for {reset_request['username']}", 'success')
        else:
            flash(f"Password reset approved for {reset_request['username']} but email delivery failed - Reset token: {reset_token}", 'warning')
            
    except Exception as e:
        print(f"Password reset approval error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.admin_dashboard'))

@passwordreset_bp.route('/deny', methods=['POST'])
@admin_required
def deny_password_reset():
    """Admin denies password reset request"""
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.admin_dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request:
            flash('Request not found', 'error')
            return redirect(url_for('admin.admin_dashboard'))
        
        # Check if already denied
        if reset_request['status'] == 'denied':
            flash(f'Password reset for {reset_request["username"]} was already denied', 'info')
            return redirect(url_for('admin.admin_dashboard'))
        
        # Mark request as denied
        db.update_password_reset_request(request_id, 'denied')
        
        # Log admin action
        admin_id = session.get('user_id')
        db.log_admin_action(admin_id, 'deny_password_reset', f"Denied reset for: {reset_request['username']}")
        
        flash(f"Password reset request denied for {reset_request['username']}", 'info')
        
    except Exception as e:
        print(f"Password reset denial error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.admin_dashboard'))