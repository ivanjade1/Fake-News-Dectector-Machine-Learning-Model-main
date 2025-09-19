# Simple Forgot Password Implementation

## Overview
Add a simple password reset feature that allows users to request help from the login page, with admin control for password resets.

## User Workflow

### From Login Page
1. User tries to login but forgot password
2. User clicks "Forgot Password?" link on login page
3. Modal opens asking for username/email
4. Password reset req        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
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
            <a href="http://localhost:5000/passwordreset/reset-password?token={username}_{new_password}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 15px;">
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
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;")directly to admin dashboard
5. Admin approves request and user receives email with temporary password
6. User logs in with temporary password and must change it immediately

## Implementation

### 1. Add Forgot Password Modal to Login Page

Update `templates/auth/login.html` to include a forgot password link and modal:

**Add the forgot password link after the login button:**
```html
<!-- Add this after the login button, before the register link -->
<div class="text-center mt-4">
    <button type="button" class="auth-link text-sm" onclick="openForgotPasswordModal()">
        <i class="bi bi-question-circle mr-1"></i>
        Forgot your password?
    </button>
</div>
```

**Add the modal at the end of the page, before `{% endblock %}`:**
```html
<!-- Forgot Password Modal -->
<div id="forgot-password-modal" class="fixed inset-0 modal-backdrop z-50 hidden">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="modal-card w-full max-w-md">
            <div class="flex justify-between items-center p-6 border-b border-gray-300 dark:border-neutral-700">
                <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Forgot Your Password?</h3>
                <button class="modal-close text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors" onclick="closeForgotPasswordModal()">
                    <i class="bi bi-x-lg text-xl"></i>
                </button>
            </div>
            
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="method-icon bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto mb-4">
                        <i class="bi bi-key"></i>
                    </div>
                    <p class="text-neutral-600 dark:text-neutral-400">Request a password reset from an administrator</p>
                </div>

                <form id="password-reset-request-form" method="POST" action="{{ url_for('passwordreset.request_password_reset') }}">
                    <div class="mb-4">
                        <label for="user_identifier" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Username or Email
                        </label>
                        <input type="text" 
                               id="user_identifier" 
                               name="user_identifier" 
                               class="auth-input" 
                               placeholder="Enter your username or email address"
                               required>
                    </div>

                    <button type="submit" class="auth-btn-primary w-full">
                        <i class="bi bi-send mr-2"></i>
                        Request Password Reset
                    </button>
                </form>

                <div class="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div class="flex items-start">
                        <i class="bi bi-info-circle text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 text-sm"></i>
                        <div class="text-xs">
                            <p class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Security Notice</p>
                            <p class="text-yellow-700 dark:text-yellow-300">
                                Your request will be sent to administrators for processing. You'll receive an email with your temporary password once approved.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function openForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.getElementById('forgot-password-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeForgotPasswordModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeForgotPasswordModal();
    }
});
</script>
```

## Password Change Modal (After Login with Temporary Password)

This modal automatically opens when a user logs in with a temporary password:

```html
<!-- Password Change Modal -->
<div id="password-change-modal" class="fixed inset-0 modal-backdrop z-50 hidden">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="modal-card w-full max-w-md">
            <div class="p-6 border-b border-gray-300 dark:border-neutral-700">
                <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Change Your Password</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-2">You must change your temporary password before continuing</p>
            </div>
            
            <form id="password-change-form" class="p-6" method="POST" action="{{ url_for('auth.change_password') }}">
                <!-- Display Username/Email -->
                <div class="mb-4 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Account</label>
                    <div class="text-neutral-800 dark:text-neutral-200 font-medium">{{ current_user.username }}</div>
                    <div class="text-sm text-neutral-600 dark:text-neutral-400">{{ current_user.email }}</div>
                </div>

                <!-- New Password Field -->
                <div class="mb-4">
                    <label for="new_password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        New Password
                    </label>
                    <div class="relative">
                        <input type="password" 
                               id="new_password" 
                               name="new_password" 
                               class="auth-input pr-10" 
                               placeholder="Enter your new password"
                               required>
                        <button type="button" 
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                                onclick="togglePasswordVisibility('new_password', this)">
                            <i class="bi bi-eye text-lg"></i>
                        </button>
                    </div>
                    <!-- Password Strength Indicator -->
                    <div class="mt-2">
                        <div class="flex space-x-1">
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                        </div>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1" id="strength-text">Enter a password</p>
                    </div>
                </div>

                <!-- Confirm Password Field -->
                <div class="mb-6">
                    <label for="confirm_password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Confirm New Password
                    </label>
                    <div class="relative">
                        <input type="password" 
                               id="confirm_password" 
                               name="confirm_password" 
                               class="auth-input pr-10" 
                               placeholder="Confirm your new password"
                               required>
                        <button type="button" 
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                                onclick="togglePasswordVisibility('confirm_password', this)">
                            <i class="bi bi-eye text-lg"></i>
                        </button>
                    </div>
                    <p class="text-xs mt-1 hidden" id="password-match-error">Passwords do not match</p>
                </div>

                <!-- Update Button -->
                <button type="submit" class="auth-btn-primary w-full">
                    <i class="bi bi-shield-check mr-2"></i>
                    Update Password
                </button>

                <!-- Security Notice -->
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div class="flex items-start">
                        <i class="bi bi-info-circle text-blue-600 dark:text-blue-400 mr-2 mt-0.5 text-sm"></i>
                        <div class="text-xs">
                            <p class="font-medium text-blue-800 dark:text-blue-200 mb-1">Security Requirement</p>
                            <p class="text-blue-700 dark:text-blue-300">
                                Your temporary password will be invalidated once you set a new password.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function openPasswordChangeModal() {
    document.getElementById('password-change-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Password strength validation
document.getElementById('new_password').addEventListener('input', function(e) {
    const password = e.target.value;
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('strength-text');
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    strengthBars.forEach((bar, index) => {
        if (index < strength) {
            bar.className = 'strength-bar ' + ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strength - 1];
        } else {
            bar.className = 'strength-bar bg-neutral-200 dark:bg-neutral-600';
        }
    });
    
    const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong'];
    strengthText.textContent = password.length ? strengthTexts[strength - 1] || 'Very Weak' : 'Enter a password';
    strengthText.className = 'text-xs mt-1 ' + ['text-red-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'][strength - 1] || 'text-red-500';
});

// Password confirmation validation
document.getElementById('confirm_password').addEventListener('input', function(e) {
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = e.target.value;
    const errorElement = document.getElementById('password-match-error');
    
    if (confirmPassword && newPassword !== confirmPassword) {
        errorElement.classList.remove('hidden');
        errorElement.className = 'text-xs mt-1 text-red-500';
        e.target.classList.add('border-red-500', 'dark:border-red-400');
    } else {
        errorElement.classList.add('hidden');
        e.target.classList.remove('border-red-500', 'dark:border-red-400');
    }
});

// Auto-open modal if user logged in with temporary password
if (document.body.dataset.tempPassword === 'true') {
    openPasswordChangeModal();
}
</script>
```

### 2. Admin Dashboard Card Addition

Add this card to `templates/admin/admin_dashboard.html` to show pending password reset requests:

```html
<!-- Password Reset Requests Card -->
<div class="dashboard-card">
    <div class="flex items-center justify-between mb-4">
        <h3 class="card-title">
            <i class="bi bi-key mr-2"></i>
            Password Reset Requests
        </h3>
        <span class="badge-warning">{{ pending_requests|length }} pending</span>
    </div>
    
    {% if pending_requests %}
        <div class="space-y-3 max-h-64 overflow-y-auto">
            {% for request in pending_requests %}
            <div class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <div>
                    <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ request.username }}</p>
                    <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ request.email }}</p>
                    <p class="text-xs text-neutral-500 dark:text-neutral-500">
                        Requested: {{ request.requested_at.strftime('%Y-%m-%d %H:%M') }}
                    </p>
                </div>
                <div class="flex space-x-2">
                    <form method="POST" action="{{ url_for('passwordreset.approve_password_reset') }}" class="inline">
                        <input type="hidden" name="request_id" value="{{ request.id }}">
                        <button type="submit" class="btn-sm btn-success">
                            <i class="bi bi-check-lg mr-1"></i>
                            Approve
                        </button>
                    </form>
                    <form method="POST" action="{{ url_for('passwordreset.deny_password_reset') }}" class="inline">
                        <input type="hidden" name="request_id" value="{{ request.id }}">
                        <button type="submit" class="btn-sm btn-danger">
                            <i class="bi bi-x-lg mr-1"></i>
                            Deny
                        </button>
                    </form>
                </div>
            </div>
            {% endfor %}
        </div>
    {% else %}
        <div class="text-center py-8">
            <i class="bi bi-check-circle text-4xl text-green-500 dark:text-green-400 mb-3"></i>
            <p class="text-neutral-600 dark:text-neutral-400">No pending password reset requests</p>
        </div>
    {% endif %}
</div>

<!-- Original User Management Card for direct password resets -->
<div class="dashboard-card">

```html
<!-- Reset Password Card -->
<div class="admin-card">
    <div class="admin-card-header">
        <h3><i class="bi bi-key"></i> Reset Password</h3>
        <p>Reset user passwords directly</p>
    </div>
    
    <div class="admin-card-content">
        <form method="POST" action="{{ url_for('passwordreset.admin_direct_reset') }}">
            <div class="form-group">
                <label for="reset_user_select">Select User</label>
                <select name="user_id" id="reset_user_select" class="admin-input" required>
                    <option value="">Choose a user...</option>
                    {% for user in users %}
                    <option value="{{ user.id }}">{{ user.username }} ({{ user.email }})</option>
                    {% endfor %}
                </select>
            </div>
            
            <div class="form-group">
                <label for="new_password">New Password</label>
                <div class="relative">
                    <input type="password" name="new_password" id="new_password" 
                           class="admin-input" required minlength="6"
                           placeholder="Enter new password">
                    <button type="button" class="password-toggle" onclick="togglePassword('new_password')">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
            
            <button type="submit" class="admin-btn-primary">
                <i class="bi bi-key mr-2"></i>
                Reset Password
            </button>
        </form>
    </div>
</div>
```

### 3. User Password Reset Confirmation Methods

When an admin resets a user's password, the user is automatically notified via email:

**Email Notification Function**

Add this email notification function to your email service:

```python
def send_password_reset_notification(user_email, username, new_password):
    """Send password reset confirmation to user"""
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
                <li>Please change this password after logging in</li>
                <li>Keep this password secure and don't share it</li>
                <li>Delete this email after saving your password</li>
            </ul>
        </div>
        
        <p>You can now log in to TruthGuard using your new password:</p>
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
    
    # Send the email
    send_email(user_email, subject, html_body)
```

### 4. Backend Routes

**Create dedicated `routes/passwordreset_routes.py` for all password reset functionality:**

```python
from flask import Blueprint, request, render_template, redirect, url_for, flash, session
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from database import DatabaseService
from services.email_service import send_password_reset_notification
import secrets
import string

# Create blueprint
passwordreset_bp = Blueprint('passwordreset', __name__, url_prefix='/passwordreset')

# Helper function to generate secure temporary password
def generate_temp_password():
    """Generate a secure temporary password"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(12))

@passwordreset_bp.route('/request', methods=['POST'])
def request_password_reset():
    """User submits password reset request"""
    user_identifier = request.form.get('user_identifier')
    
    if not user_identifier:
        flash('Please enter your username or email', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        db = DatabaseService()
        
        # Check if user exists
        user = db.get_user_by_username_or_email(user_identifier)
        if not user:
            # Don't reveal if user exists or not for security
            flash('If the account exists, administrators have been notified of your request', 'info')
            return redirect(url_for('auth.login'))
        
        # Create password reset request
        reset_request = {
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'requested_at': datetime.utcnow(),
            'status': 'pending',
            'ip_address': request.remote_addr
        }
        
        db.create_password_reset_request(reset_request)
        
        flash('Password reset request submitted. Administrators will process your request and send you an email with instructions.', 'success')
        
    except Exception as e:
        print(f"Password reset request error: {e}")
        flash('An error occurred. Please try again later.', 'error')
    
    return redirect(url_for('auth.login'))

@passwordreset_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    """Direct password reset from email link"""
    
    if request.method == 'GET':
        token = request.args.get('token')
        
        if not token:
            flash('Invalid or missing reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Parse token (username_temppassword format)
        try:
            username, temp_password = token.split('_', 1)
        except ValueError:
            flash('Invalid reset token format', 'error')
            return redirect(url_for('auth.login'))
        
        # Verify user exists and has this temporary password
        try:
            db = DatabaseService()
            user = db.get_user_by_username(username)
            
            if not user:
                flash('Invalid reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Verify temporary password matches
            if not check_password_hash(user['password_hash'], temp_password):
                flash('Invalid or expired reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Check if password is marked as temporary
            if not db.is_temporary_password(user['id']):
                flash('This reset link has already been used', 'error')
                return redirect(url_for('auth.login'))
            
            # Render password reset page with user info
            return render_template('auth/reset_password.html', 
                                 user_data={'username': user['username'], 'email': user['email']},
                                 token=token)
                                 
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
    
    if len(new_password) < 8:
        flash('Password must be at least 8 characters long', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))
    
    try:
        # Parse token again
        username, temp_password = token.split('_', 1)
        
        db = DatabaseService()
        user = db.get_user_by_username(username)
        
        if not user or not db.is_temporary_password(user['id']):
            flash('Invalid or expired reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Update password and remove temporary flag
        password_hash = generate_password_hash(new_password)
        success = db.update_user_password(user['id'], password_hash, is_temporary=False)
        
        if success:
            # Update timestamp
            db.update_password_reset_timestamp(user['id'])
            
            # Auto-login the user
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            
            flash('Password updated successfully! You are now logged in.', 'success')
            return redirect(url_for('main.home'))
        else:
            flash('Failed to update password', 'error')
            return redirect(url_for('passwordreset.reset_password', token=token))
            
    except Exception as e:
        print(f"Password update error: {e}")
        flash('An error occurred while updating password', 'error')
        return redirect(url_for('passwordreset.reset_password', token=token))

# Admin routes for password reset management
@passwordreset_bp.route('/admin/approve', methods=['POST'])
def approve_password_reset():
    """Admin approves password reset request"""
    # Check admin permission
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Admin access required', 'error')
        return redirect(url_for('auth.login'))
    
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request or reset_request['status'] != 'pending':
            flash('Request not found or already processed', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Generate temporary password
        temp_password = generate_temp_password()
        
        # Update user password
        password_hash = generate_password_hash(temp_password)
        user_updated = db.update_user_password(reset_request['user_id'], password_hash, is_temporary=True)
        
        if user_updated:
            # Mark request as approved
            db.update_password_reset_request(request_id, 'approved')
            
            # Send email notification
            email_sent = send_password_reset_notification(
                reset_request['email'], 
                reset_request['username'], 
                temp_password
            )
            
            # Log admin action
            admin_id = session.get('user_id')
            db.log_admin_action(admin_id, 'approve_password_reset', f"Approved reset for: {reset_request['username']}")
            
            if email_sent:
                flash(f"Password reset approved for {reset_request['username']} and email sent", 'success')
            else:
                flash(f"Password reset approved but email failed for {reset_request['username']}", 'warning')
        else:
            flash('Failed to reset password', 'error')
            
    except Exception as e:
        print(f"Password reset approval error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.dashboard'))

@passwordreset_bp.route('/admin/deny', methods=['POST'])
def deny_password_reset():
    """Admin denies password reset request"""
    # Check admin permission
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Admin access required', 'error')
        return redirect(url_for('auth.login'))
    
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request or reset_request['status'] != 'pending':
            flash('Request not found or already processed', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Mark request as denied
        db.update_password_reset_request(request_id, 'denied')
        
        # Log admin action
        admin_id = session.get('user_id')
        db.log_admin_action(admin_id, 'deny_password_reset', f"Denied reset for: {reset_request['username']}")
        
        flash(f"Password reset request denied for {reset_request['username']}", 'info')
        
    except Exception as e:
        print(f"Password reset denial error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.dashboard'))

@passwordreset_bp.route('/admin/direct-reset', methods=['POST'])
def admin_direct_reset():
    """Admin directly resets a user's password (original functionality)"""
    # Check admin permission
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Admin access required', 'error')
        return redirect(url_for('auth.login'))
    
    user_id = request.form.get('user_id')
    new_password = request.form.get('new_password')
    
    if not user_id or not new_password:
        flash('Please select a user and enter a new password', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get user info
        user = db.get_user_by_id(user_id)
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Hash the new password
        password_hash = generate_password_hash(new_password)
        
        # Update password
        success = db.update_user_password(user_id, password_hash, is_temporary=True)
        
        if success:
            # Log the action
            admin_id = session.get('user_id')
            db.log_admin_action(admin_id, 'direct_password_reset', f"Direct reset password for user: {user['username']}")
            
            # Send email notification to user
            email_sent = send_password_reset_notification(user['email'], user['username'], new_password)
            
            if email_sent:
                flash(f"Password reset for {user['username']} and notification email sent successfully", 'success')
            else:
                flash(f"Password reset for {user['username']} completed, but email notification failed", 'warning')
        else:
            flash('Failed to reset password', 'error')
            
    except Exception as e:
        print(f"Password reset error: {e}")
        flash('An error occurred while resetting the password', 'error')
    
    return redirect(url_for('admin.dashboard'))
```

**Register the blueprint in your main app file (`app.py` or `web_app.py`):**

```python
# Import the blueprint
from routes.passwordreset_routes import passwordreset_bp

# Register the blueprint
app.register_blueprint(passwordreset_bp)
```

**Note:** This consolidated approach replaces the previous scattered routes in `main_routes.py`, `admin_routes.py`, and `auth_routes.py`. All password reset functionality is now centralized in `passwordreset_routes.py` for better maintainability and consistency.

```python
@admin_bp.route('/reset-password', methods=['POST'])
@require_admin
def reset_password():
    """Admin resets a user's password"""
    user_id = request.form.get('user_id')
    new_password = request.form.get('new_password')
    
    if not user_id or not new_password:
        flash('Please select a user and enter a new password', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get user info
        user = db.get_user_by_id(user_id)
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Hash the new password
        password_hash = generate_password_hash(new_password)
        
        # Update password
        success = db.update_user_password(user_id, password_hash)
        
        if success:
            # Log the action
            admin_id = session.get('user_id')
            db.log_admin_action(admin_id, 'reset_password', f"Reset password for user: {user['username']}")
            
            # Send email notification to user
            try:
                send_password_reset_notification(user['email'], user['username'], new_password)
                flash(f"Password reset for {user['username']} and notification email sent", 'success')
            except Exception as e:
                print(f"Email notification failed: {e}")
                flash(f"Password reset for {user['username']} (email notification failed)", 'warning')
        else:
            flash('Failed to reset password', 'error')
            
    except Exception as e:
        print(f"Password reset error: {e}")
        flash('An error occurred while resetting the password', 'error')
    
    return redirect(url_for('admin.dashboard'))
```

**Add approve/deny routes to `routes/admin_routes.py`:**

```python
@admin_bp.route('/approve-password-reset', methods=['POST'])
@require_admin
def approve_password_reset():
    """Admin approves password reset request"""
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request or reset_request['status'] != 'pending':
            flash('Request not found or already processed', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Generate temporary password
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(12))
        
        # Update user password
        password_hash = generate_password_hash(temp_password)
        user_updated = db.update_user_password(reset_request['user_id'], password_hash, is_temporary=True)
        
        if user_updated:
            # Mark request as approved
            db.update_password_reset_request(request_id, 'approved')
            
            # Send email notification
            from services.email_service import send_password_reset_notification
            email_sent = send_password_reset_notification(
                reset_request['email'], 
                reset_request['username'], 
                temp_password
            )
            
            # Log admin action
            admin_id = session.get('user_id')
            db.log_admin_action(admin_id, 'approve_password_reset', f"Approved reset for: {reset_request['username']}")
            
            if email_sent:
                flash(f"Password reset approved for {reset_request['username']} and email sent", 'success')
            else:
                flash(f"Password reset approved but email failed for {reset_request['username']}", 'warning')
        else:
            flash('Failed to reset password', 'error')
            
    except Exception as e:
        print(f"Password reset approval error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/deny-password-reset', methods=['POST'])
@require_admin
def deny_password_reset():
    """Admin denies password reset request"""
    request_id = request.form.get('request_id')
    
    if not request_id:
        flash('Invalid request', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get the reset request
        reset_request = db.get_password_reset_request(request_id)
        if not reset_request or reset_request['status'] != 'pending':
            flash('Request not found or already processed', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Mark request as denied
        db.update_password_reset_request(request_id, 'denied')
        
        # Log admin action
        admin_id = session.get('user_id')
        db.log_admin_action(admin_id, 'deny_password_reset', f"Denied reset for: {reset_request['username']}")
        
        flash(f"Password reset request denied for {reset_request['username']}", 'info')
        
    except Exception as e:
        print(f"Password reset denial error: {e}")
        flash('An error occurred while processing the request', 'error')
    
    return redirect(url_for('admin.dashboard'))
```

### 5. Database Methods (Enhanced)

Add these methods to `database.py` for complete password reset functionality:

```python
def get_user_by_username_or_email(self, identifier):
    """Get user by username or email"""
    try:
        query = '''
            SELECT * FROM users 
            WHERE username = ? OR email = ?
        '''
        return self.fetch_one(query, (identifier, identifier))
    except Exception as e:
        print(f"Database error fetching user: {e}")
        return None

def get_user_by_username(self, username):
    """Get user by username only"""
    try:
        query = 'SELECT * FROM users WHERE username = ?'
        return self.fetch_one(query, (username,))
    except Exception as e:
        print(f"Database error fetching user by username: {e}")
        return None

def get_user_by_id(self, user_id):
    """Get user by ID"""
    try:
        query = 'SELECT * FROM users WHERE id = ?'
        return self.fetch_one(query, (user_id,))
    except Exception as e:
        print(f"Database error fetching user by ID: {e}")
        return None

```python
def update_user_password(self, user_id, password_hash, is_temporary=False):
    """Update user password with temporary flag"""
    try:
        query = '''
            UPDATE users 
            SET password_hash = ?, 
                is_temporary_password = ?,
                last_password_reset = CURRENT_TIMESTAMP
            WHERE id = ?
        '''
        
        cursor = self.execute_query(query, (password_hash, is_temporary, user_id))
        return cursor.rowcount > 0
        
    except Exception as e:
        print(f"Database error updating password: {e}")
        return False

def is_temporary_password(self, user_id):
    """Check if user has temporary password"""
    try:
        query = 'SELECT is_temporary_password FROM users WHERE id = ?'
        result = self.fetch_one(query, (user_id,))
        return result and result['is_temporary_password'] == 1
    except Exception as e:
        print(f"Database error checking temporary password: {e}")
        return False

def update_password_reset_timestamp(self, user_id):
    """Update password reset timestamp"""
    try:
        query = '''
            UPDATE users 
            SET last_password_reset = CURRENT_TIMESTAMP,
                is_temporary_password = 0
            WHERE id = ?
        '''
        cursor = self.execute_query(query, (user_id,))
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Database error updating password reset timestamp: {e}")
        return False

def create_password_reset_request(self, reset_request):
    """Create new password reset request"""
    try:
        query = '''
            INSERT INTO password_reset_requests 
            (user_id, username, email, requested_at, status, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        '''
        self.execute_query(query, (
            reset_request['user_id'],
            reset_request['username'],
            reset_request['email'],
            reset_request['requested_at'],
            reset_request['status'],
            reset_request['ip_address']
        ))
        return True
    except Exception as e:
        print(f"Database error creating reset request: {e}")
        return False

def get_password_reset_request(self, request_id):
    """Get password reset request by ID"""
    try:
        query = '''
            SELECT * FROM password_reset_requests 
            WHERE id = ?
        '''
        return self.fetch_one(query, (request_id,))
    except Exception as e:
        print(f"Database error fetching reset request: {e}")
        return None

def update_password_reset_request(self, request_id, status):
    """Update password reset request status"""
    try:
        query = '''
            UPDATE password_reset_requests 
            SET status = ?, processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        '''
        cursor = self.execute_query(query, (status, request_id))
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Database error updating reset request: {e}")
        return False

def log_admin_action(self, admin_id, action, details):
    """Log admin actions"""
    query = '''
        INSERT INTO admin_logs (admin_id, action, details, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    '''
    
    self.execute_query(query, (admin_id, action, details))
```

### 6. Database Update

Add columns to track password resets and temporary passwords:

```sql
ALTER TABLE users ADD COLUMN last_password_reset TIMESTAMP;
ALTER TABLE users ADD COLUMN is_temporary_password INTEGER DEFAULT 0;

-- Create password reset requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Complete Workflow

### User Experience
1. **User at login page** → Clicks "Forgot your password?" button
2. **Modal opens** → Shows password reset request form
3. **User enters username/email** → Submits request directly to admin dashboard
4. **Admin receives notification** → Sees pending password reset request in dashboard
5. **Admin resets password** → Uses admin dashboard to set temporary password
6. **User receives email notification** → Gets email with "Reset My Password" button
7. **User clicks email button** → Directly opens password change form (no login needed)
8. **User sets new password** → Enters new password and confirmation (with matching validation)
9. **Password updated & auto-login** → Temporary password invalidated, user logged in and directed to main application

### Admin Experience
1. **Receives password reset request** → Notification appears in admin dashboard
2. **Reviews request details** → Sees username/email from user request
3. **Opens admin dashboard** → Navigates to Password Reset Requests section
4. **Selects user** → From pending requests list
5. **Sets temporary password** → Enters secure temporary password
6. **Approves reset** → System updates password and sends email notification automatically
7. **Request completed** → User notified automatically via email

### Notification Delivery Methods

**Primary Method - Email (Automatic):**
- System automatically sends professional email with temporary password
- User receives formatted email with password and security instructions
- No manual admin communication required
- User must change password on first login with temporary password

## Benefits

### Modal Approach
- **No separate page** - keeps user on login form
- **Quick access** to help information
- **Consistent with profile** modal patterns
- **Easy to close** and return to login

### Automatic Email Notification
- **No manual communication** needed from admin
- **Professional formatting** with security instructions
- **Immediate delivery** when password is reset
- **Reduces admin workload** significantly

### User-Friendly
- **Direct password reset** from email - no manual login required
- **One-click process** from email to password change form
- **Automatic authentication** after password update
- **Clear account display** shows username/email during reset
- **Seamless workflow** from request to new password to logged-in state
- **No temporary password exposure** - handled entirely in backend

## Implementation Guide

### Step 1: Set Up Flask-Mail Email Service

**Install Flask-Mail:**
**Add Flask-Mail to requirements.txt:**
```
Flask-Mail==0.9.1
```

**Add to your main app file (app.py or web_app.py):**
```python
from flask_mail import Mail, Message
import os

# Email configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')  # Your email
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')  # App password
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@truthguard.com')

mail = Mail(app)
```

**Create email service file (`services/email_service.py`):**
```python
from flask import current_app
from flask_mail import Message
from web_app import mail  # Import from your main app file

def send_email(to_email, subject, html_body):
    """Send HTML email"""
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html_body,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_password_reset_notification(user_email, username, new_password):
    """Send password reset confirmation to user"""
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
                <li>Please change this password after logging in</li>
                <li>Keep this password secure and don't share it</li>
                <li>Delete this email after saving your password</li>
            </ul>
        </div>
        
        <p>You can now log in to TruthGuard using your new password:</p>
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
```

### 3a. Handle Reset Token with Direct Password Change

**Add new route to `routes/auth_routes.py` for direct password reset:**

```python
@auth_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    """Direct password reset from email link"""
    
    if request.method == 'GET':
        token = request.args.get('token')
        
        if not token:
            flash('Invalid or missing reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Parse token (username_temppassword format)
        try:
            username, temp_password = token.split('_', 1)
        except ValueError:
            flash('Invalid reset token format', 'error')
            return redirect(url_for('auth.login'))
        
        # Verify user exists and has this temporary password
        try:
            db = DatabaseService()
            user = db.get_user_by_username(username)
            
            if not user:
                flash('Invalid reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Verify temporary password matches
            from werkzeug.security import check_password_hash
            if not check_password_hash(user['password_hash'], temp_password):
                flash('Invalid or expired reset token', 'error')
                return redirect(url_for('auth.login'))
            
            # Check if password is marked as temporary
            if not db.is_temporary_password(user['id']):
                flash('This reset link has already been used', 'error')
                return redirect(url_for('auth.login'))
            
            # Render password reset page with user info
            return render_template('auth/reset_password.html', 
                                 user_data={'username': user['username'], 'email': user['email']},
                                 token=token)
                                 
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
        return redirect(url_for('auth.reset_password', token=token))
    
    if new_password != confirm_password:
        flash('Passwords do not match', 'error')
        return redirect(url_for('auth.reset_password', token=token))
    
    if len(new_password) < 8:
        flash('Password must be at least 8 characters long', 'error')
        return redirect(url_for('auth.reset_password', token=token))
    
    try:
        # Parse token again
        username, temp_password = token.split('_', 1)
        
        db = DatabaseService()
        user = db.get_user_by_username(username)
        
        if not user or not db.is_temporary_password(user['id']):
            flash('Invalid or expired reset token', 'error')
            return redirect(url_for('auth.login'))
        
        # Update password and remove temporary flag
        from werkzeug.security import generate_password_hash
        password_hash = generate_password_hash(new_password)
        success = db.update_user_password(user['id'], password_hash, is_temporary=False)
        
        if success:
            # Update timestamp
            db.update_password_reset_timestamp(user['id'])
            
            # Auto-login the user
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            
            flash('Password updated successfully! You are now logged in.', 'success')
            return redirect(url_for('main.home'))
        else:
            flash('Failed to update password', 'error')
            return redirect(url_for('auth.reset_password', token=token))
            
    except Exception as e:
        print(f"Password update error: {e}")
        flash('An error occurred while updating password', 'error')
        return redirect(url_for('auth.reset_password', token=token))
```

### 3b. Create Reset Password Template

**Create `templates/auth/reset_password.html`:**

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - TruthGuard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/auth/auth.css') }}">
</head>
<body class="h-full" data-theme="light">
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div class="text-center">
                <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <i class="bi bi-shield-lock text-2xl text-blue-600 dark:text-blue-400"></i>
                </div>
                <h2 class="mt-6 text-center text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    Set Your New Password
                </h2>
                <p class="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    Create a secure password for your account
                </p>
            </div>

            <!-- Flash Messages -->
            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                    <div class="space-y-2">
                        {% for category, message in messages %}
                            <div class="flash-message flash-{{ category }}">
                                <i class="bi bi-{% if category == 'error' %}exclamation-triangle{% elif category == 'success' %}check-circle{% else %}info-circle{% endif %} mr-2"></i>
                                {{ message }}
                            </div>
                        {% endfor %}
                    </div>
                {% endif %}
            {% endwith %}

            <!-- Account Info -->
            {% if user_data %}
            <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="bi bi-person-circle text-2xl text-neutral-500 dark:text-neutral-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">{{ user_data.username }}</p>
                        <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ user_data.email }}</p>
                    </div>
                </div>
            </div>
            {% endif %}

            <!-- Password Reset Form -->
            <form method="POST" action="{{ url_for('passwordreset.reset_password') }}" class="mt-8 space-y-6">
                <input type="hidden" name="token" value="{{ token }}">
                
                <!-- New Password -->
                <div>
                    <label for="new_password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        New Password
                    </label>
                    <div class="relative">
                        <input type="password" 
                               id="new_password" 
                               name="new_password" 
                               class="auth-input pr-10" 
                               placeholder="Enter your new password"
                               required>
                        <button type="button" 
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                                onclick="togglePasswordVisibility('new_password', this)">
                            <i class="bi bi-eye text-lg"></i>
                        </button>
                    </div>
                    <!-- Password Strength Indicator -->
                    <div class="mt-2">
                        <div class="flex space-x-1">
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                            <div class="strength-bar bg-neutral-200 dark:bg-neutral-600"></div>
                        </div>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1" id="strength-text">Enter a password</p>
                    </div>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirm_password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Confirm New Password
                    </label>
                    <div class="relative">
                        <input type="password" 
                               id="confirm_password" 
                               name="confirm_password" 
                               class="auth-input pr-10" 
                               placeholder="Confirm your new password"
                               required>
                        <button type="button" 
                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                                onclick="togglePasswordVisibility('confirm_password', this)">
                            <i class="bi bi-eye text-lg"></i>
                        </button>
                    </div>
                    <p class="text-xs mt-1 hidden text-red-500" id="password-match-error">Passwords do not match</p>
                </div>

                <!-- Submit Button -->
                <div>
                    <button type="submit" class="auth-btn-primary w-full">
                        <i class="bi bi-shield-check mr-2"></i>
                        Update Password & Login
                    </button>
                </div>

                <!-- Security Notice -->
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div class="flex items-start">
                        <i class="bi bi-info-circle text-blue-600 dark:text-blue-400 mr-2 mt-0.5 text-sm"></i>
                        <div class="text-xs">
                            <p class="font-medium text-blue-800 dark:text-blue-200 mb-1">Secure Password Tips</p>
                            <ul class="text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                                <li>Use at least 8 characters</li>
                                <li>Include uppercase and lowercase letters</li>
                                <li>Add numbers and special characters</li>
                                <li>Avoid common words or personal information</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Password visibility toggle
        function togglePasswordVisibility(inputId, button) {
            const input = document.getElementById(inputId);
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'bi bi-eye-slash text-lg';
            } else {
                input.type = 'password';
                icon.className = 'bi bi-eye text-lg';
            }
        }

        // Password strength validation
        document.getElementById('new_password').addEventListener('input', function(e) {
            const password = e.target.value;
            const strengthBars = document.querySelectorAll('.strength-bar');
            const strengthText = document.getElementById('strength-text');
            
            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            strengthBars.forEach((bar, index) => {
                if (index < strength) {
                    bar.className = 'strength-bar ' + ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strength - 1];
                } else {
                    bar.className = 'strength-bar bg-neutral-200 dark:bg-neutral-600';
                }
            });
            
            const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong'];
            strengthText.textContent = password.length ? strengthTexts[strength - 1] || 'Very Weak' : 'Enter a password';
            strengthText.className = 'text-xs mt-1 ' + ['text-red-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'][strength - 1] || 'text-red-500';
        });

        // Password confirmation validation
        document.getElementById('confirm_password').addEventListener('input', function(e) {
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = e.target.value;
            const errorElement = document.getElementById('password-match-error');
            
            if (confirmPassword && newPassword !== confirmPassword) {
                errorElement.classList.remove('hidden');
                e.target.classList.add('border-red-500', 'dark:border-red-400');
            } else {
                errorElement.classList.add('hidden');
                e.target.classList.remove('border-red-500', 'dark:border-red-400');
            }
        });
    </script>
</body>
</html>
```

### 3c. Update Login Route (Simplified)

**Simplify the `routes/auth_routes.py` login route:**

```python
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login - simplified version"""
    if request.method == 'GET':
        return render_template('auth/login.html')
    
    # Handle POST (login submission)
    username = request.form.get('username')
    password = request.form.get('password')
    
    if not username or not password:
        flash('Please fill in all fields', 'error')
        return render_template('auth/login.html')
    
    try:
        db = DatabaseService()
        user = db.authenticate_user(username, password)
        
        if user:
            # Check if user has temporary password - redirect to reset
            if db.is_temporary_password(user['id']):
                flash('Please use the password reset link sent to your email', 'info')
                return render_template('auth/login.html')
            
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            
            flash(f'Welcome back, {user["username"]}!', 'success')
            return redirect(url_for('main.home'))
        else:
            flash('Invalid username or password', 'error')
            return render_template('auth/login.html')
            
    except Exception as e:
        print(f"Login error: {e}")
        flash('An error occurred during login', 'error')
        return render_template('auth/login.html')
```

### Step 2: Environment Variables Setup

**Create/Update `.env` file in your project root:**
```bash
# Email configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # Use App Password for Gmail
MAIL_DEFAULT_SENDER=noreply@truthguard.com
```

**For Gmail setup:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App Passwords
3. Use the generated 16-character password in `MAIL_PASSWORD`

### Step 3: Update Admin Route

**In `routes/admin_routes.py`, add the import and update the route:**
```python
from services.email_service import send_password_reset_notification

@admin_bp.route('/reset-password', methods=['POST'])
@require_admin
def reset_password():
    """Admin resets a user's password"""
    user_id = request.form.get('user_id')
    new_password = request.form.get('new_password')
    
    if not user_id or not new_password:
        flash('Please select a user and enter a new password', 'error')
        return redirect(url_for('admin.dashboard'))
    
    try:
        db = DatabaseService()
        
        # Get user info
        user = db.get_user_by_id(user_id)
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('admin.dashboard'))
        
        # Hash the new password
        password_hash = generate_password_hash(new_password)
        
        # Update password
        success = db.update_user_password(user_id, password_hash)
        
        if success:
            # Log the action
            admin_id = session.get('user_id')
            db.log_admin_action(admin_id, 'reset_password', f"Reset password for user: {user['username']}")
            
            # Send email notification to user
            email_sent = send_password_reset_notification(user['email'], user['username'], new_password)
            
            if email_sent:
                flash(f"Password reset for {user['username']} and notification email sent successfully", 'success')
            else:
                flash(f"Password reset for {user['username']} completed, but email notification failed", 'warning')
        else:
            flash('Failed to reset password', 'error')
            
    except Exception as e:
        print(f"Password reset error: {e}")
        flash('An error occurred while resetting the password', 'error')
    
    return redirect(url_for('admin.dashboard'))
```

### Step 4: Testing the Email System

**Create a test script (`test_email.py`):**
```python
from services.email_service import send_password_reset_notification

# Test the email function
test_result = send_password_reset_notification(
    "test-user@example.com", 
    "testuser", 
    "TempPassword123!"
)

if test_result:
    print("Test email sent successfully!")
else:
    print("Test email failed to send.")
```

### Step 5: Deployment Considerations

**For production deployment:**
1. **Use environment variables** for all email credentials
2. **Use a professional email service** (SendGrid, AWS SES, etc.)
3. **Update the login URL** in the email template from localhost to your domain
4. **Set up proper DNS records** (SPF, DKIM) for email deliverability

**Example production email configuration:**
```python
# For SendGrid
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key

# For AWS SES
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-ses-username
MAIL_PASSWORD=your-ses-password
```

This implementation will provide automatic email notifications when admins reset user passwords, making the forgot password workflow completely seamless!