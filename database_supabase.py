"""
TruthGuard Database Service
Direct Supabase connection for the fact-checking application database.
"""

import os
import json
import traceback
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any, Union
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Philippine timezone (UTC+8)
PHILIPPINE_TZ = timezone(timedelta(hours=8))

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") 
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Global Supabase client
supabase: Optional[Client] = None

# ---------- Helper Functions ----------

def _coerce_text(value):
    """
    Ensure DB-bound TEXT fields are strings (or None).
    - If dict with 'summary' key -> use that human text.
    - If bytes -> decode utf-8.
    - Else json.dumps for non-strings.
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="ignore")
        except Exception:
            return value.decode(errors="ignore")
    if isinstance(value, dict) and isinstance(value.get("summary"), str):
        return value["summary"]
    return json.dumps(value, ensure_ascii=False)


def get_philippine_time():
    """Get current Philippine time"""
    return datetime.now(PHILIPPINE_TZ)


def init_supabase():
    """Initialize Supabase client"""
    global supabase
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing Supabase configuration")
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    
    try:
        # Use service key for full database access
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Supabase client initialized successfully")
        return supabase
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
        raise


def get_supabase_client() -> Client:
    """Get the Supabase client, initializing if needed"""
    global supabase
    if supabase is None:
        supabase = init_supabase()
    return supabase


class DatabaseService:
    """
    Database service class to handle all database operations with direct Supabase connection.
    """
    
    @staticmethod
    def _normalize_input_type(value: str) -> str:
        """Normalize input type to 'url' or 'snippet'"""
        if not value:
            return 'snippet'
        v = value.strip().lower()
        if v in ('url', 'link', 'weblink'):
            return 'url'
        if v in ('snippet', 'text', 'manual'):
            return 'snippet'
        return 'snippet'

    @classmethod
    def save_analysis_results(cls, analysis_data, user_id=None):
        """
        Save complete analysis results to Supabase database with user-specific handling.
        
        Args:
            analysis_data: Dictionary containing analysis results
            user_id: ID of the user performing the analysis
            
        Returns:
            dict: Contains 'article_id', 'is_duplicate', and optionally 'existing_article'
        """
        try:
            client = get_supabase_client()
            
            # Use cls instead of DatabaseService to avoid attribute resolution issues
            input_type = cls._normalize_input_type(
                analysis_data.get('inputMethod', 'snippet')
            )

            # Coerce possibly non-string fields
            title = _coerce_text(analysis_data.get('title', ''))
            link = _coerce_text(analysis_data.get('url'))
            content = _coerce_text(analysis_data.get('content', ''))

            # ALWAYS coerce summary to a string (handles dicts & bytes)
            summary = analysis_data.get('summary')
            if summary is None or summary == '':
                summary = content[:500] + "..." if len(content) > 500 else content
            summary = _coerce_text(summary)

            # Check for existing article for this user (duplicate detection)
            if user_id:
                existing_article = cls.check_duplicate_article(title, link, summary, user_id)
                if existing_article:
                    print(f"🔍 Found duplicate article for user {user_id}: {existing_article['id']}")
                    return {
                        'article_id': existing_article['id'],
                        'is_duplicate': True,
                        'existing_article': existing_article
                    }

            factuality_description = _coerce_text(
                analysis_data.get('results', {}).get('factuality_description')
            )

            # Create new article with fresh analysis
            article_data = {
                'title': title,
                'link': link,
                'content': content,
                'summary': summary,
                'input_type': input_type,
                'analysis_date': get_philippine_time().isoformat(),
                'factuality_score': analysis_data.get('results', {}).get('factuality_score'),
                'factuality_level': analysis_data.get('results', {}).get('factuality_level'),
                'factuality_description': factuality_description,
                'classification': analysis_data.get('results', {}).get('prediction'),
                'user_id': user_id,
                'created_at': get_philippine_time().isoformat(),
                'updated_at': get_philippine_time().isoformat()
            }

            # Handle cross_check_data
            if 'cross_check_data' in analysis_data:
                cross_check_data = analysis_data['cross_check_data']
                if isinstance(cross_check_data, dict):
                    article_data['cross_check_data'] = json.dumps(cross_check_data, ensure_ascii=False)
                else:
                    article_data['cross_check_data'] = _coerce_text(cross_check_data)

            # Insert article
            result = client.table('articles').insert(article_data).execute()
            
            if not result.data:
                raise Exception("Failed to insert article")
            
            article_id = result.data[0]['id']
            print(f"✅ Article saved with ID: {article_id}")

            # Save breakdown data
            breakdown_data_input = analysis_data.get('breakdown', {})
            if breakdown_data_input:
                breakdown_data = {
                    'article_id': article_id,
                    'claim_verification': _coerce_text(breakdown_data_input.get('claim_verification')),
                    'internal_consistency': _coerce_text(breakdown_data_input.get('internal_consistency')),
                    'source_assessment': _coerce_text(breakdown_data_input.get('source_assessment')),
                    'content_quality': _coerce_text(breakdown_data_input.get('content_quality')),
                    'analysis_conclusion': _coerce_text(breakdown_data_input.get('analysis_conclusion')),
                    'created_at': get_philippine_time().isoformat()
                }
                
                client.table('breakdowns').insert(breakdown_data).execute()
                print(f"✅ Breakdown data saved for article {article_id}")

            # Save CrossCheckResult list
            for item in analysis_data.get('crosscheck_results', []):
                crosscheck_data = {
                    'article_id': article_id,
                    'source_name': _coerce_text(item.get('source_name', '')),
                    'search_query': _coerce_text(item.get('search_query')),
                    'match_title': _coerce_text(item.get('match_title')),
                    'match_url': _coerce_text(item.get('match_url')),
                    'similarity_score': item.get('similarity_score'),
                    'created_at': get_philippine_time().isoformat()
                }
                
                client.table('crosscheckresults').insert(crosscheck_data).execute()
            
            if analysis_data.get('crosscheck_results'):
                print(f"✅ Cross-check results saved for article {article_id}")

            return {
                'article_id': article_id,
                'is_duplicate': False,
                'is_global_reuse': False
            }

        except Exception as e:
            print(f"❌ Error saving analysis results: {e}")
            traceback.print_exc()
            raise e
    
    @staticmethod
    def get_article_by_id(article_id):
        """Get complete article data with all related records"""
        try:
            client = get_supabase_client()
            
            # Get article
            article_result = client.table('articles').select('*').eq('id', article_id).execute()
            
            if not article_result.data:
                return None
            
            article = article_result.data[0]
            
            # Get breakdown
            breakdown_result = client.table('breakdowns').select('*').eq('article_id', article_id).execute()
            breakdown = breakdown_result.data[0] if breakdown_result.data else None
            
            # Get crosscheck results
            crosscheck_result = client.table('crosscheckresults').select('*').eq('article_id', article_id).execute()
            crosscheck_results = crosscheck_result.data if crosscheck_result.data else []
            
            return {
                'article': article,
                'breakdown': breakdown,
                'crosscheck_results': crosscheck_results
            }
        except Exception as e:
            print(f"❌ Error getting article by ID: {e}")
            return None
    
    @staticmethod
    def get_recent_articles(limit=10, user_id=None):
        """Get recent articles for a specific user or all articles if no user specified"""
        try:
            client = get_supabase_client()
            
            query = client.table('articles').select('*')
            if user_id:
                query = query.eq('user_id', user_id)
            
            result = query.order('created_at', desc=True).limit(limit).execute()
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ Error getting recent articles: {e}")
            return []
    
    @staticmethod
    def get_articles_by_classification(classification, user_id=None):
        """Get articles by classification for a specific user or all articles if no user specified"""
        try:
            client = get_supabase_client()
            
            query = client.table('articles').select('*').eq('classification', classification)
            if user_id:
                query = query.eq('user_id', user_id)
            
            result = query.execute()
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ Error getting articles by classification: {e}")
            return []

    @staticmethod
    def get_articles_with_pagination(page=1, limit=50, search='', classification='', input_type='', 
                                     sort_by='created_at', sort_order='desc', user_id=None, show_duplicates=True):
        """
        Get articles with pagination, search, and filtering for a specific user
        """
        try:
            client = get_supabase_client()
            
            # Start with base query
            query = client.table('articles').select('*', count='exact')
            
            # Apply user filter
            if user_id:
                query = query.eq('user_id', user_id)
            
            # Apply search filter
            if search:
                # Use text search on multiple fields
                search_query = f"title.ilike.*{search}*,content.ilike.*{search}*,summary.ilike.*{search}*"
                query = query.or_(search_query)
            
            # Apply classification filter
            if classification:
                query = query.eq('classification', classification)
            
            # Apply input type filter
            if input_type:
                query = query.eq('input_type', input_type)
            
            # Apply sorting
            valid_sort_fields = ['created_at', 'title', 'factuality_score', 'classification']
            if sort_by not in valid_sort_fields:
                sort_by = 'created_at'
            
            desc = sort_order.lower() == 'desc'
            query = query.order(sort_by, desc=desc)
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.range(offset, offset + limit - 1)
            
            result = query.execute()
            articles = result.data if result.data else []
            total_count = result.count if result.count else 0
            
            # Convert to expected format
            articles_data = []
            for article in articles:
                article_data = {
                    'id': article['id'],
                    'title': article['title'],
                    'summary': article['summary'],
                    'classification': article['classification'],
                    'classification_score': article['factuality_score'] / 100.0 if article['factuality_score'] else 0,
                    'input_type': article['input_type'],
                    'original_url': article['link'],
                    'created_at': article['created_at'],
                    'content': article['content'],
                    'factuality_level': article['factuality_level'],
                    'factuality_description': article['factuality_description'],
                    'user_id': article['user_id']
                }
                articles_data.append(article_data)
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit
            
            return {
                'articles': articles_data,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_articles': total_count,
                    'articles_per_page': limit,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                }
            }
            
        except Exception as e:
            print(f"❌ Error in get_articles_with_pagination: {e}")
            raise e

    @staticmethod
    def get_article_with_details(article_id):
        """Get complete article details including breakdown and cross-check results"""
        try:
            client = get_supabase_client()
            
            # Get article
            article_result = client.table('articles').select('*').eq('id', article_id).execute()
            
            if not article_result.data:
                return None
            
            article = article_result.data[0]
            
            # Build article dict
            article_dict = {
                'id': article['id'],
                'title': article['title'],
                'summary': article['summary'],
                'classification': article['classification'],
                'classification_score': article['factuality_score'] / 100.0 if article['factuality_score'] else 0,
                'input_type': article['input_type'],
                'original_url': article['link'],
                'created_at': article['created_at'],
                'content': article['content'],
                'factuality_level': article['factuality_level'],
                'factuality_description': article['factuality_description'],
                'user_id': article['user_id'],
                'breakdown': [],
                'cross_check_results': []
            }
            
            # Get breakdown data
            breakdown_result = client.table('breakdowns').select('*').eq('article_id', article_id).execute()
            if breakdown_result.data:
                breakdown = breakdown_result.data[0]
                article_dict['breakdown'] = [
                    {
                        'aspect': 'Claim Verification',
                        'analysis': breakdown.get('claim_verification', 'No analysis available'),
                        'score': None
                    },
                    {
                        'aspect': 'Internal Consistency',
                        'analysis': breakdown.get('internal_consistency', 'No analysis available'),
                        'score': None
                    },
                    {
                        'aspect': 'Source Assessment',
                        'analysis': breakdown.get('source_assessment', 'No analysis available'),
                        'score': None
                    },
                    {
                        'aspect': 'Content Quality',
                        'analysis': breakdown.get('content_quality', 'No analysis available'),
                        'score': None
                    },
                    {
                        'aspect': 'Analysis Conclusion',
                        'analysis': breakdown.get('analysis_conclusion', 'No conclusion available'),
                        'score': None
                    }
                ]
            
            # Get cross-check results
            crosscheck_result = client.table('crosscheckresults').select('*').eq('article_id', article_id).execute()
            if crosscheck_result.data:
                for result in crosscheck_result.data:
                    article_dict['cross_check_results'].append({
                        'source_name': result.get('source_name'),
                        'search_query': result.get('search_query'),
                        'match_title': result.get('match_title'),
                        'match_url': result.get('match_url'),
                        'similarity_score': result.get('similarity_score')
                    })
            
            return article_dict
            
        except Exception as e:
            print(f"❌ Error getting article details: {e}")
            raise e

    @staticmethod
    def get_analysis_statistics(user_id=None):
        """Get summary statistics about analysis history for a specific user or all users"""
        try:
            client = get_supabase_client()
            
            # Base query
            query = client.table('articles').select('*', count='exact')
            if user_id:
                query = query.eq('user_id', user_id)
            
            # Get total count
            total_result = query.execute()
            total_articles = total_result.count if total_result.count else 0
            
            # Classification breakdown
            real_result = client.table('articles').select('*', count='exact').eq('classification', 'Real')
            if user_id:
                real_result = real_result.eq('user_id', user_id)
            real_count = real_result.execute().count or 0
            
            fake_result = client.table('articles').select('*', count='exact').eq('classification', 'Fake')
            if user_id:
                fake_result = fake_result.eq('user_id', user_id)
            fake_count = fake_result.execute().count or 0
            
            # Input type breakdown
            url_result = client.table('articles').select('*', count='exact').eq('input_type', 'url')
            if user_id:
                url_result = url_result.eq('user_id', user_id)
            url_count = url_result.execute().count or 0
            
            snippet_result = client.table('articles').select('*', count='exact').eq('input_type', 'snippet')
            if user_id:
                snippet_result = snippet_result.eq('user_id', user_id)
            snippet_count = snippet_result.execute().count or 0
            
            # Recent activity (last 7 days)
            seven_days_ago = (datetime.now(PHILIPPINE_TZ) - timedelta(days=7)).isoformat()
            recent_result = client.table('articles').select('*', count='exact').gte('created_at', seven_days_ago)
            if user_id:
                recent_result = recent_result.eq('user_id', user_id)
            recent_count = recent_result.execute().count or 0
            
            # Average factuality score
            all_articles = client.table('articles').select('factuality_score')
            if user_id:
                all_articles = all_articles.eq('user_id', user_id)
            
            articles_data = all_articles.execute().data or []
            scores = [a['factuality_score'] for a in articles_data if a['factuality_score'] is not None]
            avg_score = round(sum(scores) / len(scores), 1) if scores else 0
            
            return {
                'total_articles': total_articles,
                'classifications': {
                    'Real': real_count,
                    'Fake': fake_count
                },
                'input_types': {
                    'url': url_count,
                    'snippet': snippet_count
                },
                'recent_activity': {
                    'last_7_days': recent_count
                },
                'average_factuality_score': avg_score,
                'last_updated': get_philippine_time().isoformat(),
                'user_specific': user_id is not None
            }
            
        except Exception as e:
            print(f"❌ Error getting statistics: {e}")
            raise e

    @staticmethod
    def check_duplicate_article(title, link, summary, user_id):
        """
        Check if an article already exists for a specific user.
        Returns the existing article if found, None otherwise.
        """
        try:
            client = get_supabase_client()
            
            title = _coerce_text(title)
            link = _coerce_text(link)
            summary = _coerce_text(summary)
            
            query = client.table('articles').select('*').eq('user_id', user_id).eq('title', title)
            
            if link:
                query = query.eq('link', link)
            if summary:
                query = query.eq('summary', summary)
            
            result = query.execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            print(f"❌ Error checking duplicate article: {e}")
            return None

    @staticmethod
    def find_global_article(title, link, summary):
        """
        Find if any user has analyzed the same content (for global result sharing).
        Returns the first matching article if found, None otherwise.
        """
        try:
            client = get_supabase_client()
            
            title = _coerce_text(title)
            link = _coerce_text(link)
            summary = _coerce_text(summary)
            
            # First, try exact match for all fields
            query = client.table('articles').select('*').eq('title', title)
            if link:
                query = query.eq('link', link)
            if summary:
                query = query.eq('summary', summary)
            
            result = query.execute()
            if result.data:
                print(f"🔍 Found exact global match: article {result.data[0]['id']}")
                return result.data[0]
            
            # If no exact match and we have a URL, try matching by URL only
            if link and link.strip():
                url_result = client.table('articles').select('*').eq('link', link).execute()
                if url_result.data:
                    print(f"🔍 Found URL match: article {url_result.data[0]['id']}")
                    return url_result.data[0]
            
            print("ℹ️ No matching content found in global database")
            return None
            
        except Exception as e:
            print(f"❌ Error finding global article: {e}")
            return None

    @staticmethod
    def get_complete_analysis_result(article_id):
        """
        Get a complete analysis result in the same format as prediction API response.
        """
        try:
            article_data = DatabaseService.get_article_with_details(article_id)
            if not article_data:
                return None
            
            # Build the complete result structure matching prediction API format
            result = {
                'prediction': article_data.get('classification', 'Unknown'),
                'confidence': (article_data.get('classification_score', 0) or 0),
                'factuality_score': int((article_data.get('classification_score', 0) or 0) * 100),
                'factuality_level': article_data.get('factuality_level') or 'Unknown',
                'factuality_description': article_data.get('factuality_description') or 'No description available',
                'content_preview': article_data.get('content') or '',
                'extracted_content': {
                    'title': article_data.get('title', 'Unknown Title'),
                    'content_preview': article_data.get('content') or ''
                }
            }
            
            # Add content summary
            result['content_summary'] = {
                'summary': article_data.get('summary') or 'No summary available',
                'word_count': len((article_data.get('content') or '').split()),
                'source': 'stored_analysis'
            }
            
            # Add factuality breakdown if available
            breakdown_data = article_data.get('breakdown', [])
            if breakdown_data:
                result['factuality_breakdown'] = {
                    'claim_verification': next((b['analysis'] for b in breakdown_data if b['aspect'] == 'Claim Verification'), 'No analysis available'),
                    'internal_consistency': next((b['analysis'] for b in breakdown_data if b['aspect'] == 'Internal Consistency'), 'No analysis available'),
                    'source_assessment': next((b['analysis'] for b in breakdown_data if b['aspect'] == 'Source Assessment'), 'No analysis available'),
                    'content_quality': next((b['analysis'] for b in breakdown_data if b['aspect'] == 'Content Quality'), 'No analysis available'),
                    'analysis_conclusion': next((b['analysis'] for b in breakdown_data if b['aspect'] == 'Analysis Conclusion'), 'No conclusion available')
                }
            
            # Add cross-check results
            cross_check_results = article_data.get('cross_check_results', [])
            result['cross_check'] = {
                'total_sources_searched': len(cross_check_results),
                'matches_found': len([r for r in cross_check_results if r.get('similarity_score', 0) > 70]),
                'matches': cross_check_results[:5],  # Limit to first 5 matches
                'confidence': 'High' if len(cross_check_results) > 2 else 'Medium'
            }
            
            return result
            
        except Exception as e:
            print(f"❌ Error getting complete analysis result: {e}")
            return None

    @staticmethod
    def delete_article(article_id):
        """Delete an article and its associated data"""
        try:
            client = get_supabase_client()
            
            # Delete breakdown records
            client.table('breakdowns').delete().eq('article_id', article_id).execute()
            
            # Delete cross-check results
            client.table('crosscheckresults').delete().eq('article_id', article_id).execute()
            
            # Delete the article
            result = client.table('articles').delete().eq('id', article_id).execute()
            
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error deleting article: {e}")
            raise e

    @staticmethod
    def delete_article_for_user(article_id, user_id):
        """Delete an article for a specific user"""
        try:
            client = get_supabase_client()
            
            # Verify article belongs to user
            article_result = client.table('articles').select('id').eq('id', article_id).eq('user_id', user_id).execute()
            if not article_result.data:
                return False
            
            # Delete breakdown records
            client.table('breakdowns').delete().eq('article_id', article_id).execute()
            
            # Delete cross-check results
            client.table('crosscheckresults').delete().eq('article_id', article_id).execute()
            
            # Delete the article
            result = client.table('articles').delete().eq('id', article_id).eq('user_id', user_id).execute()
            
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error deleting article for user: {e}")
            raise e

    @staticmethod
    def get_article_by_id_and_user(article_id, user_id):
        """Get an article by ID and user ID"""
        try:
            client = get_supabase_client()
            
            result = client.table('articles').select('*').eq('id', article_id).eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            print(f"❌ Error getting article by ID and user: {e}")
            return None

    @staticmethod
    def get_all_articles_for_export(include_breakdown=True, include_crosscheck=True, user_id=None):
        """Get all articles for export purposes, optionally filtered by user"""
        try:
            client = get_supabase_client()
            
            # Get articles
            query = client.table('articles').select('*')
            if user_id:
                query = query.eq('user_id', user_id)
            
            articles_result = query.order('created_at', desc=True).execute()
            articles = articles_result.data if articles_result.data else []
            
            articles_data = []
            for article in articles:
                article_dict = {
                    'id': article['id'],
                    'title': article['title'],
                    'link': article['link'],
                    'content': article['content'],
                    'summary': article['summary'],
                    'input_type': article['input_type'],
                    'analysis_date': article['analysis_date'],
                    'factuality_score': article['factuality_score'],
                    'factuality_level': article['factuality_level'],
                    'factuality_description': article['factuality_description'],
                    'classification': article['classification'],
                    'cross_check_data': article['cross_check_data'],
                    'created_at': article['created_at'],
                    'updated_at': article['updated_at'],
                    'user_id': article['user_id']
                }
                
                if include_breakdown:
                    breakdown_result = client.table('breakdowns').select('*').eq('article_id', article['id']).execute()
                    article_dict['breakdown'] = breakdown_result.data[0] if breakdown_result.data else None
                
                if include_crosscheck:
                    crosscheck_result = client.table('crosscheckresults').select('*').eq('article_id', article['id']).execute()
                    article_dict['crosscheck_results'] = crosscheck_result.data if crosscheck_result.data else []
                
                articles_data.append(article_dict)
            
            return articles_data
            
        except Exception as e:
            print(f"❌ Error getting articles for export: {e}")
            raise e
    
    # ========================== USER MANAGEMENT METHODS ==========================
    
    @staticmethod
    def create_user(username, email, password_hash):
        """
        Create a new user account.
        Returns user ID if successful, None if failed.
        """
        try:
            client = get_supabase_client()
            
            user_data = {
                'username': username,
                'email': email,
                'password_hash': password_hash,
                'role': 'user',
                'created_at': get_philippine_time().isoformat(),
                'is_active': True
            }
            
            result = client.table('users').insert(user_data).execute()
            
            if result.data:
                user_id = result.data[0]['id']
                print(f"✅ User created successfully: {username} ({email})")
                return user_id
            
            return None
            
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            return None
    
    @staticmethod
    def get_user_by_username(username):
        """
        Get user by username.
        Returns user dict or None if not found.
        """
        try:
            client = get_supabase_client()
            
            result = client.table('users').select('*').eq('username', username).eq('is_active', True).execute()
            
            if result.data:
                user = result.data[0]
                return {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'password_hash': user['password_hash'],
                    'role': user['role'],
                    'created_at': user['created_at'],
                    'last_login': user.get('last_login'),
                    'is_active': user['is_active']
                }
            return None
            
        except Exception as e:
            print(f"❌ Error getting user by username {username}: {e}")
            return None
    
    @staticmethod
    def get_user_by_email(email):
        """
        Get user by email address.
        Returns user dict or None if not found.
        """
        try:
            client = get_supabase_client()
            
            result = client.table('users').select('*').eq('email', email.lower()).eq('is_active', True).execute()
            
            if result.data:
                user = result.data[0]
                return {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'password_hash': user['password_hash'],
                    'role': user['role'],
                    'created_at': user['created_at'],
                    'last_login': user.get('last_login'),
                    'is_active': user['is_active']
                }
            return None
            
        except Exception as e:
            print(f"❌ Error getting user by email {email}: {e}")
            return None

    @staticmethod
    def get_user_by_id(user_id):
        """
        Get user by ID.
        Returns user dict or None if not found.
        """
        try:
            client = get_supabase_client()
            
            result = client.table('users').select('*').eq('id', user_id).eq('is_active', True).execute()
            
            if result.data:
                user = result.data[0]
                return {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'password_hash': user['password_hash'],
                    'role': user['role'],
                    'created_at': user['created_at'],
                    'last_login': user.get('last_login'),
                    'is_active': user['is_active']
                }
            return None
            
        except Exception as e:
            print(f"❌ Error getting user by ID {user_id}: {e}")
            return None
    
    @staticmethod
    def update_last_login(user_id):
        """
        Update user's last login timestamp.
        """
        try:
            client = get_supabase_client()
            
            update_data = {
                'last_login': get_philippine_time().isoformat()
            }
            
            result = client.table('users').update(update_data).eq('id', user_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error updating last login for user {user_id}: {e}")
            return False
    
    @staticmethod
    def deactivate_user(user_id):
        """
        Deactivate user account (soft delete).
        """
        try:
            client = get_supabase_client()
            
            update_data = {
                'is_active': False
            }
            
            result = client.table('users').update(update_data).eq('id', user_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error deactivating user {user_id}: {e}")
            return False

    @staticmethod
    def update_user_password(user_id, password_hash):
        """Update user password"""
        try:
            client = get_supabase_client()
            
            update_data = {
                'password_hash': password_hash,
                'last_password_reset': get_philippine_time().isoformat()
            }
            
            result = client.table('users').update(update_data).eq('id', user_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error updating password for user {user_id}: {e}")
            return False

    @staticmethod
    def update_user_username(user_id, new_username):
        """
        Update user's username if it's not already taken.
        """
        try:
            client = get_supabase_client()
            
            # Check if username is already taken by another user
            existing_result = client.table('users').select('id').eq('username', new_username).execute()
            if existing_result.data and existing_result.data[0]['id'] != user_id:
                return False
            
            update_data = {
                'username': new_username
            }
            
            result = client.table('users').update(update_data).eq('id', user_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error updating username for user {user_id}: {e}")
            return False

    @staticmethod
    def update_user_email(user_id, new_email):
        """
        Update user's email if it's not already taken.
        """
        try:
            client = get_supabase_client()
            
            # Check if email is already taken by another user
            existing_result = client.table('users').select('id').eq('email', new_email).execute()
            if existing_result.data and existing_result.data[0]['id'] != user_id:
                return False
            
            update_data = {
                'email': new_email
            }
            
            result = client.table('users').update(update_data).eq('id', user_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error updating email for user {user_id}: {e}")
            return False

    # =================== FEEDBACK SERVICE METHODS ===================
    
    @staticmethod
    def save_feedback(name, comments, rating, user_id=None):
        """
        Save user feedback to the database.
        
        Args:
            name (str): Optional name of the feedback submitter
            comments (str): Required feedback text
            rating (int): Required rating from 1-5
            user_id (int, optional): ID of authenticated user, None for guest feedback
            
        Returns:
            dict: Contains 'success', 'feedback_id', and optional 'error' keys
        """
        try:
            client = get_supabase_client()
            
            # Validate rating
            if not isinstance(rating, int) or rating < 1 or rating > 5:
                return {'success': False, 'error': 'Rating must be between 1 and 5'}
            
            # Validate comments
            if not comments or not comments.strip():
                return {'success': False, 'error': 'Comments are required'}
            
            # Create feedback entry
            feedback_data = {
                'name': name.strip() if name else None,
                'comments': comments.strip(),
                'rating': rating,
                'user_id': user_id,
                'submission_date': get_philippine_time().isoformat()
            }
            
            result = client.table('feedback').insert(feedback_data).execute()
            
            if result.data:
                feedback_id = result.data[0]['id']
                print(f"✅ Feedback saved successfully: ID {feedback_id}, Rating {rating}, User {user_id or 'Guest'}")
                
                return {
                    'success': True,
                    'feedback_id': feedback_id,
                    'message': 'Thank you for your feedback!'
                }
            
            return {'success': False, 'error': 'Failed to save feedback'}
            
        except Exception as e:
            print(f"❌ Error saving feedback: {e}")
            return {'success': False, 'error': 'Failed to save feedback. Please try again.'}
    
    @staticmethod
    def get_feedback_statistics():
        """
        Get feedback statistics for admin/analytics purposes.
        
        Returns:
            dict: Contains feedback statistics including ratings distribution
        """
        try:
            client = get_supabase_client()
            
            # Get all feedback
            all_feedback_result = client.table('feedback').select('*').execute()
            all_feedback = all_feedback_result.data if all_feedback_result.data else []
            
            total_feedback = len(all_feedback)
            
            # Rating distribution
            rating_distribution = {str(i): 0 for i in range(1, 6)}
            ratings = [f['rating'] for f in all_feedback if f['rating']]
            
            for rating in ratings:
                rating_distribution[str(rating)] += 1
            
            # Average rating
            avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0
            
            # Recent feedback (last 30 days)
            thirty_days_ago = (datetime.now(PHILIPPINE_TZ) - timedelta(days=30)).isoformat()
            recent_feedback_result = client.table('feedback').select('*', count='exact').gte('submission_date', thirty_days_ago).execute()
            recent_feedback = recent_feedback_result.count or 0
            
            # User vs Guest feedback
            user_feedback = len([f for f in all_feedback if f['user_id'] is not None])
            guest_feedback = total_feedback - user_feedback
            
            return {
                'total_feedback': total_feedback,
                'average_rating': avg_rating,
                'rating_distribution': rating_distribution,
                'recent_feedback_30_days': recent_feedback,
                'user_feedback': user_feedback,
                'guest_feedback': guest_feedback,
                'last_updated': get_philippine_time().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error getting feedback statistics: {e}")
            return {
                'total_feedback': 0,
                'average_rating': 0,
                'rating_distribution': {str(i): 0 for i in range(1, 6)},
                'recent_feedback_30_days': 0,
                'user_feedback': 0,
                'guest_feedback': 0,
                'error': str(e)
            }
    
    @staticmethod
    def get_user_feedback_history(user_id, limit=10):
        """
        Get feedback history for a specific user.
        
        Args:
            user_id (int): ID of the user
            limit (int): Maximum number of feedback entries to return
            
        Returns:
            list: List of feedback entries for the user
        """
        try:
            client = get_supabase_client()
            
            result = client.table('feedback').select('*').eq('user_id', user_id).order('submission_date', desc=True).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ Error getting user feedback history: {e}")
            return []

    # =================== GAME STATISTICS METHODS ===================
    
    @staticmethod
    def get_user_game_stats(user_id):
        """
        Get game statistics for a specific user.
        
        Args:
            user_id (int): ID of the user
            
        Returns:
            dict: User game statistics or None if not found
        """
        try:
            client = get_supabase_client()
            
            result = client.table('user_game_stats').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                stats = result.data[0]
                return {
                    'id': stats['id'],
                    'user_id': stats['user_id'],
                    'games_played': stats['games_played'] or 0,
                    'total_xp_earned': stats['total_xp_earned'] or 0,
                    'overall_accuracy': stats['overall_accuracy'] or 0.0,
                    'total_correct_answers': stats['total_correct_answers'] or 0,
                    'total_rounds_played': stats['total_rounds_played'] or 0,
                    'first_played_at': stats['first_played_at'],
                    'last_played_at': stats['last_played_at']
                }
            return None
                
        except Exception as e:
            print(f"❌ Error getting user game stats: {e}")
            return None
    
    @staticmethod
    def update_user_game_stats(user_id, xp_earned, correct_answers):
        """
        Update user game statistics after completing a game.
        
        Args:
            user_id (int): ID of the user
            xp_earned (int): XP earned in this game
            correct_answers (int): Number of correct answers in this game (out of 10)
            
        Returns:
            dict: Updated statistics or error information
        """
        try:
            client = get_supabase_client()
            
            # Get current stats
            existing_result = client.table('user_game_stats').select('*').eq('user_id', user_id).execute()
            
            current_time = get_philippine_time().isoformat()
            
            if existing_result.data:
                # Update existing stats
                current_stats = existing_result.data[0]
                
                new_games_played = (current_stats['games_played'] or 0) + 1
                new_total_xp = (current_stats['total_xp_earned'] or 0) + xp_earned
                new_total_correct = (current_stats['total_correct_answers'] or 0) + correct_answers
                new_total_rounds = (current_stats['total_rounds_played'] or 0) + 10
                new_accuracy = (new_total_correct / new_total_rounds) * 100 if new_total_rounds > 0 else 0.0
                
                update_data = {
                    'games_played': new_games_played,
                    'total_xp_earned': new_total_xp,
                    'total_correct_answers': new_total_correct,
                    'total_rounds_played': new_total_rounds,
                    'overall_accuracy': new_accuracy,
                    'last_played_at': current_time,
                    'updated_at': current_time
                }
                
                # Set first_played_at if it doesn't exist
                if not current_stats['first_played_at']:
                    update_data['first_played_at'] = current_time
                
                result = client.table('user_game_stats').update(update_data).eq('user_id', user_id).execute()
                
            else:
                # Create new stats
                accuracy = (correct_answers / 10) * 100 if correct_answers > 0 else 0.0
                
                insert_data = {
                    'user_id': user_id,
                    'games_played': 1,
                    'total_xp_earned': xp_earned,
                    'total_correct_answers': correct_answers,
                    'total_rounds_played': 10,
                    'overall_accuracy': accuracy,
                    'first_played_at': current_time,
                    'last_played_at': current_time,
                    'created_at': current_time,
                    'updated_at': current_time
                }
                
                result = client.table('user_game_stats').insert(insert_data).execute()
            
            if result.data:
                return {'success': True, 'stats': result.data[0]}
            
            return {'success': False, 'error': 'Failed to update game stats'}
            
        except Exception as e:
            print(f"❌ Error updating user game stats: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def initialize_user_game_stats(user_id):
        """
        Initialize game statistics for a new user.
        
        Args:
            user_id (int): ID of the user
            
        Returns:
            dict: Success status and created stats
        """
        try:
            client = get_supabase_client()
            
            # Check if stats already exist
            existing_result = client.table('user_game_stats').select('*').eq('user_id', user_id).execute()
            
            if existing_result.data:
                return {'success': True, 'stats': existing_result.data[0], 'message': 'Stats already exist'}
            
            # Create new stats
            current_time = get_philippine_time().isoformat()
            
            insert_data = {
                'user_id': user_id,
                'games_played': 0,
                'total_xp_earned': 0,
                'total_correct_answers': 0,
                'total_rounds_played': 0,
                'overall_accuracy': 0.0,
                'created_at': current_time,
                'updated_at': current_time
            }
            
            result = client.table('user_game_stats').insert(insert_data).execute()
            
            if result.data:
                return {'success': True, 'stats': result.data[0], 'message': 'Game stats initialized'}
            
            return {'success': False, 'error': 'Failed to initialize game stats'}
            
        except Exception as e:
            print(f"❌ Error initializing user game stats: {e}")
            return {'success': False, 'error': str(e)}

    # =================== PASSWORD RESET METHODS ===================

    @staticmethod
    def get_user_by_username_or_email(identifier):
        """Get user by username or email"""
        try:
            client = get_supabase_client()
            
            # Try username first
            result = client.table('users').select('*').eq('username', identifier).eq('is_active', True).execute()
            
            if not result.data:
                # Try email
                result = client.table('users').select('*').eq('email', identifier.lower()).eq('is_active', True).execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            print(f"❌ Error getting user by username or email: {e}")
            return None

    @staticmethod
    def create_password_reset_request(reset_request):
        """Create new password reset request"""
        try:
            client = get_supabase_client()
            
            insert_data = {
                'user_id': reset_request['user_id'],
                'username': reset_request['username'],
                'email': reset_request['email'],
                'requested_at': get_philippine_time().isoformat(),
                'status': 'pending',
                'ip_address': reset_request.get('ip_address')
            }
            
            result = client.table('password_reset_requests').insert(insert_data).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            print(f"❌ Error creating password reset request: {e}")
            return None

    @staticmethod
    def get_password_reset_request(request_id):
        """Get password reset request by ID"""
        try:
            client = get_supabase_client()
            
            result = client.table('password_reset_requests').select('*').eq('id', request_id).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            print(f"❌ Error getting password reset request: {e}")
            return None

    @staticmethod
    def get_pending_password_reset_requests():
        """Get all pending password reset requests"""
        try:
            client = get_supabase_client()
            
            result = client.table('password_reset_requests').select('*').eq('status', 'pending').order('requested_at', desc=True).execute()
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ Error getting pending password reset requests: {e}")
            return []

    @staticmethod
    def update_password_reset_request(request_id, status):
        """Update password reset request status"""
        try:
            client = get_supabase_client()
            
            update_data = {
                'status': status,
                'processed_at': get_philippine_time().isoformat()
            }
            
            result = client.table('password_reset_requests').update(update_data).eq('id', request_id).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error updating password reset request: {e}")
            return False

    @staticmethod
    def log_admin_action(admin_id, action, details):
        """Log admin actions"""
        try:
            client = get_supabase_client()
            
            log_data = {
                'admin_id': admin_id,
                'action': action,
                'details': details,
                'timestamp': get_philippine_time().isoformat()
            }
            
            result = client.table('admin_logs').insert(log_data).execute()
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            print(f"❌ Error logging admin action: {e}")
            return False


# =================== INITIALIZATION FUNCTIONS ===================

def init_database(app=None):
    """Initialize the Supabase database connection"""
    try:
        client = init_supabase()
        
        # Test the connection
        result = client.table('users').select('id', count='exact').limit(1).execute()
        print(f"✅ Database connection verified - Users table accessible")
        
        if app:
            # Store the client in app config for potential future use
            app.config['SUPABASE_CLIENT'] = client
        
        return client
        
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        raise


def init_database_with_supabase_support(app=None):
    """Initialize database with Supabase support (for compatibility)"""
    return init_database(app)


# Test the connection when module is imported
if __name__ == "__main__":
    """
    Standalone database initialization and testing.
    """
    print("🔧 Testing TruthGuard direct Supabase database connection...")
    
    try:
        # Initialize Supabase connection
        client = init_database()
        
        # Test basic operations
        print("📝 Testing database operations...")
        
        # Test user creation
        test_user_id = DatabaseService.create_user(
            username="testuser_supabase",
            email="test_supabase@example.com",
            password_hash="dummy_hash_123"
        )
        
        if test_user_id:
            print(f"✅ Test user created with ID: {test_user_id}")
            
            # Test user retrieval
            user = DatabaseService.get_user_by_id(test_user_id)
            if user:
                print(f"✅ User retrieved: {user['username']}")
            
            # Test statistics
            stats = DatabaseService.get_analysis_statistics()
            print(f"✅ Statistics retrieved: {stats['total_articles']} total articles")
            
            print("🎉 Direct Supabase database connection testing completed successfully!")
        else:
            print("❌ Failed to create test user")
            
    except Exception as e:
        print(f"❌ Error testing database: {e}")
        traceback.print_exc()