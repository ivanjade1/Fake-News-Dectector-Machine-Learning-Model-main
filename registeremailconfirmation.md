# Email Confirmation Registration Implementation

## Overview

This document outlines the implementation of email confirmation for account registration, ensuring that only legitimate email addresses can create accounts. The system uses Flask-Mail with secure tokens similar to the existing password reset system.

## Flow Description

### User Experience Flow
1. **Registration Submission**: User fills out registration form and submits
2. **Loading Modal**: "Awaiting Email Confirmation" modal appears (similar to detector analysis modal)
3. **Email Sent**: Confirmation email sent to provided email address with verification link
4. **Email Verification**: User clicks link in email to verify their email address
5. **Account Activation**: 
   - **Success**: Account activated, user automatically logged in, redirected to detector
   - **Failure**: Invalid/expired token shows error message in modal

### Technical Flow
1. User submits registration form
2. System validates form data (existing validation)
3. Instead of immediately creating account, system:
   - Stores registration data temporarily (session or temporary token)
   - Generates secure email confirmation token
   - Sends confirmation email with verification link
   - Shows loading modal with "Awaiting Email Confirmation" message
4. User clicks email verification link
5. System verifies token and creates account if valid
6. User is logged in and redirected to detector

## Implementation Components

### 1. Token System (Based on Password Reset Implementation)

**File**: `routes/auth_routes.py` or new `routes/email_confirmation.py`

```python
# Token generation and verification functions (similar to password reset)
def generate_email_confirmation_token(email, registration_data):
    """Generate secure token for email confirmation"""
    timestamp = str(int(time.time()))
    secret_key = secrets.token_urlsafe(32)
    token_data = f"{email}:{timestamp}"
    token_hash = hashlib.sha256(f"{token_data}:{secret_key}".encode()).hexdigest()
    return f"{timestamp}.{token_hash}.{secret_key}", registration_data

def verify_email_confirmation_token(token, email, max_age_hours=24):
    """Verify email confirmation token (valid for 24 hours)"""
    # Similar to verify_reset_token implementation
    pass
```

### 2. Email Service Enhancement

**File**: `services/email_service.py`

```python
def send_email_confirmation(email, username, confirmation_token):
    """
    Send email confirmation link to user
    
    Args:
        email: User's email address
        username: Chosen username
        confirmation_token: Secure token for email verification
    
    Returns:
        bool: True if email sent successfully
    """
    
    subject = "Confirm Your Email - TruthGuard Registration"
    confirmation_url = f"http://localhost:5000/auth/confirm-email?token={confirmation_token}"
    
    html_body = f"""
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px;">
            <h2 style="color: #333; margin: 0;">Email Confirmation Required</h2>
        </div>
        
        <div style="padding: 30px; background: white;">
            <p>Hello <strong>{username}</strong>,</p>
            
            <p>Thank you for registering with TruthGuard! To complete your account setup, please confirm your email address by clicking the button below.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{confirmation_url}" 
                   style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Confirm Email Address
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">This link will expire in 24 hours</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Security Information:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                    <li>This link is valid for 24 hours only</li>
                    <li>Your account will be created after email confirmation</li>
                    <li>You'll be automatically logged in after confirmation</li>
                </ul>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px;">
            If you didn't create a TruthGuard account, you can safely ignore this email.
            <br><br>
            <strong>TruthGuard</strong> - Advanced Fact-Checking Platform
        </div>
    </div>
    """
    
    return send_email(email, subject, html_body)
```

### 3. Registration Form Modification

**File**: `templates/auth/register.html`

Add email confirmation modal (similar to detector analysis modal):

```html
<!-- Email Confirmation Modal -->
<div id="emailConfirmationModal" class="fixed inset-0 modal-backdrop z-50 hidden">
  <div class="modal-card w-full max-w-md overflow-hidden flex flex-col">
    <div class="modal-header">
      <div class="flex items-center gap-3">
        <div class="method-icon bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <i class="bi bi-envelope-check"></i>
        </div>
        <span id="confirmationModalTitle">Email Confirmation Required</span>
      </div>
    </div>
    
    <!-- Modal Content -->
    <div id="confirmationModalContent" class="p-6 text-center">
      <!-- Loading State -->
      <div id="confirmationLoading" class="mb-4">
        <div class="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-neutral-200 border-t-indigo-600 animate-spin dark:border-neutral-700 dark:border-t-indigo-400"></div>
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Awaiting Email Confirmation</h3>
        <p class="text-neutral-600 dark:text-neutral-400 mb-4">
          <span id="confirmationStatus">We've sent a confirmation email to your address. Please check your inbox and click the verification link.</span>
        </p>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <div class="flex items-center justify-center mb-2">
            <i class="bi bi-envelope text-blue-600 dark:text-blue-400 text-2xl"></i>
          </div>
          <p class="text-sm text-blue-800 dark:text-blue-200" id="confirmationEmail">user@example.com</p>
        </div>
      </div>
      
      <!-- Success State -->
      <div id="confirmationSuccess" class="hidden">
        <div class="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <i class="bi bi-check-circle text-green-600 dark:text-green-400 text-2xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Email Confirmed!</h3>
        <p class="text-neutral-600 dark:text-neutral-400 mb-4">Your account has been created successfully. Redirecting to detector...</p>
      </div>
      
      <!-- Error State -->
      <div id="confirmationError" class="hidden">
        <div class="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <i class="bi bi-exclamation-circle text-red-600 dark:text-red-400 text-2xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Verification Failed</h3>
        <p class="text-red-600 dark:text-red-400 mb-4" id="confirmationErrorMessage">Invalid or expired confirmation link.</p>
        <button onclick="closeEmailConfirmationModal()" class="auth-btn-secondary">Try Again</button>
      </div>
    </div>
  </div>
</div>
```

### 4. JavaScript Enhancement

**File**: `templates/auth/register.html` (script section)

```javascript
// Email confirmation modal functions
function showEmailConfirmationModal(email) {
  const modal = document.getElementById('emailConfirmationModal');
  const emailSpan = document.getElementById('confirmationEmail');
  emailSpan.textContent = email;
  
  // Reset modal state
  document.getElementById('confirmationLoading').style.display = 'block';
  document.getElementById('confirmationSuccess').style.display = 'none';
  document.getElementById('confirmationError').style.display = 'none';
  
  modal.classList.remove('hidden');
  
  // Start polling for email confirmation (optional - for real-time updates)
  startEmailConfirmationPolling();
}

function closeEmailConfirmationModal() {
  const modal = document.getElementById('emailConfirmationModal');
  modal.classList.add('hidden');
  stopEmailConfirmationPolling();
}

function showEmailConfirmationSuccess() {
  document.getElementById('confirmationLoading').style.display = 'none';
  document.getElementById('confirmationSuccess').style.display = 'block';
  
  // Auto-redirect after 2 seconds
  setTimeout(() => {
    window.location.href = '/detector';
  }, 2000);
}

function showEmailConfirmationError(message) {
  document.getElementById('confirmationLoading').style.display = 'none';
  document.getElementById('confirmationError').style.display = 'block';
  document.getElementById('confirmationErrorMessage').textContent = message;
}

// Modified form submission
form.addEventListener('submit', function (e) {
  e.preventDefault(); // Always prevent default to handle email confirmation
  
  validateAll();
  if (!Object.values(state).every(Boolean)) {
    return;
  }
  
  const btn = document.getElementById('registerBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>Sending Confirmation...';
  btn.disabled = true;
  
  // Submit registration with email confirmation
  const formData = new FormData(form);
  
  fetch('/auth/register-with-confirmation', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showEmailConfirmationModal(formData.get('email'));
    } else {
      // Handle registration errors
      alert(data.error || 'Registration failed');
      btn.innerHTML = '<i class="bi bi-person-plus mr-2"></i>Create Account';
      btn.disabled = false;
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
    btn.innerHTML = '<i class="bi bi-person-plus mr-2"></i>Create Account';
    btn.disabled = false;
  });
});
```

### 5. Route Implementation

**File**: `routes/auth_routes.py`

```python
@auth_bp.route('/register-with-confirmation', methods=['POST'])
def register_with_confirmation():
    """Handle registration with email confirmation"""
    
    # Validate form data (existing validation logic)
    username = request.form.get('username', '').strip()
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')
    confirm_password = request.form.get('confirm_password', '')
    
    # Perform all existing validations
    errors = validate_registration_data(username, email, password, confirm_password)
    
    if errors:
        return jsonify({'success': False, 'error': errors[0]})
    
    try:
        # Store registration data temporarily in session
        registration_data = {
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password),
            'timestamp': time.time()
        }
        
        # Generate confirmation token
        token = generate_email_confirmation_token(email, registration_data)
        
        # Store token and data in session (or use Redis/database for production)
        session[f'registration_token_{token}'] = registration_data
        
        # Send confirmation email
        email_sent = send_email_confirmation(email, username, token)
        
        if email_sent:
            return jsonify({
                'success': True, 
                'message': 'Confirmation email sent. Please check your inbox.'
            })
        else:
            return jsonify({
                'success': False, 
                'error': 'Failed to send confirmation email. Please try again.'
            })
            
    except Exception as e:
        print(f"Registration confirmation error: {e}")
        return jsonify({
            'success': False, 
            'error': 'An error occurred during registration. Please try again.'
        })

@auth_bp.route('/confirm-email')
def confirm_email():
    """Handle email confirmation from link"""
    token = request.args.get('token')
    
    if not token:
        flash('Invalid confirmation link', 'error')
        return redirect(url_for('auth.register'))
    
    try:
        # Retrieve registration data from session
        registration_data = session.get(f'registration_token_{token}')
        
        if not registration_data:
            flash('Invalid or expired confirmation link', 'error')
            return redirect(url_for('auth.register'))
        
        # Check if token is still valid (24 hours)
        if time.time() - registration_data['timestamp'] > (24 * 3600):
            session.pop(f'registration_token_{token}', None)
            flash('Confirmation link has expired. Please register again.', 'error')
            return redirect(url_for('auth.register'))
        
        # Create user account
        db = DatabaseService()
        user_id = db.create_user(
            registration_data['username'],
            registration_data['email'],
            registration_data['password_hash']
        )
        
        if user_id:
            # Clean up session
            session.pop(f'registration_token_{token}', None)
            
            # Auto-login user
            session['user_id'] = user_id
            session['username'] = registration_data['username']
            session['email'] = registration_data['email']
            session['user_role'] = 'user'
            
            flash('Email confirmed! Your account has been created successfully.', 'success')
            return redirect(url_for('main.detector_page'))
        else:
            flash('Failed to create account. Please try again.', 'error')
            return redirect(url_for('auth.register'))
            
    except Exception as e:
        print(f"Email confirmation error: {e}")
        flash('An error occurred during confirmation. Please try again.', 'error')
        return redirect(url_for('auth.register'))
```

### 6. Optional: Real-time Status Polling

**File**: `templates/auth/register.html` (script section)

```javascript
let confirmationPollingInterval;

function startEmailConfirmationPolling() {
  // Poll server every 5 seconds to check if email was confirmed
  confirmationPollingInterval = setInterval(() => {
    fetch('/auth/check-confirmation-status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token: getCurrentConfirmationToken()})
    })
    .then(response => response.json())
    .then(data => {
      if (data.confirmed) {
        stopEmailConfirmationPolling();
        showEmailConfirmationSuccess();
      } else if (data.expired) {
        stopEmailConfirmationPolling();
        showEmailConfirmationError('Confirmation link has expired');
      }
    })
    .catch(error => console.error('Polling error:', error));
  }, 5000);
}

function stopEmailConfirmationPolling() {
  if (confirmationPollingInterval) {
    clearInterval(confirmationPollingInterval);
    confirmationPollingInterval = null;
  }
}
```

## Security Considerations

1. **Token Expiration**: Confirmation tokens expire after 24 hours
2. **Single Use**: Tokens are deleted after successful use
3. **Session Storage**: Registration data stored temporarily in session (consider Redis for production)
4. **Email Validation**: Comprehensive email format validation
5. **Rate Limiting**: Consider implementing rate limiting for confirmation email sending

## Database Considerations

**Note**: As requested, no database schema changes are needed. The implementation uses:
- Session storage for temporary registration data
- Existing user creation flow after email confirmation
- Existing email service infrastructure

## Integration Points

1. **Existing Registration Route**: Modify to use new confirmation flow
2. **Email Service**: Extend existing service with confirmation template
3. **Token System**: Reuse password reset token generation pattern
4. **Modal System**: Reuse detector analysis modal pattern
5. **Validation**: Use existing form validation logic

## Testing Scenarios

1. **Happy Path**: User registers → receives email → clicks link → account created → logged in
2. **Expired Token**: User waits >24 hours before clicking link
3. **Invalid Token**: User uses malformed or non-existent token
4. **Email Failure**: SMTP service unavailable during registration
5. **Duplicate Registration**: User tries to register with existing email/username
6. **Browser Refresh**: User refreshes page during confirmation process

## Configuration Requirements

**File**: `app.py` or configuration file

```python
# Flask-Mail configuration (already exists for password reset)
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = 'your-email@gmail.com'
MAIL_PASSWORD = 'your-app-password'
MAIL_DEFAULT_SENDER = 'TruthGuard <noreply@truthguard.com>'

# Session configuration for token storage
SECRET_KEY = 'your-secret-key'
PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
```

This implementation provides a secure, user-friendly email confirmation system that integrates seamlessly with the existing codebase while maintaining the current UI/UX patterns.
