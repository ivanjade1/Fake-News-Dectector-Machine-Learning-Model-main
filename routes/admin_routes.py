from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
from functools import wraps
from database import db, User, Article, Feedback, UserGameStats, PasswordResetRequest, PHILIPPINE_TZ
from sqlalchemy import func, desc
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

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

@admin_bp.route('/')
@admin_bp.route('/dashboard')
@admin_required
def admin_dashboard():
    """Admin dashboard with system statistics"""
    return render_template('admin/admin_dashboard.html')

@admin_bp.route('/feedback')
@admin_required
def admin_feedback():
    """Admin feedback management page"""
    return render_template('admin/admin_feedback.html')

@admin_bp.route('/api/dashboard-stats')
@admin_required
def get_dashboard_stats():
    """API endpoint to get dashboard statistics"""
    try:
        print("Starting dashboard stats calculation...")
        from database import DatabaseService
        
        # User statistics - with error handling
        try:
            total_users = DatabaseService.get_user_count()
            admin_users = DatabaseService.get_admin_user_count()
            active_users = DatabaseService.get_active_user_count()
            print(f"User stats: total={total_users}, admin={admin_users}, active={active_users}")
        except Exception as e:
            print(f"Error in user stats: {e}")
            total_users = admin_users = active_users = 0
        
        # Recent registrations (last 30 days)
        try:
            recent_users = DatabaseService.get_recent_user_count(30)
            print(f"Recent users: {recent_users}")
        except Exception as e:
            print(f"Error in recent users: {e}")
            recent_users = 0
        
        # Article statistics - with error handling
        try:
            total_articles = DatabaseService.get_article_count()
            real_articles = DatabaseService.get_article_count_by_classification('Real')
            fake_articles = DatabaseService.get_article_count_by_classification('Fake')
            print(f"Article stats: total={total_articles}, real={real_articles}, fake={fake_articles}")
        except Exception as e:
            print(f"Error in article stats: {e}")
            total_articles = real_articles = fake_articles = 0
        
        # Recent analysis (last 7 days)
        try:
            recent_articles = DatabaseService.get_recent_article_count(7)
            print(f"Recent articles: {recent_articles}")
        except Exception as e:
            print(f"Error in recent articles: {e}")
            recent_articles = 0
        
        # Game statistics - with error handling
        try:
            game_stats = DatabaseService.get_game_stats()
            total_games_played = game_stats['total_games']
            avg_score = game_stats['average_score']
            top_score = game_stats['top_score']
            print(f"Game stats: total_games={total_games_played}, avg={avg_score}, top={top_score}")
        except Exception as e:
            print(f"Error in game stats: {e}")
            total_games_played = avg_score = top_score = 0
        
        # Feedback statistics - with error handling
        try:
            total_feedback = DatabaseService.get_feedback_count()
            recent_feedback = DatabaseService.get_recent_feedback_count(7)
            print(f"Feedback stats: total={total_feedback}, recent={recent_feedback}")
        except Exception as e:
            print(f"Error in feedback stats: {e}")
            total_feedback = recent_feedback = 0
        
        # Daily activity (last 7 days) - with error handling
        daily_stats = []
        try:
            for i in range(7):
                try:
                    day = datetime.now(PHILIPPINE_TZ) - timedelta(days=i)
                    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                    day_end = day_start + timedelta(days=1)
                    
                    # Use Supabase to count articles for this day
                    from database import get_supabase_client
                    client = get_supabase_client()
                    result = client.table('articles').select('id', count='exact').gte('created_at', day_start.isoformat()).lt('created_at', day_end.isoformat()).execute()
                    articles_count = result.count
                    
                    daily_stats.append({
                        'date': day.strftime('%Y-%m-%d'),
                        'articles': articles_count
                    })
                except Exception as e:
                    print(f"Error in daily stats for day {i}: {e}")
                    daily_stats.append({
                        'date': (datetime.now(PHILIPPINE_TZ) - timedelta(days=i)).strftime('%Y-%m-%d'),
                        'articles': 0
                    })
        except Exception as e:
            print(f"Error in daily activity: {e}")
            # Create empty daily stats
            for i in range(7):
                daily_stats.append({
                    'date': (datetime.now(PHILIPPINE_TZ) - timedelta(days=i)).strftime('%Y-%m-%d'),
                    'articles': 0
                })

        print("Dashboard stats calculation completed successfully")
        
        return jsonify({
            'success': True,
            'stats': {
                'users': {
                    'total': total_users,
                    'admin': admin_users,
                    'active': active_users,
                    'recent': recent_users
                },
                'articles': {
                    'total': total_articles,
                    'real': real_articles,
                    'fake': fake_articles,
                    'recent': recent_articles
                },
                'games': {
                    'total_sessions': total_games_played,
                    'avg_score': round(float(avg_score), 1),
                    'top_score': int(top_score)
                },
                'feedback': {
                    'total': total_feedback,
                    'recent': recent_feedback
                },
                'daily_activity': list(reversed(daily_stats))
            }
        })
    except Exception as e:
        print(f"Fatal error in dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/users')
@admin_required
def get_users():
    """API endpoint to get user list with pagination or all users"""
    try:
        # Check if client wants all users at once for client-side pagination
        get_all = request.args.get('all', 'false').lower() == 'true'
        
        if get_all:
            # Return all users for client-side pagination
            search = request.args.get('search', '', type=str)
            
            query = User.query
            
            if search:
                query = query.filter(
                    db.or_(
                        User.username.contains(search),
                        User.email.contains(search)
                    )
                )
            
            all_users = query.order_by(desc(User.created_at)).all()
            
            return jsonify({
                'success': True,
                'users': [{
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'status': 'Active' if user.is_active else 'Inactive',
                    'is_active': user.is_active,
                    'created_at': user.created_at.strftime('%Y-%m-%d %H:%M'),
                    'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never'
                } for user in all_users]
            })
        else:
            # Original paginated response for backward compatibility
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '', type=str)
            
            query = User.query
            
            if search:
                query = query.filter(
                    db.or_(
                        User.username.contains(search),
                        User.email.contains(search)
                    )
                )
            
            users = query.order_by(desc(User.created_at)).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'success': True,
                'users': [{
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'is_active': user.is_active,
                    'created_at': user.created_at.strftime('%Y-%m-%d %H:%M'),
                    'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never'
                } for user in users.items],
                'pagination': {
                    'page': users.page,
                    'pages': users.pages,
                    'per_page': users.per_page,
                    'total': users.total,
                    'has_next': users.has_next,
                    'has_prev': users.has_prev
                }
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/feedback')
@admin_required
def get_feedback():
    """API endpoint to get feedback list with pagination"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 6, type=int)
        search = request.args.get('search', '', type=str)
        type_filter = request.args.get('type', 'all', type=str)  # Using this for rating filter
        sort_by = request.args.get('sort_by', 'date', type=str)
        sort_order = request.args.get('sort_order', 'desc', type=str)
        
        print(f"Feedback API called with: page={page}, per_page={per_page}, search='{search}', type_filter='{type_filter}'")
        
        # Build query
        query = Feedback.query
        
        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    Feedback.comments.contains(search),
                    Feedback.name.contains(search) if search else False
                )
            )
        
        # Apply rating filter (using type_filter parameter)
        if type_filter and type_filter != 'all':
            try:
                rating_value = int(type_filter)
                if 1 <= rating_value <= 5:
                    query = query.filter(Feedback.rating == rating_value)
                    print(f"Applied rating filter: {rating_value}")
            except (ValueError, TypeError):
                print(f"Invalid rating filter value: {type_filter}")
        
        # Apply sorting
        if sort_by == 'date':
            if sort_order == 'desc':
                query = query.order_by(desc(Feedback.submission_date))
            else:
                query = query.order_by(Feedback.submission_date)
        elif sort_by == 'rating':
            if sort_order == 'desc':
                query = query.order_by(desc(Feedback.rating))
            else:
                query = query.order_by(Feedback.rating)
        else:
            query = query.order_by(desc(Feedback.submission_date))
        
        # Execute paginated query
        feedback_items = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        print(f"Found {feedback_items.total} feedback items")
        
        # Format response to match JavaScript expectations
        feedback_data = []
        
        for item in feedback_items.items:
            # Get username from related user or use name field
            username = 'Anonymous'
            if item.user:
                username = item.user.username
            elif item.name:
                username = item.name
            
            feedback_data.append({
                'id': item.id,
                'username': username,
                'message': item.comments[:200] + ('...' if len(item.comments) > 200 else ''),  # Preview
                'full_message': item.comments,  # Full message for modal
                'rating': item.rating,
                'date': item.submission_date.strftime('%Y-%m-%d'),
                'created_at': item.submission_date.strftime('%Y-%m-%d %H:%M'),
                'user_id': item.user_id,
                'title': f"{item.rating}-star feedback"  # Generate title from rating
            })
        
        return jsonify({
            'success': True,
            'feedback': feedback_data,
            'pagination': {
                'page': feedback_items.page,
                'pages': feedback_items.pages,
                'per_page': feedback_items.per_page,
                'total': feedback_items.total,
                'has_next': feedback_items.has_next,
                'has_prev': feedback_items.has_prev
            }
        })
        
    except Exception as e:
        print(f"Error in get_feedback: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/feedback/statistics')
@admin_required
def get_feedback_statistics():
    """API endpoint to get feedback statistics"""
    try:
        # Total feedback count
        total_feedback = Feedback.query.count()
        
        # Average rating
        avg_rating_result = db.session.query(func.avg(Feedback.rating)).filter(Feedback.rating.isnot(None)).scalar()
        avg_rating = float(avg_rating_result) if avg_rating_result else 0.0
        
        # Rating distribution
        rating_distribution = {}
        for rating in range(1, 6):  # 1 to 5 stars
            count = Feedback.query.filter_by(rating=rating).count()
            rating_distribution[rating] = count
        
        statistics = {
            'total_feedback': total_feedback,
            'average_rating': round(avg_rating, 1),
            'rating_distribution': rating_distribution
        }
        
        return jsonify({
            'success': True,
            'statistics': statistics
        })
        
    except Exception as e:
        print(f"Error in get_feedback_statistics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/feedback/<int:feedback_id>')
@admin_required
def get_feedback_detail(feedback_id):
    """API endpoint to get individual feedback details"""
    try:
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Get username from related user or use name field
        username = 'Anonymous'
        if feedback.user:
            username = feedback.user.username
        elif feedback.name:
            username = feedback.name
        
        return jsonify({
            'success': True,
            'feedback': {
                'id': feedback.id,
                'username': username,
                'message': feedback.comments,
                'rating': feedback.rating,
                'date': feedback.submission_date.strftime('%Y-%m-%d'),
                'created_at': feedback.submission_date.strftime('%Y-%m-%d %H:%M:%S'),
                'user_id': feedback.user_id,
                'status': 'pending',  # Default status
                'title': f"{feedback.rating}-star feedback",
                'ip_address': 'Not recorded',  # We don't store IP
                'article_title': None,  # We don't store related article
                'article_url': None
            }
        })
    except Exception as e:
        print(f"Error in get_feedback_detail: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/feedback/<int:feedback_id>', methods=['DELETE'])
@admin_required
def delete_feedback(feedback_id):
    """Delete a feedback entry"""
    try:
        feedback = Feedback.query.get_or_404(feedback_id)
        db.session.delete(feedback)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Feedback deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/users/<int:user_id>/toggle-role', methods=['POST'])
@admin_required
def toggle_user_role(user_id):
    """Toggle user role between admin and user"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Don't allow changing your own role
        if user.id == session['user_id']:
            return jsonify({'success': False, 'error': 'Cannot change your own role'}), 400
        
        user.role = 'admin' if user.role == 'user' else 'user'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User role changed to {user.role}',
            'new_role': user.role
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/users/<int:user_id>/toggle-status', methods=['POST'])
@admin_required
def toggle_user_status(user_id):
    """Toggle user active status"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Don't allow deactivating yourself
        if user.id == session['user_id']:
            return jsonify({'success': False, 'error': 'Cannot change your own status'}), 400
        
        user.is_active = not user.is_active
        db.session.commit()
        
        status = 'activated' if user.is_active else 'deactivated'
        return jsonify({
            'success': True,
            'message': f'User {status}',
            'is_active': user.is_active
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/password-reset-requests')
@admin_required
def get_password_reset_requests():
    """API endpoint to get password reset requests with pagination or all requests"""
    try:
        # Check if client wants all requests at once for client-side pagination
        get_all = request.args.get('all', 'false').lower() == 'true'
        
        if get_all:
            # Return all requests for client-side pagination
            search = request.args.get('search', '', type=str)
            
            # Base query
            query = PasswordResetRequest.query
            
            # Apply search filter if provided
            if search:
                query = query.filter(
                    db.or_(
                        PasswordResetRequest.username.ilike(f'%{search}%'),
                        PasswordResetRequest.email.ilike(f'%{search}%')
                    )
                )
            
            # Order by requested_at descending (newest first)
            all_requests = query.order_by(desc(PasswordResetRequest.requested_at)).all()
            
            # Convert to JSON format
            request_list = []
            for req in all_requests:
                request_list.append({
                    'id': req.id,
                    'user_id': req.user_id,
                    'username': req.username,
                    'email': req.email,
                    'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                    'processed_at': req.processed_at.isoformat() if req.processed_at else None,
                    'status': req.status,
                    'ip_address': req.ip_address
                })
            
            return jsonify({
                'success': True,
                'requests': request_list
            })
        else:
            # Original paginated response for backward compatibility
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '', type=str)
            
            # Base query
            query = PasswordResetRequest.query
            
            # Apply search filter if provided
            if search:
                query = query.filter(
                    db.or_(
                        PasswordResetRequest.username.ilike(f'%{search}%'),
                        PasswordResetRequest.email.ilike(f'%{search}%')
                    )
                )
            
            # Order by requested_at descending (newest first) and paginate
            requests = query.order_by(desc(PasswordResetRequest.requested_at)).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            # Convert to JSON format
            request_list = []
            for req in requests.items:
                request_list.append({
                    'id': req.id,
                    'user_id': req.user_id,
                    'username': req.username,
                    'email': req.email,
                    'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                    'processed_at': req.processed_at.isoformat() if req.processed_at else None,
                    'status': req.status,
                    'ip_address': req.ip_address
                })
            
            return jsonify({
                'success': True,
                'requests': request_list,
                'pagination': {
                    'page': requests.page,
                    'pages': requests.pages,
                    'per_page': requests.per_page,
                    'total': requests.total,
                    'has_next': requests.has_next,
                    'has_prev': requests.has_prev
                }
            })
        
    except Exception as e:
        print(f"Error fetching password reset requests: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/password-reset-requests/<int:request_id>', methods=['DELETE'])
@admin_required
def delete_password_reset_request(request_id):
    """API endpoint to delete a password reset request"""
    try:
        # Find the password reset request
        reset_request = PasswordResetRequest.query.get(request_id)
        
        if not reset_request:
            return jsonify({
                'success': False, 
                'error': 'Password reset request not found'
            }), 404
        
        # Store request info for logging
        username = reset_request.username
        email = reset_request.email
        
        # Delete the request
        db.session.delete(reset_request)
        db.session.commit()
        
        print(f"Admin deleted password reset request ID {request_id} for user {username} ({email})")
        
        return jsonify({
            'success': True,
            'message': f'Password reset request for {username} deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting password reset request {request_id}: {e}")
        return jsonify({
            'success': False, 
            'error': f'Failed to delete password reset request: {str(e)}'
        }), 500
