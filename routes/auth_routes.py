from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
import re
import secrets
import string
import hashlib
import time
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from database import DatabaseService, PHILIPPINE_TZ
from services.email_service import send_email

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def convert_to_pht(datetime_obj):
    """Convert datetime to Philippine Time (UTC+8)"""
    if datetime_obj is None:
        return None
    
    # If it's a string, parse it first
    if isinstance(datetime_obj, str):
        try:
            # Try parsing ISO format from Supabase
            if 'T' in datetime_obj:
                # Remove timezone info if present and parse
                datetime_str = datetime_obj.replace('Z', '').split('+')[0].split('-')[0:3]
                datetime_str = '-'.join(datetime_str[0:3]) + 'T' + datetime_str[3] if len(datetime_str) > 3 else datetime_obj.replace('Z', '').split('+')[0]
                datetime_obj = datetime.fromisoformat(datetime_str.replace('Z', ''))
            else:
                # Try other common formats
                datetime_obj = datetime.strptime(datetime_obj, '%Y-%m-%d %H:%M:%S')
        except (ValueError, AttributeError) as e:
            print(f"Warning: Could not parse datetime string '{datetime_obj}': {e}")
            return datetime_obj  # Return original string if parsing fails
    
    # If datetime already has Philippine timezone info, return as is
    if hasattr(datetime_obj, 'tzinfo') and datetime_obj.tzinfo is not None and datetime_obj.tzinfo == PHILIPPINE_TZ:
        return datetime_obj
    
    # If datetime is naive (no timezone info), assume it's already in Philippine time
    # since our database now stores times in Philippine timezone
    if hasattr(datetime_obj, 'tzinfo') and datetime_obj.tzinfo is None:
        return datetime_obj.replace(tzinfo=PHILIPPINE_TZ)
    
    # If it has different timezone info, convert to Philippine time
    if hasattr(datetime_obj, 'astimezone'):
        return datetime_obj.astimezone(PHILIPPINE_TZ)
    
    # If we get here, it's probably still a string that couldn't be parsed
    return datetime_obj

@auth_bp.app_template_filter('pht')
def pht_filter(datetime_obj):
    """Template filter to convert datetime to Philippine Time"""
    pht_datetime = convert_to_pht(datetime_obj)
    if pht_datetime:
        return pht_datetime.strftime('%B %d, %Y at %I:%M %p PHT')
    return None

@auth_bp.app_template_filter('pht_date')
def pht_date_filter(datetime_obj):
    """Template filter to convert datetime to Philippine Time (date only)"""
    pht_datetime = convert_to_pht(datetime_obj)
    if pht_datetime:
        return pht_datetime.strftime('%B %d, %Y')
    return None

def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    checks = {
        'uppercase': re.search(r'[A-Z]', password),
        'lowercase': re.search(r'[a-z]', password),
        'number': re.search(r'\d', password),
        'special': re.search(r'[!@#$%^&*(),.?":{}|<>]', password)
    }
    
    missing = []
    if not checks['uppercase']:
        missing.append("uppercase letter")
    if not checks['lowercase']:
        missing.append("lowercase letter")
    if not checks['number']:
        missing.append("number")
    if not checks['special']:
        missing.append("special character")
    
    # Require at least 3 out of 4 criteria for medium strength
    met_criteria = sum(1 for check in checks.values() if check)
    if met_criteria < 3:
        return False, f"Password needs: {', '.join(missing[:2])}"
    
    return True, "Password meets requirements"

def validate_username(username):
    """Validate username"""
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    if len(username) > 20:
        return False, "Username must be no more than 20 characters long"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    return True, "Username is valid"

def generate_email_confirmation_token(email, registration_data):
    """Generate secure token for email confirmation"""
    timestamp = str(int(time.time()))
    secret_key = secrets.token_urlsafe(32)
    token_data = f"{registration_data['email']}:{registration_data['username']}:{timestamp}"
    token_hash = hashlib.sha256(f"{token_data}:{secret_key}".encode()).hexdigest()
    token = f"{timestamp}.{token_hash}.{secret_key}"
    
    return token

def verify_email_confirmation_token(token, registration_data, max_age_hours=24):
    """Verify email confirmation token (valid for 24 hours)"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return False, "Invalid token format"
        
        timestamp_str, token_hash, secret_key = parts
        timestamp = int(timestamp_str)
        
        # Check if token has expired
        current_time = int(time.time())
        if current_time - timestamp > (max_age_hours * 3600):
            return False, "Token has expired"
        
        # Verify token hash using registration data
        if not registration_data:
            return False, "Invalid token data"
            
        # Reconstruct token data to verify hash
        token_data = f"{registration_data['email']}:{registration_data['username']}:{timestamp}"
        expected_hash = hashlib.sha256(f"{token_data}:{secret_key}".encode()).hexdigest()
        
        if token_hash != expected_hash:
            return False, "Invalid token signature"
        
        return True, "Token is valid"
        
    except (ValueError, IndexError, KeyError) as e:
        return False, f"Invalid token: {e}"

def send_email_confirmation(email, username, confirmation_token):
    """Send email confirmation link to user"""
    try:
        subject = "Confirm Your Email - TruthGuard Registration"
        
        # Use request.host to get the current domain, fallback to localhost for development
        try:
            from flask import request
            base_url = f"http://{request.host}" if request else "http://localhost:5000"
        except:
            base_url = "http://localhost:5000"
            
        confirmation_url = f"{base_url}/auth/confirm-email?token={confirmation_token}"
        
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
        
    except Exception as e:
        print(f"Error sending confirmation email: {e}")
        return False

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    # Redirect if user is already logged in
    if 'user_id' in session:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash("Please fill in all fields", "error")
            return redirect(url_for('auth.login'))
        
        try:
            db = DatabaseService()
            
            # Try to find user by username or email
            user = db.get_user_by_username(username)
            if not user:
                user = db.get_user_by_email(username)
            
            if user and check_password_hash(user['password_hash'], password):
                # Successful login
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['email'] = user['email']
                session['user_role'] = user.get('role', 'user')  # Add user role to session
                
                # Update last login
                db.update_last_login(user['id'])
                
                # Redirect to the page they were trying to access, or detector page
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('main.detector_page'))
            else:
                flash("Invalid username/email or password", "error")
                return redirect(url_for('auth.login'))
        
        except Exception as e:
            print(f"Login error: {e}")
            flash("An error occurred during login. Please try again.", "error")
            return redirect(url_for('auth.login'))
    
    # GET request - render clean template
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration"""
    # Redirect if user is already logged in
    if 'user_id' in session:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        errors = []
        
        # Validate all fields
        if not username:
            errors.append("Username is required")
        else:
            is_valid, message = validate_username(username)
            if not is_valid:
                errors.append(message)
        
        if not email:
            errors.append("Email is required")
        elif not validate_email(email):
            errors.append("Please enter a valid email address")
        
        if not password:
            errors.append("Password is required")
        else:
            is_valid, message = validate_password(password)
            if not is_valid:
                errors.append(message)
        
        if password != confirm_password:
            errors.append("Passwords do not match")
        
        # Check if user already exists
        if not errors:
            try:
                db = DatabaseService()
                
                # Check if username exists
                if db.get_user_by_username(username):
                    errors.append("Username already taken")
                
                # Check if email exists
                if db.get_user_by_email(email):
                    errors.append("Email already registered")
                
            except Exception as e:
                print(f"Database check error: {e}")
                errors.append("Error checking existing users")
        
        if errors:
            for error in errors:
                flash(error, "error")
            return redirect(url_for('auth.register'))
        
        # Create new user
        try:
            db = DatabaseService()
            password_hash = generate_password_hash(password)
            
            user_id = db.create_user(username, email, password_hash)
            
            if user_id:
                # Automatically log in the new user
                session['user_id'] = user_id
                session['username'] = username
                session['email'] = email
                session['user_role'] = 'user'  # New users get 'user' role by default
                
                # Update last login for the new user
                db.update_last_login(user_id)
                
                flash('Account created successfully! Welcome to TruthGuard.', 'success')
                return redirect(url_for('main.detector_page'))
            else:
                flash("Failed to create account. Please try again.", "error")
                return redirect(url_for('auth.register'))
        
        except Exception as e:
            print(f"Registration error: {e}")
            flash("An error occurred during registration. Please try again.", "error")
            return redirect(url_for('auth.register'))
    
    # GET request - render clean template
    return render_template('auth/register.html')

@auth_bp.route('/register-with-confirmation', methods=['POST'])
def register_with_confirmation():
    """Handle registration with email confirmation"""
    
    # Validate form data
    username = request.form.get('username', '').strip()
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')
    confirm_password = request.form.get('confirm_password', '')
    
    errors = []
    
    # Validate all fields
    if not username:
        errors.append("Username is required")
    else:
        is_valid, message = validate_username(username)
        if not is_valid:
            errors.append(message)
    
    if not email:
        errors.append("Email is required")
    elif not validate_email(email):
        errors.append("Please enter a valid email address")
    
    if not password:
        errors.append("Password is required")
    else:
        is_valid, message = validate_password(password)
        if not is_valid:
            errors.append(message)
    
    if password != confirm_password:
        errors.append("Passwords do not match")
    
    # Check if user already exists
    if not errors:
        try:
            db = DatabaseService()
            
            # Check if username exists
            if db.get_user_by_username(username):
                errors.append("Username already taken")
            
            # Check if email exists
            if db.get_user_by_email(email):
                errors.append("Email already registered")
                
        except Exception as e:
            print(f"Database check error: {e}")
            errors.append("Error checking existing users")
    
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
        
        # Store token and data in session
        session[f'registration_token_{token}'] = registration_data
        
        # Send confirmation email
        email_sent = send_email_confirmation(email, username, token)
        
        if email_sent:
            return jsonify({
                'success': True, 
                'message': 'Confirmation email sent. Please check your inbox.',
                'email': email
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
        # Retrieve registration data from session first
        registration_data = session.get(f'registration_token_{token}')
        
        if not registration_data:
            flash('Invalid or expired confirmation link', 'error')
            return redirect(url_for('auth.register'))
        
        # Verify token format, expiration, and signature
        is_valid, message = verify_email_confirmation_token(token, registration_data)
        if not is_valid:
            flash(f'Confirmation failed: {message}', 'error')
            return redirect(url_for('auth.register'))
        
        # Double-check session data expiration (redundant but safe)
        if time.time() - registration_data['timestamp'] > (24 * 3600):
            session.pop(f'registration_token_{token}', None)
            flash('Confirmation link has expired. Please register again.', 'error')
            return redirect(url_for('auth.register'))
        
        # Create user account (only if they don't already exist)
        db = DatabaseService()
        
        # Check if user already exists (from direct registration)
        existing_user = db.get_user_by_username(registration_data['username'])
        if not existing_user:
            existing_user = db.get_user_by_email(registration_data['email'])
        
        if existing_user:
            # User already exists - just log them in
            user_id = existing_user['id']
            print(f"✅ User already exists: {registration_data['username']} - logging in")
        else:
            # Create new user
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
            
            # Update last login
            db.update_last_login(user_id)
            
            flash('Email confirmed! Your account has been created successfully.', 'success')
            return redirect(url_for('main.detector_page'))
        else:
            flash('Failed to create account. Please try again.', 'error')
            return redirect(url_for('auth.register'))
            
    except Exception as e:
        print(f"Email confirmation error: {e}")
        flash('An error occurred during confirmation. Please try again.', 'error')
        return redirect(url_for('auth.register'))

@auth_bp.route('/check-login-status')
def check_login_status():
    """Check if user is logged in (for email confirmation status check)"""
    return jsonify({
        'logged_in': 'user_id' in session,
        'username': session.get('username', ''),
        'email': session.get('email', '')
    })

@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """Handle user logout"""
    session.clear()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('main.index'))

@auth_bp.route('/profile')
def profile():
    """User profile page"""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    try:
        db = DatabaseService()
        user = db.get_user_by_id(session['user_id'])
        
        if not user:
            session.clear()
            return redirect(url_for('auth.login'))
        
        return render_template('auth/profile.html', user=user)
    
    except Exception as e:
        print(f"Profile error: {e}")
        flash('Error loading profile', 'error')
        return redirect(url_for('main.index'))

@auth_bp.route('/update-username', methods=['POST'])
def update_username():
    """Update user's username"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    try:
        data = request.get_json()
        new_username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not new_username or not password:
            return jsonify({'success': False, 'message': 'Username and password are required'}), 400
        
        # Validate username
        is_valid, message = validate_username(new_username)
        if not is_valid:
            return jsonify({'success': False, 'message': message}), 400
        
        # Verify current password
        db = DatabaseService()
        user = db.get_user_by_id(session['user_id'])
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': 'Invalid password'}), 400
        
        # Update username
        success, message = db.update_user_username(session['user_id'], new_username)
        if success:
            session['username'] = new_username  # Update session
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': message}), 400
    
    except Exception as e:
        print(f"Update username error: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@auth_bp.route('/update-email', methods=['POST'])
def update_email():
    """Update user's email"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    try:
        data = request.get_json()
        new_email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not new_email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        # Validate email
        if not validate_email(new_email):
            return jsonify({'success': False, 'message': 'Invalid email format'}), 400
        
        # Verify current password
        db = DatabaseService()
        user = db.get_user_by_id(session['user_id'])
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': 'Invalid password'}), 400
        
        # Update email
        success, message = db.update_user_email(session['user_id'], new_email)
        if success:
            session['email'] = new_email  # Update session
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': message}), 400
    
    except Exception as e:
        print(f"Update email error: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@auth_bp.route('/update-password', methods=['POST'])
def update_password():
    """Update user's password"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    try:
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')
        
        if not current_password or not new_password or not confirm_password:
            return jsonify({'success': False, 'message': 'All password fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'New passwords do not match'}), 400
        
        # Validate new password
        is_valid, message = validate_password(new_password)
        if not is_valid:
            return jsonify({'success': False, 'message': message}), 400
        
        # Verify current password
        db = DatabaseService()
        user = db.get_user_by_id(session['user_id'])
        if not user or not check_password_hash(user['password_hash'], current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400
        
        # Update password
        new_password_hash = generate_password_hash(new_password)
        success = db.update_user_password(session['user_id'], new_password_hash)
        if success:
            return jsonify({'success': True, 'message': 'Password updated successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to update password'}), 500
    
    except Exception as e:
        print(f"Update password error: {e}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

# Helper function to check if user is logged in
def is_logged_in():
    """Check if user is logged in"""
    return 'user_id' in session

# Helper function to get current user
def get_current_user():
    """Get current logged in user"""
    if not is_logged_in():
        return None
    
    try:
        db = DatabaseService()
        return db.get_user_by_id(session['user_id'])
    except:
        return None

# Make helper functions available to templates
@auth_bp.app_template_global()
def current_user():
    """Template global function to get current user"""
    return get_current_user()

@auth_bp.app_template_global()
def user_logged_in():
    """Template global function to check if user is logged in"""
    return is_logged_in()
