from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
from functools import wraps
from database import DatabaseService, get_supabase_client, PHILIPPINE_TZ
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
                    client = get_supabase_client()
                    result = client.table('articles').select('id', count='exact').gte('created_at', day_start.isoformat()).lt('created_at', day_end.isoformat()).execute()
                    articles_count = result.count if getattr(result, 'count', None) is not None else (len(result.data) if result.data else 0)
                    
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
        # Use Supabase client to fetch users
        client = get_supabase_client()
        get_all = request.args.get('all', 'false').lower() == 'true'
        search = request.args.get('search', '', type=str)

        if get_all:
            res = client.table('users').select('*').execute()
            users = res.data or []

            if search:
                q = search.lower()
                users = [u for u in users if q in (u.get('username') or '').lower() or q in (u.get('email') or '').lower()]

            # Sort by created_at descending if available
            users.sort(key=lambda u: u.get('created_at') or '', reverse=True)

            def fmt(u):
                return {
                    'id': u.get('id'),
                    'username': u.get('username'),
                    'email': u.get('email'),
                    'role': u.get('role'),
                    'status': 'Active' if u.get('is_active') else 'Inactive',
                    'is_active': u.get('is_active'),
                    'created_at': (u.get('created_at')[:16].replace('T', ' ')) if u.get('created_at') else None,
                    'last_login': (u.get('last_login')[:16].replace('T', ' ')) if u.get('last_login') else 'Never'
                }

            return jsonify({'success': True, 'users': [fmt(u) for u in users]})

        # Paginated response
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        offset = (page - 1) * per_page
        end = offset + per_page - 1

        if search:
            # Fallback: fetch all and filter then paginate in Python
            res = client.table('users').select('*').execute()
            all_users = res.data or []
            q = search.lower()
            filtered = [u for u in all_users if q in (u.get('username') or '').lower() or q in (u.get('email') or '').lower()]
            total = len(filtered)
            page_items = filtered[offset:offset+per_page]
        else:
            res = client.table('users').select('*', count='exact').order('created_at', desc=True).range(offset, end).execute()
            page_items = res.data or []
            total = res.count or (len(page_items) if page_items else 0)

        pages = (total + per_page - 1) // per_page if per_page else 1

        def fmt(u):
            return {
                'id': u.get('id'),
                'username': u.get('username'),
                'email': u.get('email'),
                'role': u.get('role'),
                'is_active': u.get('is_active'),
                'created_at': (u.get('created_at')[:16].replace('T', ' ')) if u.get('created_at') else None,
                'last_login': (u.get('last_login')[:16].replace('T', ' ')) if u.get('last_login') else 'Never'
            }

        return jsonify({
            'success': True,
            'users': [fmt(u) for u in page_items],
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total,
                'has_next': page < pages,
                'has_prev': page > 1
            }
        })
    except Exception as e:
        print(f"Error in get_users: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/feedback')
@admin_required
def get_feedback():
    """API endpoint to get feedback list with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 6, type=int)
        search = request.args.get('search', '', type=str)
        type_filter = request.args.get('type', 'all', type=str)
        sort_by = request.args.get('sort_by', 'date', type=str)
        sort_order = request.args.get('sort_order', 'desc', type=str)

        client = get_supabase_client()

        # Build base query
        order_field = 'submission_date' if sort_by == 'date' else 'rating'
        desc_flag = sort_order == 'desc'

        offset = (page - 1) * per_page
        end = offset + per_page - 1

        query = client.table('feedback').select('*', count='exact')

        if search:
            # Use ilike for comments or name
            # Supabase doesn't support OR easily in this helper, so fetch filtered in Python
            all_res = client.table('feedback').select('*').execute()
            all_items = all_res.data or []
            q = search.lower()
            filtered = [i for i in all_items if q in (i.get('comments') or '').lower() or q in (i.get('name') or '').lower()]
            if type_filter and type_filter != 'all':
                try:
                    rv = int(type_filter)
                    filtered = [i for i in filtered if i.get('rating') == rv]
                except Exception:
                    pass
            # Sort and paginate in python
            reverse = desc_flag
            filtered.sort(key=lambda x: x.get(order_field) or '', reverse=reverse)
            total = len(filtered)
            page_items = filtered[offset:offset+per_page]
        else:
            if type_filter and type_filter != 'all':
                try:
                    rv = int(type_filter)
                    query = query.eq('rating', rv)
                except Exception:
                    pass

            query = query.order(order_field, desc=desc_flag).range(offset, end)
            res = query.execute()
            page_items = res.data or []
            total = res.count or (len(page_items) if page_items else 0)

        pages = (total + per_page - 1) // per_page if per_page else 1

        feedback_data = []
        for item in page_items:
            username = 'Anonymous'
            # Try to map user info if present
            if item.get('user_id'):
                u = DatabaseService.get_user_by_id(item.get('user_id'))
                if u:
                    username = u.get('username') or username
            elif item.get('name'):
                username = item.get('name')

            comments = item.get('comments') or ''
            submission_date = item.get('submission_date')
            try:
                date_short = submission_date[:10]
                created_at = submission_date[:16].replace('T', ' ')
            except Exception:
                date_short = submission_date
                created_at = submission_date

            feedback_data.append({
                'id': item.get('id'),
                'username': username,
                'message': (comments[:200] + ('...' if len(comments) > 200 else '')),
                'full_message': comments,
                'rating': item.get('rating'),
                'date': date_short,
                'created_at': created_at,
                'user_id': item.get('user_id'),
                'title': f"{item.get('rating')}-star feedback"
            })

        return jsonify({
            'success': True,
            'feedback': feedback_data,
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total,
                'has_next': page < pages,
                'has_prev': page > 1
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
        stats = DatabaseService.get_feedback_statistics()
        return jsonify({'success': True, 'statistics': stats})
        
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
        client = get_supabase_client()
        res = client.table('feedback').select('*').eq('id', feedback_id).execute()
        if not res.data:
            return jsonify({'success': False, 'error': 'Feedback not found'}), 404
        feedback = res.data[0]

        username = 'Anonymous'
        if feedback.get('user_id'):
            u = DatabaseService.get_user_by_id(feedback.get('user_id'))
            if u:
                username = u.get('username') or username
        elif feedback.get('name'):
            username = feedback.get('name')

        submission = feedback.get('submission_date')
        date_short = submission[:10] if submission else None
        created_at = submission if submission else None

        return jsonify({
            'success': True,
            'feedback': {
                'id': feedback.get('id'),
                'username': username,
                'message': feedback.get('comments'),
                'rating': feedback.get('rating'),
                'date': date_short,
                'created_at': created_at,
                'user_id': feedback.get('user_id'),
                'status': 'pending',
                'title': f"{feedback.get('rating')}-star feedback",
                'ip_address': 'Not recorded',
                'article_title': None,
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
        client = get_supabase_client()
        res = client.table('feedback').delete().eq('id', feedback_id).execute()
        if res.error:
            return jsonify({'success': False, 'error': str(res.error)}), 500
        return jsonify({'success': True, 'message': 'Feedback deleted successfully'})
    except Exception as e:
        print(f"Error deleting feedback: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/users/<int:user_id>/toggle-role', methods=['POST'])
@admin_required
def toggle_user_role(user_id):
    """Toggle user role between admin and user"""
    try:
        client = get_supabase_client()
        res = client.table('users').select('*').eq('id', user_id).execute()
        if not res.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        user = res.data[0]

        if user.get('id') == session.get('user_id'):
            return jsonify({'success': False, 'error': 'Cannot change your own role'}), 400

        new_role = 'admin' if user.get('role') == 'user' else 'user'
        upd = client.table('users').update({'role': new_role}).eq('id', user_id).execute()
        if upd.error:
            return jsonify({'success': False, 'error': str(upd.error)}), 500

        return jsonify({'success': True, 'message': f'User role changed to {new_role}', 'new_role': new_role})
    except Exception as e:
        print(f"Error toggling user role: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/users/<int:user_id>/toggle-status', methods=['POST'])
@admin_required
def toggle_user_status(user_id):
    """Toggle user active status"""
    try:
        client = get_supabase_client()
        res = client.table('users').select('*').eq('id', user_id).execute()
        if not res.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        user = res.data[0]

        if user.get('id') == session.get('user_id'):
            return jsonify({'success': False, 'error': 'Cannot change your own status'}), 400

        new_status = not bool(user.get('is_active'))
        upd = client.table('users').update({'is_active': new_status}).eq('id', user_id).execute()
        if upd.error:
            return jsonify({'success': False, 'error': str(upd.error)}), 500

        status = 'activated' if new_status else 'deactivated'
        return jsonify({'success': True, 'message': f'User {status}', 'is_active': new_status})
    except Exception as e:
        print(f"Error toggling user status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/password-reset-requests')
@admin_required
def get_password_reset_requests():
    """API endpoint to get password reset requests with pagination or all requests"""
    try:
        client = get_supabase_client()
        get_all = request.args.get('all', 'false').lower() == 'true'
        search = request.args.get('search', '', type=str)

        if get_all:
            res = client.table('password_reset_requests').select('*').order('requested_at', desc=True).execute()
            items = res.data or []
            if search:
                q = search.lower()
                items = [r for r in items if q in (r.get('username') or '').lower() or q in (r.get('email') or '').lower()]

            request_list = [{
                'id': r.get('id'),
                'user_id': r.get('user_id'),
                'username': r.get('username'),
                'email': r.get('email'),
                'requested_at': r.get('requested_at'),
                'processed_at': r.get('processed_at'),
                'status': r.get('status'),
                'ip_address': r.get('ip_address')
            } for r in items]

            return jsonify({'success': True, 'requests': request_list})

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        offset = (page - 1) * per_page
        end = offset + per_page - 1

        if search:
            res = client.table('password_reset_requests').select('*').order('requested_at', desc=True).execute()
            items = res.data or []
            q = search.lower()
            filtered = [r for r in items if q in (r.get('username') or '').lower() or q in (r.get('email') or '').lower()]
            total = len(filtered)
            page_items = filtered[offset:offset+per_page]
        else:
            res = client.table('password_reset_requests').select('*', count='exact').order('requested_at', desc=True).range(offset, end).execute()
            page_items = res.data or []
            total = res.count or (len(page_items) if page_items else 0)

        pages = (total + per_page - 1) // per_page if per_page else 1

        request_list = [{
            'id': r.get('id'),
            'user_id': r.get('user_id'),
            'username': r.get('username'),
            'email': r.get('email'),
            'requested_at': r.get('requested_at'),
            'processed_at': r.get('processed_at'),
            'status': r.get('status'),
            'ip_address': r.get('ip_address')
        } for r in page_items]

        return jsonify({
            'success': True,
            'requests': request_list,
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total,
                'has_next': page < pages,
                'has_prev': page > 1
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
        client = get_supabase_client()
        # Verify exists
        res = client.table('password_reset_requests').select('*').eq('id', request_id).execute()
        if not res.data:
            return jsonify({'success': False, 'error': 'Password reset request not found'}), 404
        req = res.data[0]

        # Delete
        deleted = client.table('password_reset_requests').delete().eq('id', request_id).execute()
        if deleted.error:
            print(f"Error deleting password reset request {request_id}: {deleted.error}")
            return jsonify({'success': False, 'error': str(deleted.error)}), 500

        print(f"Admin deleted password reset request ID {request_id} for user {req.get('username')} ({req.get('email')})")
        return jsonify({'success': True, 'message': f"Password reset request for {req.get('username')} deleted successfully"})
    except Exception as e:
        print(f"Error deleting password reset request {request_id}: {e}")
        return jsonify({'success': False, 'error': f'Failed to delete password reset request: {str(e)}'}), 500
