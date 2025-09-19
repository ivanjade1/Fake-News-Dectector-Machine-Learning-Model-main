from flask import Blueprint, request, jsonify, make_response, session
from database import DatabaseService, PHILIPPINE_TZ
import logging
from datetime import datetime

history_bp = Blueprint('history_api', __name__, url_prefix='/api')

logger = logging.getLogger(__name__)

@history_bp.route('/history', methods=['GET'])
def get_articles():
    """
    Get articles with pagination, search, and filtering
    - For logged-in users: shows only their own articles
    - For logged-out users: shows all articles (public view)
    Query parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 50, max: 100)
    - search: Search term for title, summary, breakdown
    - classification: Filter by classification (Real, Fake)
    - input_type: Filter by input type (url, snippet)
    - sort_by: Sort field (created_at, classification_score, title)
    - sort_order: Sort order (asc, desc)
    """
    try:
        # Check if user is logged in and their role
        user_id = session.get('user_id')
        user_role = session.get('user_role', 'user')
        is_logged_in = user_id is not None
        is_admin = user_role == 'admin'
        
        # Get query parameters
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, max(1, int(request.args.get('limit', 50))))
        search = request.args.get('search', '').strip()
        classification = request.args.get('classification', '').strip()
        input_type = request.args.get('input_type', '').strip()
        sort_by = request.args.get('sort_by', 'created_at').strip()
        sort_order = request.args.get('sort_order', 'desc').strip().lower()
        # Admin-only parameter: show duplicates (default True for backward compatibility)
        show_duplicates = request.args.get('show_duplicates', 'true').lower() == 'true'
        
        # Debug log for duplicate filtering
        if is_admin:
            logger.info(f"🔄 Admin duplicate filter: show_duplicates={show_duplicates} (raw: '{request.args.get('show_duplicates', 'not provided')}')")

        if is_admin:
            logger.info(f"📊 History API request for admin user {user_id}: page={page}, limit={limit}, search='{search}', "
                       f"classification='{classification}', input_type='{input_type}', "
                       f"sort_by='{sort_by}', sort_order='{sort_order}', show_duplicates={show_duplicates} (viewing all articles)")
        elif is_logged_in:
            logger.info(f"📊 History API request for user {user_id}: page={page}, limit={limit}, search='{search}', "
                       f"classification='{classification}', input_type='{input_type}', "
                       f"sort_by='{sort_by}', sort_order='{sort_order}'")
        else:
            logger.info(f"📊 History API request (public view): page={page}, limit={limit}, search='{search}', "
                       f"classification='{classification}', input_type='{input_type}', "
                       f"sort_by='{sort_by}', sort_order='{sort_order}'")

        # Get database service
        db_service = DatabaseService()
        
        # Get articles with pagination and filtering
        # Admin users see all articles, regular users see only their own, logged-out users see all (public view)
        result = db_service.get_articles_with_pagination(
            page=page,
            limit=limit,
            search=search,
            classification=classification,
            input_type=input_type,
            sort_by=sort_by,
            sort_order=sort_order,
            user_id=user_id if (is_logged_in and not is_admin) else None,  # Regular users: user-specific, Admin/Public: all articles
            show_duplicates=show_duplicates if is_admin else True  # Only admin can control duplicate viewing
        )

        if is_admin:
            logger.info(f"✅ Retrieved {len(result.get('articles', []))} articles for admin user {user_id} "
                       f"(page {page} of {result.get('pagination', {}).get('total_pages', 1)}) - showing all users' articles")
        elif is_logged_in:
            logger.info(f"✅ Retrieved {len(result.get('articles', []))} articles for user {user_id} "
                       f"(page {page} of {result.get('pagination', {}).get('total_pages', 1)})")
        else:
            logger.info(f"✅ Retrieved {len(result.get('articles', []))} articles (public view) "
                       f"(page {page} of {result.get('pagination', {}).get('total_pages', 1)})")

        # Add is_admin flag to the response for frontend use
        result['is_admin'] = is_admin

        return jsonify(result)

    except ValueError as e:
        logger.error(f"❌ Invalid parameter in history request: {e}")
        return jsonify({
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"❌ Error in get_articles: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to retrieve articles'
        }), 500


@history_bp.route('/history/<int:article_id>', methods=['GET'])
def get_article_details(article_id):
    """
    Get detailed information for a specific article
    - For admin users: can view any article
    - For regular logged-in users: can only view their own articles
    - For logged-out users: can view any article (public view)
    """
    try:
        # Check if user is logged in and their role
        user_id = session.get('user_id')
        user_role = session.get('user_role', 'user')
        is_logged_in = user_id is not None
        is_admin = user_role == 'admin'
        
        if is_admin:
            logger.info(f"🔍 Getting details for article {article_id} for admin user {user_id}")
        elif is_logged_in:
            logger.info(f"🔍 Getting details for article {article_id} for user {user_id}")
        else:
            logger.info(f"🔍 Getting details for article {article_id} (public view)")

        # Get database service
        db_service = DatabaseService()
        
        # Get article with full details
        article = db_service.get_article_with_details(article_id)
        
        if not article:
            logger.warning(f"⚠️ Article {article_id} not found")
            return jsonify({
                'error': 'Article not found',
                'message': f'No article found with ID {article_id}'
            }), 404

        # If user is logged in (but not admin), check if the article belongs to them
        # Admin users can view any article, regular users can only view their own
        if is_logged_in and not is_admin and article.get('user_id') != user_id:
            logger.warning(f"⚠️ User {user_id} attempted to access article {article_id} owned by user {article.get('user_id')}")
            return jsonify({
                'error': 'Access denied',
                'message': 'You can only view your own articles'
            }), 403

        if is_admin:
            logger.info(f"✅ Retrieved details for article {article_id} for admin user {user_id} (viewing all articles)")
        elif is_logged_in:
            logger.info(f"✅ Retrieved details for article {article_id} for user {user_id}")
        else:
            logger.info(f"✅ Retrieved details for article {article_id} (public view)")

        return jsonify({
            'article': article
        })

    except Exception as e:
        logger.error(f"❌ Error getting article {article_id} details: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to retrieve article details'
        }), 500


@history_bp.route('/history/stats', methods=['GET'])
def get_history_stats():
    """
    Get summary statistics about analysis history
    - For admin users: shows global statistics for all articles
    - For regular logged-in users: shows their personal statistics
    - For logged-out users: shows global statistics for all articles
    """
    try:
        # Check if user is logged in and their role
        user_id = session.get('user_id')
        user_role = session.get('user_role', 'user')
        is_logged_in = user_id is not None
        is_admin = user_role == 'admin'
        
        if is_admin:
            logger.info(f"📈 Getting global history statistics for admin user {user_id}")
        elif is_logged_in:
            logger.info(f"📈 Getting history statistics for user {user_id}")
        else:
            logger.info("📈 Getting global history statistics (public view)")

        # Get database service
        db_service = DatabaseService()
        
        # Get statistics - global for admin and public users, user-specific for regular users
        stats = db_service.get_analysis_statistics(user_id=user_id if (is_logged_in and not is_admin) else None)

        if is_admin:
            logger.info(f"✅ Retrieved global history statistics for admin user {user_id}")
        elif is_logged_in:
            logger.info(f"✅ Retrieved history statistics for user {user_id}")
        else:
            logger.info("✅ Retrieved global history statistics")

        return jsonify(stats)

    except Exception as e:
        logger.error(f"❌ Error getting history stats: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to retrieve statistics'
        }), 500


@history_bp.route('/history/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    """
    Delete an article and its associated data (requires authentication)
    - Admin users can delete any article
    - Regular users can only delete their own articles
    """
    try:
        # Check if user is logged in - deletion requires authentication
        if 'user_id' not in session:
            logger.warning("⚠️ Unauthorized attempt to delete article - user not logged in")
            return jsonify({
                'error': 'Authentication required',
                'message': 'You must be logged in to delete articles'
            }), 401

        user_id = session['user_id']
        user_role = session.get('user_role', 'user')
        is_admin = user_role == 'admin'
        
        if is_admin:
            logger.info(f"🗑️ Admin user {user_id} attempting to delete article {article_id}")
        else:
            logger.info(f"🗑️ User {user_id} attempting to delete article {article_id}")

        # Get database service
        db_service = DatabaseService()
        
        # Check if article exists
        article = db_service.get_article_with_details(article_id)
        if not article:
            logger.warning(f"⚠️ Article {article_id} not found for deletion")
            return jsonify({
                'error': 'Article not found',
                'message': f'No article found with ID {article_id}'
            }), 404

        # Check if the article belongs to the current user (unless admin)
        if not is_admin and article.get('user_id') != user_id:
            logger.warning(f"⚠️ User {user_id} attempted to delete article {article_id} owned by user {article.get('user_id')}")
            return jsonify({
                'error': 'Access denied',
                'message': 'You can only delete your own articles'
            }), 403

        # Delete article (this should cascade to delete breakdown and cross-check results)
        success = db_service.delete_article(article_id)
        
        if success:
            if is_admin:
                logger.info(f"✅ Admin user {user_id} successfully deleted article {article_id} (owned by user {article.get('user_id')})")
            else:
                logger.info(f"✅ Successfully deleted article {article_id} for user {user_id}")
            return jsonify({
                'message': f'Article {article_id} deleted successfully'
            })
        else:
            logger.error(f"❌ Failed to delete article {article_id} for user {user_id}")
            return jsonify({
                'error': 'Delete failed',
                'message': f'Failed to delete article {article_id}'
            }), 500

    except Exception as e:
        logger.error(f"❌ Error deleting article {article_id}: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to delete article'
        }), 500


@history_bp.route('/history/export', methods=['GET'])
def export_history():
    """
    Export analysis history in various formats (requires authentication)
    - Admin users can export all articles
    - Regular users can only export their own articles
    Query parameters:
    - format: Export format (json, csv) - default: json
    - include_breakdown: Include breakdown details (true/false) - default: true
    - include_crosscheck: Include cross-check results (true/false) - default: true
    """
    try:
        # Check if user is logged in - export requires authentication
        if 'user_id' not in session:
            logger.warning("⚠️ Unauthorized access to export history - user not logged in")
            return jsonify({
                'error': 'Authentication required',
                'message': 'You must be logged in to export analysis history'
            }), 401

        user_id = session['user_id']
        user_role = session.get('user_role', 'user')
        is_admin = user_role == 'admin'
        
        export_format = request.args.get('format', 'json').lower()
        include_breakdown = request.args.get('include_breakdown', 'true').lower() == 'true'
        include_crosscheck = request.args.get('include_crosscheck', 'true').lower() == 'true'

        if is_admin:
            logger.info(f"📤 Admin user {user_id} exporting all articles: format={export_format}, "
                       f"breakdown={include_breakdown}, crosscheck={include_crosscheck}")
        else:
            logger.info(f"📤 Exporting history for user {user_id}: format={export_format}, "
                       f"breakdown={include_breakdown}, crosscheck={include_crosscheck}")

        # Get database service
        db_service = DatabaseService()
        
        # Get articles for export - all articles for admin, user-specific for regular users
        all_articles = db_service.get_all_articles_for_export(
            include_breakdown=include_breakdown,
            include_crosscheck=include_crosscheck,
            user_id=user_id if not is_admin else None  # Admin gets all articles, regular users get their own
        )

        if export_format == 'csv':
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = ['ID', 'Title', 'Summary', 'Classification', 'Score', 'Input Type', 'URL', 'Created At']
            if include_breakdown:
                headers.extend(['Breakdown Count', 'Breakdown Details'])
            if include_crosscheck:
                headers.extend(['CrossCheck Count', 'CrossCheck Details'])
            
            writer.writerow(headers)
            
            # Write data
            for article in all_articles:
                row = [
                    article.get('id'),
                    article.get('title'),
                    article.get('summary'),
                    article.get('classification'),
                    article.get('classification_score'),
                    article.get('input_type'),
                    article.get('original_url'),
                    article.get('created_at')
                ]
                
                if include_breakdown:
                    breakdown = article.get('breakdown', [])
                    row.extend([len(breakdown), str(breakdown)])
                    
                if include_crosscheck:
                    crosscheck = article.get('cross_check_results', [])
                    row.extend([len(crosscheck), str(crosscheck)])
                
                writer.writerow(row)
            
            csv_content = output.getvalue()
            output.close()
            
            response = make_response(csv_content)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=truth_guard_history_{datetime.now(PHILIPPINE_TZ).strftime("%Y%m%d_%H%M%S")}.csv'
            
            logger.info(f"✅ Exported {len(all_articles)} articles as CSV")
            return response
            
        else:  # JSON format
            response_data = {
                'export_timestamp': datetime.now(PHILIPPINE_TZ).isoformat(),
                'total_articles': len(all_articles),
                'export_options': {
                    'include_breakdown': include_breakdown,
                    'include_crosscheck': include_crosscheck
                },
                'articles': all_articles
            }
            
            logger.info(f"✅ Exported {len(all_articles)} articles as JSON")
            return jsonify(response_data)

    except Exception as e:
        logger.error(f"❌ Error exporting history: {e}")
        return jsonify({
            'error': 'Export failed',
            'message': 'Failed to export analysis history'
        }), 500


@history_bp.route('/articles/<int:article_id>/duplicates', methods=['GET'])
def get_article_duplicates(article_id):
    """
    Get information about duplicate articles (users who have the same article)
    - Admin only endpoint
    """
    try:
        # Get user info from session
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        is_logged_in = bool(user_id)
        is_admin = user_role == 'admin'

        if not is_logged_in or not is_admin:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Admin access required'
            }), 401

        logger.info(f"🔍 Getting duplicate info for article {article_id} by admin {user_id}")

        try:
            # Get the article to find similar ones
            db = DatabaseService()
            article_data = db.get_article_by_id(article_id)
            
            if not article_data or not article_data.get('article'):
                logger.warning(f"❌ Article {article_id} not found")
                return jsonify({
                    'error': 'Not found',
                    'message': 'Article not found'
                }), 404

            article = article_data['article']
            logger.info(f"📄 Found article: title='{article.title}', url='{article.link}'")

            # Get all articles with the same title and URL (duplicates)
            duplicates = db.get_duplicate_articles(article.title, article.link)
            
            logger.info(f"🔄 Found {len(duplicates)} duplicate articles")
            
            # Extract unique users who have this article
            users = []
            seen_users = set()
            
            for dup_article in duplicates:
                if dup_article.user_id and dup_article.user_id not in seen_users:
                    user_info = db.get_user_by_id(dup_article.user_id)
                    if user_info:
                        users.append({
                            'id': user_info['id'],
                            'username': user_info['username'],
                            'email': user_info['email']
                        })
                        seen_users.add(dup_article.user_id)

            logger.info(f"✅ Found {len(users)} users with duplicate articles for article {article_id}")

            return jsonify({
                'article_id': article_id,
                'users': users,
                'total_duplicates': len(duplicates)
            })
            
        except Exception as db_error:
            logger.error(f"❌ Database error in get_article_duplicates: {db_error}")
            logger.exception("Full traceback:")
            return jsonify({
                'error': 'Database error',
                'message': f'Failed to get duplicate information: {str(db_error)}'
            }), 500

    except Exception as e:
        logger.error(f"❌ Error getting article duplicates: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to get duplicate information'
        }), 500


@history_bp.route('/articles/<int:article_id>/delete-for-user', methods=['DELETE'])
def delete_article_for_user(article_id):
    """
    Delete article for a specific user
    - Admin only endpoint
    """
    try:
        # Get user info from session
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        is_logged_in = bool(user_id)
        is_admin = user_role == 'admin'

        if not is_logged_in or not is_admin:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Admin access required'
            }), 401

        # Get target user ID from request body
        data = request.get_json()
        target_user_id = data.get('user_id') if data else None
        
        if not target_user_id:
            return jsonify({
                'error': 'Bad request',
                'message': 'user_id is required'
            }), 400

        logger.info(f"🗑️ Admin {user_id} deleting article {article_id} for user {target_user_id}")

        db = DatabaseService()
        
        # Find the specific article for this user
        article = db.get_article_by_id_and_user(article_id, target_user_id)
        
        if not article:
            return jsonify({
                'error': 'Not found',
                'message': 'Article not found for the specified user'
            }), 404

        # Delete the article
        success = db.delete_article_for_user(article_id, target_user_id)
        
        if not success:
            return jsonify({
                'error': 'Internal server error',
                'message': 'Failed to delete article'
            }), 500

        logger.info(f"✅ Successfully deleted article {article_id} for user {target_user_id}")

        return jsonify({
            'success': True,
            'message': f'Article deleted for user {target_user_id}'
        })

    except Exception as e:
        logger.error(f"❌ Error deleting article for user: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to delete article'
        }), 500


@history_bp.route('/articles/<int:article_id>/delete-all', methods=['DELETE'])
def delete_article_for_all_users(article_id):
    """
    Delete article for all users (complete removal from system)
    - Admin only endpoint
    """
    try:
        # Get user info from session
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        is_logged_in = bool(user_id)
        is_admin = user_role == 'admin'

        if not is_logged_in or not is_admin:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Admin access required'
            }), 401

        logger.info(f"🗑️ Admin {user_id} deleting article {article_id} for ALL users")

        db = DatabaseService()
        
        # Get the article to find all duplicates
        article_data = db.get_article_by_id(article_id)
        
        if not article_data or not article_data.get('article'):
            return jsonify({
                'error': 'Not found',
                'message': 'Article not found'
            }), 404

        article = article_data['article']

        # Delete all articles with the same title and URL (all duplicates)
        deleted_count = db.delete_all_duplicate_articles(article.title, article.link)
        
        logger.info(f"✅ Successfully deleted {deleted_count} duplicate articles for article {article_id}")

        return jsonify({
            'success': True,
            'message': f'Article deleted for all users ({deleted_count} entries removed)',
            'deleted_count': deleted_count
        })

    except Exception as e:
        logger.error(f"❌ Error deleting article for all users: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to delete article'
        }), 500


# Error handlers for the blueprint
@history_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found'
    }), 404


@history_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500
