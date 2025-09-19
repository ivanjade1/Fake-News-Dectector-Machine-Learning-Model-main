from flask import Blueprint, request, jsonify, current_app, session
from helpers import GeminiAnalyzer
gemini_analyzer = GeminiAnalyzer()
from crosscheck import cross_checker

prediction_bp = Blueprint('prediction', __name__)

# Global set to track cancelled analysis IDs
cancelled_analyses = set()

@prediction_bp.route('/cancel-analysis', methods=['POST'])
def cancel_analysis():
    """Cancel an ongoing analysis"""
    try:
        data = request.get_json()
        analysis_id = data.get('analysis_id')
        
        if analysis_id:
            cancelled_analyses.add(analysis_id)
            print(f"🚫 Analysis {analysis_id} marked for cancellation")
            return jsonify({'success': True, 'message': 'Analysis cancellation requested'})
        else:
            return jsonify({'success': False, 'error': 'No analysis ID provided'}), 400
            
    except Exception as e:
        print(f"❌ Error cancelling analysis: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def is_analysis_cancelled(analysis_id):
    """Check if an analysis has been cancelled"""
    return analysis_id in cancelled_analyses

def cleanup_analysis(analysis_id):
    """Remove analysis ID from cancelled set when complete"""
    cancelled_analyses.discard(analysis_id)

@prediction_bp.route('/predict', methods=['POST'])
def predict():
    try:
        from web_app import detector, article_extractor
        
        data = request.get_json()
        print(f"\n📥 PREDICTION REQUEST:")
        print(f"   Data: {data}")
        
        if not data:
            print("❌ Error: No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
        
        # Enhanced model readiness check
        if not detector.is_trained or detector.model is None:
            print("❌ Error: Model not trained or not available")
            print(f"   detector.is_trained: {detector.is_trained}")
            print(f"   detector.model exists: {detector.model is not None}")
            return jsonify({
                'error': 'Model is not ready yet. Please wait for training to complete and refresh the page.',
                'model_status': {
                    'is_trained': detector.is_trained,
                    'model_exists': detector.model is not None
                }
            }), 503  # Service Unavailable
        
        title_method = data.get('titleMethod')
        input_method = data.get('inputMethod')
        analysis_id = data.get('analysis_id', 'unknown')
        
        print(f"\n⚙️ CONFIGURATION:")
        print(f"   Analysis ID: {analysis_id}")
        print(f"   Title method: {title_method}")
        print(f"   Input method: {input_method}")
        print(f"   Model ready: {detector.is_trained}")
        
        # Check for cancellation before starting
        if is_analysis_cancelled(analysis_id):
            cleanup_analysis(analysis_id)
            print(f"🚫 Analysis {analysis_id} was cancelled before starting")
            return jsonify({'error': 'Analysis was cancelled', 'cancelled': True}), 409
        
        # Determine the text to analyze based on input method
        text_to_analyze = ""
        article_url = None
        content_preview_for_frontend = ""
        final_title_for_search = ""  # This will be used for cross-check searches
        
        if input_method == 'snippet':
            user_text = data.get('text', '').strip()
            if not user_text:
                print("❌ Error: No text provided for snippet method")
                return jsonify({'error': 'No text provided'}), 400
            
            # Process user text snippet for completeness
            print(f"\n📝 PROCESSING USER TEXT SNIPPET...")
            print(f"   Original user text: {user_text[:100]}...")
            
            processed_snippet = gemini_analyzer.process_user_text_snippet(user_text)
            content_preview_for_frontend = processed_snippet['processed_preview']
            text_to_analyze = user_text  # Use original text for analysis
            
            print(f"✅ Snippet processed:")
            print(f"   Original length: {len(user_text)} chars")
            print(f"   Processed length: {len(content_preview_for_frontend)} chars")
            print(f"   Processed preview: {content_preview_for_frontend[:100]}...")
            print(f"   Is complete: {processed_snippet.get('is_complete', 'Unknown')}")
            print(f"   Source: {processed_snippet.get('source', 'Unknown')}")
            
        elif input_method == 'link':
            url = data.get('url', '').strip()
            if not url:
                print("❌ Error: No URL provided for link method")
                return jsonify({'error': 'No URL provided'}), 400
            
            article_url = url
            print(f"\n🔗 EXTRACTING CONTENT FROM URL:")
            print(f"   URL: {url}")
            article_data = article_extractor.extract_article_content(url)
            
            if 'error' in article_data:
                print(f"❌ URL extraction error: {article_data['error']}")
                return jsonify(article_data), 400
            
            text_to_analyze = article_data['combined']
            content_preview_for_frontend = article_data['content_preview']
            
            if not text_to_analyze.strip():
                print("❌ Error: No content extracted from URL")
                return jsonify({'error': 'No content could be extracted from the URL'}), 400
                
        else:
            print(f"❌ Error: Invalid input method: {input_method}")
            return jsonify({'error': 'Invalid input method. Must be "snippet" or "link"'}), 400

        # ========================================================================
        # CHECK FOR EXISTING ANALYSIS IN GLOBAL DATABASE FIRST (SAVE API RESOURCES)
        # ========================================================================
        print(f"\n🔍 CHECKING FOR EXISTING ANALYSIS IN DATABASE...")
        print(f"   Checking before content classification to save API resources...")
        
        try:
            db_service = current_app.db_service
            
            # Determine title for duplicate check - use extracted title if available
            title_for_duplicate_check = 'Content Analysis'  # Default
            if input_method == 'link' and 'article_data' in locals() and article_data:
                title_for_duplicate_check = article_data.get('title', 'External Article')
                print(f"   Using extracted title: {title_for_duplicate_check}")
            elif input_method == 'snippet':
                # For snippets, try to extract first meaningful sentence as title
                words = text_to_analyze.split()[:10]  # First 10 words
                if words:
                    title_for_duplicate_check = ' '.join(words) + '...'
                    print(f"   Generated title from snippet: {title_for_duplicate_check}")
            
            # Check for global duplicate (any user)
            existing_global_article = db_service.find_global_article(
                title=title_for_duplicate_check,
                link=article_url,  # Will be None for snippet inputs
                summary=content_preview_for_frontend[:500]  # Use content preview as summary for matching
            )
            
            if existing_global_article:
                print(f"✅ FOUND EXISTING ANALYSIS IN DATABASE!")
                print(f"   Article ID: {existing_global_article.id}")
                print(f"   Original classification: {existing_global_article.classification}")
                print(f"   Original factuality score: {existing_global_article.factuality_score}%")
                print(f"   ⚡ Skipping all API calls (content classification, title generation, ML analysis)")
                
                # Get the complete existing analysis with all details
                result = db_service.get_complete_analysis_result(existing_global_article.id)
                
                if result:
                    # Add input-specific information
                    result['content_preview'] = content_preview_for_frontend
                    result['extracted_content'] = {
                        'title': title_for_duplicate_check,
                        'content_preview': content_preview_for_frontend
                    }
                    result['from_existing_analysis'] = True
                    result['existing_article_id'] = existing_global_article.id
                    result['api_calls_saved'] = True  # Flag to indicate we saved API resources
                    
                    print(f"\n✅ EXISTING ANALYSIS RESPONSE PREPARED (API CALLS SAVED):")
                    print(f"   Classification: {result['prediction']}")
                    print(f"   Factuality Score: {result['factuality_score']}%")
                    print(f"   Source: Existing database record (Article ID: {existing_global_article.id})")
                    print(f"   💰 Saved: Content classification + Title generation + ML analysis API calls")
                    print("="*80 + "\n")
                    
                    # Handle user-specific logic for duplicate content
                    current_user_id = session.get('user_id')
                    
                    if current_user_id:
                        # Check if this is the same user who originally created the analysis
                        if existing_global_article.user_id == current_user_id:
                            print(f"🔄 Same user ({current_user_id}) requesting existing analysis - returning stored result")
                            # Same user - just return the result without saving again
                        else:
                            print(f"👥 Different user ({current_user_id}) requesting analysis originally by user {existing_global_article.user_id}")
                            try:
                                print(f"📝 Saving copy to user {current_user_id} history...")
                                # Create analysis data structure for current user's history
                                user_analysis_data = {
                                    'title': title_for_duplicate_check,
                                    'url': article_url,
                                    'content': content_preview_for_frontend,
                                    'summary': result['content_summary']['summary'] if isinstance(result.get('content_summary'), dict) else str(result.get('content_summary', '')),
                                    'inputMethod': input_method,
                                    'results': {
                                        'factuality_score': result['factuality_score'],
                                        'factuality_level': result['factuality_level'],
                                        'factuality_description': result['factuality_description'],
                                        'prediction': result['prediction'],
                                        'confidence': result['confidence']
                                    },
                                    'breakdown': result.get('factuality_breakdown', {}),
                                    'crosscheck_results': [],  # Convert if needed
                                    'cross_check_data': result.get('cross_check')
                                }
                                
                                save_result = db_service.save_analysis_results(user_analysis_data, user_id=current_user_id)
                                if save_result.get('is_duplicate'):
                                    print(f"   Current user already has this analysis in their history")
                                elif save_result.get('is_global_reuse'):
                                    print(f"   Added to current user's history (global reuse)")
                                else:
                                    print(f"   Added to current user's history as new entry")
                                    
                            except Exception as save_error:
                                print(f"⚠️ Warning: Could not save to user history: {save_error}")
                    else:
                        print(f"👤 Anonymous user requesting existing analysis - returning result without saving")
                    
                    # Clean up analysis tracking
                    cleanup_analysis(analysis_id)
                    print(f"🧹 Cleaned up analysis {analysis_id}")
                    
                    return jsonify(result)
                else:
                    print(f"⚠️ Warning: Could not retrieve full details for existing article {existing_global_article.id}")
                    print(f"   Continuing with normal analysis...")
            else:
                print(f"ℹ️ No existing analysis found - proceeding with content classification and full analysis")
                
        except Exception as duplicate_check_error:
            print(f"⚠️ Warning: Duplicate check failed: {duplicate_check_error}")
            print(f"   Continuing with normal analysis...")
            # Continue with normal analysis if duplicate check fails

        # ========================================================================
        # CHECK PHILIPPINE POLITICAL CONTENT (ONLY IF NO DUPLICATE FOUND)
        # ========================================================================
        
        # Check for cancellation before political content classification
        if is_analysis_cancelled(analysis_id):
            cleanup_analysis(analysis_id)
            print(f"🚫 Analysis {analysis_id} was cancelled before political content check")
            return jsonify({'error': 'Analysis was cancelled', 'cancelled': True}), 409
        
        print(f"\n🏛️ CONTENT CLASSIFICATION:")
        content_check = gemini_analyzer.check_philippine_political_content(text_to_analyze)
        print(f"   Philippine Political: {content_check.get('is_philippine_political', False)}")
        print(f"   Safe Content: {content_check.get('is_safe_content', True)}")
        print(f"   Confidence: {content_check.get('confidence', 0.0)}")
        print(f"   Reason: {content_check.get('reason', 'N/A')}")
        
        # IMMEDIATELY STOP if not Philippine political content
        if not content_check.get('is_philippine_political', False):
            print(f"\n❌ ANALYSIS STOPPED: Content is not Philippine political news")
            print(f"   This detector is specialized for Philippine political content only")
            print(f"   Skipping all further processing (title generation, ML prediction, cross-checking)")
            
            # Determine simple title for response
            display_title = 'Content Analysis'
            if input_method == 'link':
                display_title = article_data.get('title', 'External Article')
            elif input_method == 'snippet':
                display_title = 'User Provided Text'
            
            # Return immediate response without any further processing
            non_political_response = {
                'prediction': 'Not Philippine Political Content',
                'confidence': 0.0,
                'factuality_score': 0,
                'factuality_level': 'Not Applicable',
                'factuality_description': 'This content is not Philippine political news and therefore cannot be analyzed by this specialized detector.',
                'content_classification': content_check,
                'content_preview': content_preview_for_frontend,
                'cross_check': None,
                'factuality_breakdown': None,
                'content_summary': {
                    'summary': 'Content classification indicates this is not Philippine political news.',
                    'word_count': len(content_preview_for_frontend.split()),
                    'source': 'system_message'
                },
                'extracted_content': {
                    'title': display_title,
                    'content_preview': content_preview_for_frontend
                },
                'message': 'This detector is specifically designed for Philippine political news content. The provided content does not appear to be related to Philippine politics or government affairs.',
                'analysis_stopped': True,
                'detector_type': 'Philippine Political News Detector'
            }
            
            print(f"\n✅ NON-POLITICAL CONTENT RESPONSE PREPARED:")
            print(f"   Classification: {non_political_response['prediction']}")
            print(f"   Reason: {content_check.get('reason', 'N/A')}")
            print(f"   Content Preview Length: {len(content_preview_for_frontend)} chars")
            print(f"   Display Title: {display_title}")
            print("="*80 + "\n")
            
            # Clean up analysis tracking for non-political content
            cleanup_analysis(analysis_id)
            print(f"🧹 Cleaned up non-political analysis {analysis_id}")
            
            return jsonify(non_political_response)
        
        # ========================================================================
        # CONTINUE WITH FULL ANALYSIS ONLY FOR PHILIPPINE POLITICAL CONTENT
        # ========================================================================
        print(f"\n✅ CONFIRMED: Philippine political content detected")
        print(f"   Proceeding with full fake news detection analysis...")
        print(f"   Content will be processed through title generation, ML model, and cross-checking")

        # Handle title method and determine final title for search (ONLY for political content)
        generated_title = None
        manual_title_used = None
        if title_method == 'manual':
            manual_title = data.get('title', '').strip()
            if manual_title:
                manual_title_used = manual_title  # Store for frontend display
                final_title_for_search = manual_title  # Use manual title for search
                text_to_analyze = f"{manual_title} {text_to_analyze}"
                print(f"\n📝 TITLE PROCESSING:")
                print(f"   Added manual title to analysis text: {manual_title}")
                print(f"   Manual title will be used for cross-check search: {final_title_for_search}")
        elif title_method == 'automatic':
            print(f"\n🤖 GENERATING AUTOMATIC TITLE...")
            
            # For URL inputs, check if we already have an extracted title from the content extraction
            extracted_title = None
            if input_method == 'link' and article_data and article_data.get('title'):
                extracted_title = article_data.get('title', '').strip()
                print(f"   📄 Title already extracted during content extraction: {extracted_title}")
            
            # Only run Selenium again if we don't have a good extracted title
            if extracted_title and len(extracted_title) > 5:
                generated_title = extracted_title
                print(f"✅ Using already-extracted title (avoiding duplicate Selenium): {generated_title}")
            else:
                print(f"   🔄 No suitable title from extraction, generating with Gemini/Selenium...")
                generated_title = gemini_analyzer.generate_article_title(
                    text_to_analyze, 
                    input_method, 
                    article_url, 
                    extracted_title=extracted_title
                )
                
            if generated_title and generated_title != 'Article Analysis':
                final_title_for_search = generated_title  # Use generated title for search
                text_to_analyze = f"{generated_title} {text_to_analyze}"
                print(f"✅ Generated and added automatic title: {generated_title}")
                print(f"   Generated title will be used for cross-check search: {final_title_for_search}")
            else:
                print("⚠️ Could not generate meaningful title, proceeding without title")
        
        # For URL inputs, use the extracted title if no manual/automatic title is set
        if input_method == 'link' and not final_title_for_search:
            final_title_for_search = article_data.get('title', '')
            print(f"   Using extracted URL title for search: {final_title_for_search}")
        
        print(f"\n📄 ANALYZING TEXT:")
        print(f"   Preview: {text_to_analyze[:100]}...")
        
        # ========================================================================
        # ML PREDICTION AND ANALYSIS (for new content)
        # ========================================================================
        
        # Get ML model prediction (only for Philippine political content)
        
        # Check for cancellation before ML prediction
        if is_analysis_cancelled(analysis_id):
            cleanup_analysis(analysis_id)
            print(f"🚫 Analysis {analysis_id} was cancelled before ML prediction")
            return jsonify({'error': 'Analysis was cancelled', 'cancelled': True}), 409
        
        result = detector.predict(text_to_analyze)
        
        # Perform cross-check verification for ALL inputs if we have a title to search
        cross_check_result = None
        if final_title_for_search and final_title_for_search.strip():
            # Check for cancellation before cross-checking
            if is_analysis_cancelled(analysis_id):
                cleanup_analysis(analysis_id)
                print(f"🚫 Analysis {analysis_id} was cancelled before cross-checking")
                return jsonify({'error': 'Analysis was cancelled', 'cancelled': True}), 409
            
            print(f"\n🔍 PERFORMING CROSS-CHECK VERIFICATION...")
            print(f"   Search title: {final_title_for_search}")
            print(f"   Input method: {input_method}")
            print(f"   Article URL: {article_url}")
            
            # Ensure article_url is a string or None, not bytes
            safe_article_url = None
            if article_url:
                if isinstance(article_url, bytes):
                    safe_article_url = article_url.decode('utf-8')
                elif isinstance(article_url, str):
                    safe_article_url = article_url
                else:
                    safe_article_url = str(article_url)
            
            # Ensure title is a proper string
            safe_title = str(final_title_for_search) if final_title_for_search else ""
            
            print(f"   Safe article URL: {safe_article_url}")
            print(f"   Safe title: {safe_title}")
            
            try:
                cross_check_result = cross_checker.perform_cross_check(
                    safe_article_url,  # Will be None for snippet/manual inputs, which is fine
                    safe_title, 
                    ""  # Pass empty string for preview since we only use title
                )
                result['cross_check'] = cross_check_result
                
                print(f"✅ Cross-check completed:")
                print(f"   Status: {cross_check_result['status']}")
                print(f"   Confidence: {cross_check_result['confidence']}")
                print(f"   Matches: {len(cross_check_result['matches'])}")
                print(f"   Search Query: {cross_check_result['search_query']}")
                
                # Re-calculate factuality score with cross-check data
                print(f"\n🔄 RECALCULATING FACTUALITY SCORE WITH CROSS-CHECK DATA...")
                # Don't show weighting output yet - add flag to suppress it
                cross_check_result['suppress_weighting_output'] = True
                updated_result = detector.predict(
                    text_to_analyze, 
                    cross_check_data=cross_check_result,
                    gemini_factuality_score=None  # Will be added later if available
                )
                
                # Merge the updated prediction with existing result data
                result.update({
                    'prediction': updated_result['prediction'],
                    'confidence': updated_result['confidence'],
                    'factuality_score': updated_result['factuality_score'],
                    'factuality_level': updated_result['factuality_level'],
                    'factuality_description': updated_result['factuality_description'],
                    'weighting_info': updated_result.get('weighting_info', {})
                })
                
            except Exception as cross_check_error:
                print(f"❌ Cross-check failed: {str(cross_check_error)}")
                print(f"   Error type: {type(cross_check_error)}")
                # Don't fail the entire prediction, just skip cross-check
                result['cross_check'] = {
                    'status': 'error',
                    'confidence': 'N/A',
                    'matches': [],
                    'search_query': safe_title,
                    'error': str(cross_check_error)
                }
        else:
            print(f"\n⚠️ No title available for cross-check verification")

        # Generate content summary using the content preview
        print(f"\n📋 GENERATING CONTENT SUMMARY...")
        summary_result = gemini_analyzer.summarize_content(content_preview_for_frontend)
        result['content_summary'] = summary_result
        
        # Generate factuality breakdown for ALL Philippine political content (not just URL inputs)
        gemini_factuality_score = None
        if content_check.get('is_philippine_political', False):
            print(f"\n🔍 GENERATING FACTUALITY BREAKDOWN...")
            print(f"   Input method: {input_method}")
            print(f"   Title method: {title_method}")
            print(f"   Using content preview and cross-check as context")
            
            # First, get Gemini's factuality assessment with cross-check context
            print(f"\n🤖 GETTING GEMINI FACTUALITY ASSESSMENT...")
            print(f"   Gemini API available: {gemini_analyzer.is_available()}")
            print(f"   Content length: {len(content_preview_for_frontend)} chars")
            print(f"   Cross-check matches: {len(cross_check_result.get('matches', []) if cross_check_result else [])}")
            
            gemini_assessment = gemini_analyzer.assess_factuality_score(
                content_preview_for_frontend, 
                article_url, 
                trusted_sources_info=cross_check_result
            )
            
            if gemini_assessment and gemini_assessment.get('factuality_score') is not None:
                gemini_factuality_score = gemini_assessment['factuality_score']
                print(f"✅ Gemini assessment: {gemini_factuality_score}/100 ({gemini_assessment.get('factuality_level', 'Unknown')})")
                if gemini_assessment.get('source_boost_applied'):
                    original_score = gemini_assessment.get('original_score')
                    if original_score:
                        print(f"   Source boost applied: {original_score}% → {gemini_factuality_score}% (+{gemini_factuality_score - original_score})")
                    else:
                        print(f"   Source validation boost applied")
            else:
                print(f"❌ Gemini factuality assessment failed:")
                print(f"   Assessment result: {gemini_assessment}")
                print(f"   Gemini available: {gemini_analyzer.is_available()}")
                print(f"   Error details: {gemini_assessment.get('reasoning', 'No error details') if gemini_assessment else 'No assessment returned'}")

            # Re-calculate with Gemini score included (pass full assessment for source boost info)
            print(f"\n🔄 RECALCULATING WITH GEMINI FACTUALITY SCORE...")
            # Mark this as final calculation to show weighting output
            if cross_check_result:
                cross_check_result['final_calculation'] = True
                cross_check_result.pop('suppress_weighting_output', None)
            
            updated_result = detector.predict(
                text_to_analyze,
                cross_check_data=cross_check_result,
                gemini_factuality_score=gemini_assessment  # Pass full assessment object
            )
            
            # Update result with Gemini-weighted scores
            result.update({
                'prediction': updated_result['prediction'],
                'confidence': updated_result['confidence'],
                'factuality_score': updated_result['factuality_score'],
                'factuality_level': updated_result['factuality_level'],
                'factuality_description': updated_result['factuality_description'],
                'weighting_info': updated_result.get('weighting_info', {})
            })

            # Enhanced context with cross-check information for ALL inputs
            enhanced_context = content_preview_for_frontend
            if cross_check_result and cross_check_result['matches']:
                cross_check_info = f"\n\nCross-check verification: {cross_check_result['confidence']} confidence with {len(cross_check_result['matches'])} matching reports from trusted sources."
                enhanced_context += cross_check_info
            
            # For snippet/manual inputs, add context about the title used
            if input_method == 'snippet':
                if title_method == 'manual' and manual_title_used:
                    title_context = f"\n\nUser-provided title: {manual_title_used}"
                elif title_method == 'automatic' and generated_title:
                    title_context = f"\n\nAI-generated title: {generated_title}"
                else:
                    title_context = "\n\nNo specific title provided for this text snippet."
                enhanced_context += title_context
            
            # Generate detailed breakdown with Gemini assessment included
            breakdown = gemini_analyzer.generate_factuality_breakdown(
                enhanced_context, result['factuality_score'], article_url, include_score_assessment=False
            )
            
            # Add Gemini assessment data to breakdown if available
            if gemini_assessment:
                breakdown['gemini_assessment'] = {
                    'score': gemini_assessment.get('factuality_score'),
                    'level': gemini_assessment.get('factuality_level', 'Unknown'),
                    'confidence': gemini_assessment.get('confidence', 0.0),
                    'reasoning': gemini_assessment.get('reasoning', ''),
                    'key_factors': gemini_assessment.get('key_factors', [])
                }
            
            result['factuality_breakdown'] = breakdown
            print(f"✅ Factuality breakdown generated for {input_method} input with {title_method} title")
            print(f"   Final weighted score: {result['factuality_score']}% (ML: {result.get('weighting_info', {}).get('original_ml_score', 'N/A')}%, Gemini: {gemini_factuality_score or 'N/A'}%)")
        else:
            result['factuality_breakdown'] = None
            print(f"ℹ️ No factuality breakdown - not Philippine political content")
        
        # Add content classification to result (already performed above)
        result['content_classification'] = content_check
        
        # Always include content info for both URL and snippet inputs
        if input_method == 'link':
            # URL input - show extracted content
            result['extracted_content'] = {
                'title': article_data['title'],
                'content_preview': content_preview_for_frontend
            }
        else:
            # Snippet input - show processed user text with appropriate title
            snippet_title = 'User Provided Text'
            if title_method == 'manual' and manual_title_used:
                snippet_title = manual_title_used
            elif title_method == 'automatic' and generated_title:
                snippet_title = generated_title
            
            result['extracted_content'] = {
                'title': snippet_title,
                'content_preview': content_preview_for_frontend
            }
        
        # Ensure content_preview is available at root level for consistency
        result['content_preview'] = content_preview_for_frontend
        
        print(f"\n✅ FINAL CONTENT PREVIEW FOR FRONTEND:")
        print(f"   Content preview: {content_preview_for_frontend[:100]}...")
        print(f"   Length: {len(content_preview_for_frontend)} chars")
        
        # Add generated title to result if applicable (for separate AI title display)
        if title_method == 'automatic' and generated_title and input_method == 'snippet':
            result['generated_title'] = generated_title
        
        # Add manual title to result for frontend access
        if title_method == 'manual' and manual_title_used:
            result['manual_title'] = manual_title_used
        
        print(f"\n✅ PREDICTION COMPLETED:")
        print(f"   Classification: {result['prediction']}")
        print(f"   Factuality Score: {result['factuality_score']}%")
        print(f"   Confidence: {result['confidence']:.3f}")
        print(f"   Level: {result['factuality_level']}")
        print(f"   Content Preview Length: {len(content_preview_for_frontend)} chars")
        print(f"   Input Method: {input_method}")
        print(f"   Title Method: {title_method}")
        print(f"   Cross-check performed: {cross_check_result is not None}")
        print(f"   Factuality breakdown generated: {result['factuality_breakdown'] is not None}")
        
        print("="*80 + "\n")
        
        # Save analysis results to database
        try:
            print("🔄 Attempting to save analysis results to database...")
            db_service = current_app.db_service
            print(f"🔧 Database service: {db_service}")
            
            # Extract summary text properly - matching results.js pattern
            # Frontend expects: results.content_summary.summary
            summary_text = ''
            if result.get('content_summary'):
                content_summary = result['content_summary']
                print(f"🔍 DEBUG - content_summary: {type(content_summary)} = {content_summary}")
                if isinstance(content_summary, dict) and content_summary.get('summary'):
                    summary_text = content_summary['summary']
                    print(f"🔍 DEBUG - Extracted summary from dict: {summary_text}")
                elif isinstance(content_summary, str):
                    summary_text = content_summary
                    print(f"🔍 DEBUG - Using content_summary as string: {summary_text}")
            print(f"🔍 DEBUG - Final summary_text: {type(summary_text)} = {summary_text}")
            
            # Extract breakdown fields individually (like results.js does)
            breakdown_data = result.get('factuality_breakdown', {})
            breakdown_fields = {
                'claim_verification': breakdown_data.get('claim_verification', ''),
                'internal_consistency': breakdown_data.get('internal_consistency', ''),
                'source_assessment': breakdown_data.get('source_assessment', ''),
                'content_quality': breakdown_data.get('content_quality', ''),
                'analysis_conclusion': breakdown_data.get('conclusion', '')  # Note: 'conclusion' in data, 'analysis_conclusion' in DB
            }
            
            # Extract cross-check results for individual records (like results.js feedback function)
            crosscheck_results_list = []
            if cross_check_result and cross_check_result.get('matches'):
                print(f"🔍 DEBUG - cross_check_result structure: {cross_check_result}")
                for i, match in enumerate(cross_check_result['matches']):
                    print(f"🔍 DEBUG - Match {i}: {match}")
                    print(f"🔍 DEBUG - Match keys: {list(match.keys())}")
                    print(f"🔍 DEBUG - match.get('url'): {match.get('url')}")
                    print(f"🔍 DEBUG - match.get('link'): {match.get('link')}")
                    
                    crosscheck_item = {
                        'source_name': match.get('source', 'Unknown'),
                        'search_query': cross_check_result.get('search_query', ''),
                        'match_title': match.get('title', ''),
                        'match_url': match.get('url', '') or match.get('link', ''),  # Try both 'url' and 'link'
                        'similarity_score': match.get('similarity', 0.0)
                    }
                    print(f"🔍 DEBUG - Final crosscheck_item: {crosscheck_item}")
                    crosscheck_results_list.append(crosscheck_item)
                print(f"   Cross-check results: {len(crosscheck_results_list)} matches")
            
            # Build analysis_data structure for database - matching frontend data expectations
            analysis_data = {
                'title': result['extracted_content']['title'],
                'url': article_url,  # Will be None for snippet inputs
                'content': content_preview_for_frontend,
                'summary': summary_text,  # Extracted string, not dict
                'inputMethod': input_method,
                'results': {
                    'factuality_score': result['factuality_score'],
                    'factuality_level': result['factuality_level'],
                    'factuality_description': result['factuality_description'],
                    'prediction': result['prediction'],
                    'confidence': result['confidence'],
                    # Keep original nested structures for frontend compatibility
                    'extracted_content': result.get('extracted_content', {}),
                    'content_summary': result.get('content_summary'),  
                    'factuality_breakdown': result.get('factuality_breakdown'),
                    'cross_check': cross_check_result
                },
                'breakdown': breakdown_fields,  # Individual fields for database
                'crosscheck_results': crosscheck_results_list,  # Individual records for database
                'cross_check_data': cross_check_result
            }
            
            print(f"📋 Prepared analysis data structure")
            print(f"   Title: {analysis_data['title']}")
            print(f"   Input method: {analysis_data['inputMethod']}")
            print(f"   Classification: {analysis_data['results']['prediction']}")
            
            # Save to database
            print("💾 Calling database save function...")
            print(f"🔍 DEBUG - analysis_data['summary'] type: {type(analysis_data['summary'])}")
            print(f"🔍 DEBUG - analysis_data['summary'] value: {analysis_data['summary']}")
            
            # Get current user ID for user-specific analysis history
            user_id = session.get('user_id')
            if user_id:
                print(f"🔍 DEBUG - Saving analysis for user {user_id}")
                save_result = db_service.save_analysis_results(analysis_data, user_id=user_id)
                article_id = save_result.get('article_id')
                is_duplicate = save_result.get('is_duplicate', False)
                is_global_reuse = save_result.get('is_global_reuse', False)
                
                if is_duplicate:
                    print(f"♻️ Found duplicate analysis for user {user_id} - returned existing result")
                elif is_global_reuse:
                    print(f"🌍 Reused global analysis result for user {user_id}")
                else:
                    print(f"✅ New analysis results saved to database with article ID: {article_id}")
            else:
                print("⚠️ Warning: No user logged in - analysis will not be saved to history")
                # For backward compatibility, still save without user (though this should rarely happen)
                save_result = db_service.save_analysis_results(analysis_data)
                article_id = save_result.get('article_id')
                print(f"⚠️ Analysis saved without user association: {article_id}")
            
        except Exception as db_error:
            print(f"⚠️ Warning: Could not save to database: {str(db_error)}")
            import traceback
            traceback.print_exc()
            # Continue execution - don't let database errors break the API response
        
        # Clean up analysis tracking
        cleanup_analysis(analysis_id)
        print(f"🧹 Cleaned up analysis {analysis_id}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"\n❌ PREDICTION ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Clean up analysis tracking in case of error
        if 'analysis_id' in locals():
            cleanup_analysis(analysis_id)
            print(f"🧹 Cleaned up failed analysis {analysis_id}")
        
        # Check if it's a model-related error
        error_message = str(e)
        if "Model not trained" in error_message or "model" in error_message.lower():
            return jsonify({
                'error': 'Model is currently unavailable. Please wait for initialization to complete and try again.',
                'technical_error': error_message
            }), 503
        
        return jsonify({'error': f'An error occurred: {error_message}'}), 500
