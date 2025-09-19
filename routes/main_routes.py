from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from functools import wraps
from database import DatabaseService, User

main_bp = Blueprint('main', __name__)

def login_required(f):
    """Decorator to require login for certain routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@main_bp.route('/')
def index():
    # Check if user is logged in and is admin, redirect to admin dashboard
    if session.get('user_id'):
        from database import DatabaseService
        user = DatabaseService.get_user_by_id(session['user_id'])
        if user and user.get('role') == 'admin':
            return redirect(url_for('admin.admin_dashboard'))
    
    return render_template('home.html')

@main_bp.route('/detector')
@login_required
def detector_page():
    return render_template('detector.html')

@main_bp.route('/results')
@login_required
def results_page():
    return render_template('results.html')

@main_bp.route('/history')
@login_required
def history_page():
    user_role = session.get('user_role', 'user')
    is_admin = user_role == 'admin'
    return render_template('history.html', is_admin=is_admin, user_role=user_role)

@main_bp.route('/about')
def about_page():
    return render_template('about.html')

@main_bp.route('/feedback', methods=['GET', 'POST'])
def feedback_page():
    if request.method == 'POST':
        try:
            # Get form data
            name = request.form.get('name', '').strip()
            comments = request.form.get('comments', '').strip()
            rating = request.form.get('rating')
            
            # Validate rating
            try:
                rating = int(rating) if rating else None
            except (ValueError, TypeError):
                rating = None
            
            # Validate required fields
            if not comments:
                return render_template('feedback.html', 
                                     error="Comments are required.", 
                                     name=name, 
                                     rating=rating)
            
            if not rating or rating < 1 or rating > 5:
                return render_template('feedback.html', 
                                     error="Please select a rating between 1 and 5 stars.", 
                                     name=name, 
                                     comments=comments)
            
            # Get user_id if user is logged in (assuming session-based auth)
            user_id = session.get('user_id')  # Adjust this based on your auth system
            
            # Save feedback to database
            result = DatabaseService.save_feedback(
                name=name or None,
                comments=comments,
                rating=rating,
                user_id=user_id
            )
            
            if result['success']:
                return render_template('feedback.html', 
                                     success=result['message'])
            else:
                return render_template('feedback.html', 
                                     error=result['error'],
                                     name=name,
                                     comments=comments,
                                     rating=rating)
                
        except Exception as e:
            print(f"❌ Error processing feedback: {e}")
            return render_template('feedback.html', 
                                 error="An unexpected error occurred. Please try again.",
                                 name=request.form.get('name', ''),
                                 comments=request.form.get('comments', ''),
                                 rating=request.form.get('rating'))
    
    # GET request - show feedback form
    return render_template('feedback.html')

@main_bp.route('/static/<path:filename>')
def static_files(filename):
    from flask import current_app
    return current_app.send_static_file(filename)
