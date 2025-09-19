from google import genai
import os
import json
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API with rotating key support
GEMINI_API_KEYS = [
    os.getenv('GEMINI_API_KEY'),
    os.getenv('GEMINI_API_KEY2'),
    os.getenv('GEMINI_API_KEY3')
]
# Filter out None values to get only available keys
GEMINI_API_KEYS = [key for key in GEMINI_API_KEYS if key]

# Initialize clients for each available key
gemini_clients = []
if GEMINI_API_KEYS:
    for key in GEMINI_API_KEYS:
        try:
            client = genai.Client(api_key=key)
            gemini_clients.append(client)
        except Exception as e:
            print(f"Warning: Failed to initialize Gemini client with key ending in ...{key[-4:] if key else 'N/A'}: {e}")
else:
    print("Warning: No GEMINI_API_KEY found. Gemini features will be disabled.")

class GeminiAnalyzer:
    def __init__(self):
        self.clients = gemini_clients
        self.current_key_index = 0  # Track current key index for rotation
        
    def is_available(self) -> bool:
        """Check if Gemini API is available"""
        return len(self.clients) > 0
    
    def _get_next_client(self):
        """Get the next Gemini client in rotation"""
        if not self.clients:
            return None
            
        client = self.clients[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.clients)
        
        # Log key rotation for debugging (show only last 4 characters for security)
        key_display = f"...{GEMINI_API_KEYS[self.current_key_index - 1 if self.current_key_index > 0 else len(GEMINI_API_KEYS) - 1][-4:]}" if GEMINI_API_KEYS else "invalid"
        print(f"🔄 Using Gemini key: {key_display} (index {self.current_key_index - 1 if self.current_key_index > 0 else len(self.clients) - 1})")
        
        return client
    
    def _make_gemini_request(self, prompt: str, max_retries: int = None):
        """Make a Gemini request with automatic key rotation on rate limits"""
        if not self.is_available():
            return None
            
        max_retries = max_retries or len(self.clients)
        last_error = None
        
        for attempt in range(max_retries):
            client = self._get_next_client()
            if not client:
                continue
                
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                return response
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                
                # Check for rate limit or quota errors
                if any(term in error_msg for term in ['rate limit', 'quota', '429', 'resource_exhausted']):
                    print(f"⚠️ Rate limit hit on Gemini key {self.current_key_index}, rotating to next key...")
                    continue
                elif 'api_key' in error_msg or 'authentication' in error_msg:
                    print(f"⚠️ Authentication error on Gemini key {self.current_key_index}, rotating to next key...")
                    continue
                else:
                    # For other errors, don't retry with different keys
                    print(f"❌ Gemini API error: {e}")
                    break
        
        print(f"❌ All Gemini API keys exhausted. Last error: {last_error}")
        return None
    
    def check_philippine_political_content(self, content: str) -> Dict[str, Any]:
        """
        Check if content is Philippine political news and safe for analysis
        """
        if not self.is_available():
            return {
                'is_philippine_political': False,
                'is_safe_content': True,
                'confidence': 0.0,
                'reason': 'Gemini API not available'
            }
        
        try:
            prompt = f"""
            Analyze the following news content and determine:
            1. Is this Philippine political news? (Consider mentions of Philippine politicians, government agencies, political events, elections, policies, etc.)
            2. Is this content safe for AI analysis? (No harmful, explicit, or dangerous content)
            
            Content: {content[:2000]}...
            
            Respond in JSON format:
            {{
                "is_philippine_political": true/false,
                "is_safe_content": true/false,
                "confidence": 0.0-1.0,
                "reason": "brief explanation"
            }}
            """
            
            response = self._make_gemini_request(prompt)
            if not response:
                # Fallback analysis
                content_lower = content.lower()
                philippine_keywords = [
                    'philippines', 'philippine', 'manila', 'duterte', 'marcos', 'senate', 
                    'congress', 'malacañang', 'doh', 'dnd', 'dilg', 'deped', 'comelec'
                ]
                
                is_philippine = any(keyword in content_lower for keyword in philippine_keywords)
                
                return {
                    'is_philippine_political': is_philippine,
                    'is_safe_content': True,
                    'confidence': 0.7 if is_philippine else 0.3,
                    'reason': 'Fallback keyword analysis - Gemini API unavailable'
                }
            
            result = self._extract_json_from_response(response.text)
            
            if result:
                return result
            else:
                # Fallback analysis
                content_lower = content.lower()
                philippine_keywords = [
                    'philippines', 'philippine', 'manila', 'duterte', 'marcos', 'senate', 
                    'congress', 'malacañang', 'doh', 'dnd', 'dilg', 'deped', 'comelec'
                ]
                
                is_philippine = any(keyword in content_lower for keyword in philippine_keywords)
                
                return {
                    'is_philippine_political': is_philippine,
                    'is_safe_content': True,
                    'confidence': 0.7 if is_philippine else 0.3,
                    'reason': 'Fallback keyword analysis'
                }
                
        except Exception as e:
            print(f"Error in Philippine political content check: {str(e)}")
            return {
                'is_philippine_political': False,
                'is_safe_content': True,
                'confidence': 0.0,
                'reason': f'Error: {str(e)}'
            }
    
    def summarize_content(self, content: str, content_type: str = "article") -> Dict[str, Any]:
        """
        Summarize content to maximum 3 sentences (strict limit)
        """
        if not self.is_available():
            return {
                'summary': content[:300] + "..." if len(content) > 300 else content,
                'word_count': len(content.split()),
                'source': 'fallback_truncation'
            }
        
        try:
            prompt = f"""
            Summarize the following {content_type} in exactly 3 sentences or less. 
            Focus on the main facts, key points, and essential information.
            Maintain objectivity and avoid adding interpretation.
            Keep each sentence concise and informative.
            
            Content: {content}
            
            Summary:
            """
            
            response = self._make_gemini_request(prompt)
            if not response:
                # Fallback to simple truncation with 3 sentence limit
                sentences = re.split(r'[.!?]+', content)
                sentences = [s.strip() for s in sentences if s.strip()]
                summary = '. '.join(sentences[:3]) + '.' if len(sentences) > 3 else content
                
                return {
                    'summary': summary[:300] + "..." if len(summary) > 300 else summary,
                    'word_count': len(summary.split()),
                    'source': 'fallback_sentence_limit'
                }
            
            summary = response.text.strip()
            
            # Ensure summary is not longer than 3 sentences (strict enforcement)
            sentences = re.split(r'[.!?]+', summary)
            sentences = [s.strip() for s in sentences if s.strip()]
            if len(sentences) > 3:
                summary = '. '.join(sentences[:3]) + '.'
            
            return {
                'summary': summary,
                'word_count': len(summary.split()),
                'source': 'gemini_ai'
            }
            
        except Exception as e:
            print(f"Error in content summarization: {str(e)}")
            # Fallback to simple truncation with 3 sentence limit
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if s.strip()]
            summary = '. '.join(sentences[:3]) + '.' if len(sentences) > 3 else content
            
            return {
                'summary': summary[:300] + "..." if len(summary) > 300 else summary,
                'word_count': len(summary.split()),
                'source': 'fallback_sentence_limit'
            }
    
    def assess_factuality_score(self, content: str, article_url: str = None, trusted_sources_info: dict = None) -> Dict[str, Any]:
        """
        Generate a numerical factuality score (0-100) using Gemini AI analysis.
        Enhanced with intelligent source-based score adjustments.
        """
        if not self.is_available():
            return {
                'factuality_score': None,
                'factuality_level': 'Unknown',
                'confidence': 0.0,
                'reasoning': 'Gemini API not available',
                'source': 'fallback'
            }
        
        try:
            url_context = f"\nArticle URL: {article_url}" if article_url else "\nContent Source: User-provided text or manual input"
            
            # Enhanced trusted sources context with more detail
            sources_context = ""
            source_boost_factor = 0
            if trusted_sources_info and trusted_sources_info.get('matches'):
                sources_count = len(trusted_sources_info['matches'])
                confidence = trusted_sources_info.get('confidence', 'Unknown')
                source_names = [match.get('source', 'Unknown') for match in trusted_sources_info['matches'][:3]]
                
                # Calculate average similarity score from cross-check matches
                similarities = [match.get('similarity', 0) for match in trusted_sources_info['matches']]
                avg_similarity = sum(similarities) / len(similarities) if similarities else 0
                
                # Enhanced source context with similarity details
                sources_context = f"\n\nCross-check Results: Found {sources_count} matching reports from trusted sources ({', '.join(source_names)}) with {confidence} confidence and {avg_similarity:.0f}% average similarity. This indicates strong external validation from reputable news outlets."
                
                # Calculate source boost factor based on multiple criteria
                if sources_count >= 1:
                    # Base boost: more sources = higher boost
                    base_boost = min(15, sources_count * 3)  # Max 15 points from source count
                    
                    # Similarity boost: higher similarity = higher boost  
                    similarity_boost = min(10, avg_similarity * 0.15)  # Max 10 points from similarity
                    
                    # Confidence boost: higher confidence = higher boost
                    confidence_boost = 0
                    if confidence == "Very High":
                        confidence_boost = 8
                    elif confidence == "High":
                        confidence_boost = 5
                    elif confidence == "Medium":
                        confidence_boost = 3
                    
                    # Combined boost with diminishing returns
                    source_boost_factor = min(25, base_boost + similarity_boost + confidence_boost)
                    
                    print(f"📈 Source boost calculation:")
                    print(f"   Sources: {sources_count} = {base_boost} points")
                    print(f"   Avg similarity: {avg_similarity:.0f}% = {similarity_boost:.1f} points")
                    print(f"   Confidence: {confidence} = {confidence_boost} points")
                    print(f"   Total boost factor: {source_boost_factor:.1f} points")
            
            # Determine content type for better analysis
            content_type = "published article" if article_url else "text content"
            
            prompt = f"""
            Analyze the following news {content_type} and provide a numerical factuality score from 0-100.
            
            Content: {content}{url_context}{sources_context}
            
            SCORING GUIDELINES:
            - 90-100: Very High - Highly factual, well-sourced, verifiable claims
            - 75-89: High - Generally factual with minor concerns
            - 51-74: Mostly Factual - Some questionable elements but generally reliable
            - 26-50: Low - Frequently misleading or poorly sourced
            - 0-25: Very Low - Largely false, fabricated, or contradicts verified sources
            
            ANALYSIS CRITERIA (with enhanced source consideration):
            - Verifiability of main claims against known facts
            - Source credibility and transparency within the content
            - Internal consistency and logical coherence
            - Presence of bias, sensationalism, or misleading elements
            - Writing quality and journalistic standards
            - External validation from trusted news sources (HEAVILY WEIGHTED if present)
            
            ENHANCED SOURCE ANALYSIS:
            - If cross-check results show multiple trusted sources covering the same story with high similarity, this is strong evidence of legitimacy
            - Multiple reputable news outlets covering the same topic suggests the story is real and noteworthy
            - High similarity scores indicate the content aligns well with established reporting
            - Consider that legitimate news often gets covered by multiple sources with consistent details
            
            SCORING ADJUSTMENTS:
            - Strong external validation (3+ trusted sources, high similarity) should significantly boost the score
            - Multiple trusted sources with high confidence should be weighted heavily in favor of factuality
            - Even if content has minor issues, strong cross-validation from reputable sources indicates overall reliability
            
            Respond in JSON format:
            {{
                "factuality_score": integer_0_to_100,
                "factuality_level": "Very Low/Low/Mostly Factual/High/Very High",
                "confidence": 0.0_to_1.0,
                "key_factors": ["brief", "list", "of", "main", "assessment", "factors"],
                "reasoning": "2-3 sentences explaining the score, emphasizing how external validation influenced the assessment"
            }}
            """
            
            response = self._make_gemini_request(prompt)
            if not response:
                return self._fallback_factuality_score()
            
            result = self._extract_json_from_response(response.text)
            
            if result and 'factuality_score' in result:
                # Get initial Gemini score
                gemini_score = int(result.get('factuality_score', 50))
                gemini_score = max(0, min(100, gemini_score))  # Ensure score is within 0-100 range
                original_gemini_score = gemini_score
                
                # Apply intelligent source-based adjustments
                if trusted_sources_info and trusted_sources_info.get('matches'):
                    sources_count = len(trusted_sources_info['matches'])
                    similarities = [match.get('similarity', 0) for match in trusted_sources_info['matches']]
                    avg_similarity = sum(similarities) / len(similarities) if similarities else 0
                    confidence = trusted_sources_info.get('confidence', 'Unknown')
                    
                    # Determine if we should apply the boost
                    should_boost = False
                    boost_reason = ""
                    
                    # Strong validation criteria
                    if sources_count >= 3 and avg_similarity >= 70:
                        should_boost = True
                        boost_reason = f"Strong validation: {sources_count} trusted sources with {avg_similarity:.0f}% similarity"
                    elif sources_count >= 2 and avg_similarity >= 80:
                        should_boost = True
                        boost_reason = f"High confidence validation: {sources_count} sources with {avg_similarity:.0f}% similarity"
                    elif sources_count >= 4:  # Many sources, even with lower similarity
                        should_boost = True
                        boost_reason = f"Broad coverage: {sources_count} trusted sources reporting"
                    elif sources_count >= 1 and avg_similarity >= 90:  # Single source but very high similarity
                        should_boost = True
                        boost_reason = f"High precision match: {avg_similarity:.0f}% similarity from trusted source"
                    
                    # Apply boost if criteria met
                    if should_boost:
                        # Scale boost based on original score (higher scores get smaller boost, lower scores get bigger boost)
                        if gemini_score < 30:
                            # Very low scores with strong validation get significant boost
                            applied_boost = source_boost_factor * 1.2
                        elif gemini_score < 50:
                            # Low scores get full boost
                            applied_boost = source_boost_factor
                        elif gemini_score < 70:
                            # Medium scores get moderate boost
                            applied_boost = source_boost_factor * 0.8
                        else:
                            # High scores get smaller boost (already good)
                            applied_boost = source_boost_factor * 0.5
                        
                        gemini_score = min(100, gemini_score + applied_boost)
                        
                        print(f"🎯 Applied source boost: {original_gemini_score}% → {gemini_score}% (+{applied_boost:.1f})")
                        print(f"   Reason: {boost_reason}")
                        
                        # Update reasoning to reflect the boost
                        original_reasoning = result.get('reasoning', '')
                        enhanced_reasoning = f"{original_reasoning} Score boosted by {applied_boost:.1f} points due to {boost_reason}."
                        result['reasoning'] = enhanced_reasoning
                    else:
                        print(f"🔍 No source boost applied:")
                        print(f"   Sources: {sources_count}, Avg similarity: {avg_similarity:.0f}%, Confidence: {confidence}")
                        print(f"   Criteria not met for significant boost")
                
                # Validate factuality level matches adjusted score
                level_mapping = {
                    'Very Low': (0, 25), 'Low': (26, 50),
                    'Mostly Factual': (51, 74), 'High': (75, 89), 'Very High': (90, 100)
                }
                
                reported_level = result.get('factuality_level', 'Low')
                if reported_level in level_mapping:
                    min_score, max_score = level_mapping[reported_level]
                    if not (min_score <= gemini_score <= max_score):
                        # Adjust level to match the boosted score
                        for level, (min_s, max_s) in level_mapping.items():
                            if min_s <= gemini_score <= max_s:
                                reported_level = level
                                print(f"📊 Adjusted factuality level from {result.get('factuality_level')} to {level} to match boosted score")
                                break
                
                # Enhance confidence based on source validation
                base_confidence = min(1.0, max(0.0, float(result.get('confidence', 0.8))))
                if trusted_sources_info and trusted_sources_info.get('matches'):
                    # Boost confidence when we have strong external validation
                    sources_count = len(trusted_sources_info['matches'])
                    confidence_boost = min(0.2, sources_count * 0.05)  # Max 0.2 boost
                    enhanced_confidence = min(1.0, base_confidence + confidence_boost)
                else:
                    enhanced_confidence = base_confidence
                
                final_result = {
                    'factuality_score': gemini_score,
                    'factuality_level': reported_level,
                    'confidence': enhanced_confidence,
                    'key_factors': result.get('key_factors', []),
                    'reasoning': result.get('reasoning', 'Analysis completed'),
                    'source': 'gemini_ai',
                    'source_boost_applied': gemini_score > original_gemini_score,
                    'original_score': original_gemini_score if gemini_score > original_gemini_score else None
                }
                
                print(f"\n🤖 ENHANCED GEMINI FACTUALITY ASSESSMENT:")
                print(f"   Final Score: {gemini_score}/100 ({reported_level})")
                if gemini_score > original_gemini_score:
                    print(f"   Original Score: {original_gemini_score}/100 (+{gemini_score - original_gemini_score} boost)")
                print(f"   Confidence: {enhanced_confidence:.2f}")
                print(f"   Key Factors: {', '.join(final_result['key_factors'][:3])}...")
                print(f"   Reasoning: {final_result['reasoning'][:100]}...")
                
                return final_result
            else:
                print("⚠️ Gemini factuality assessment failed - invalid response format")
                return self._fallback_factuality_score()
                
        except Exception as e:
            print(f"Error in Gemini factuality assessment: {str(e)}")
            return self._fallback_factuality_score()
    
    def _fallback_factuality_score(self) -> Dict[str, Any]:
        """Provide fallback factuality score when Gemini is unavailable"""
        return {
            'factuality_score': None,
            'factuality_level': 'Unknown',
            'confidence': 0.0,
            'key_factors': ['Gemini analysis unavailable'],
            'reasoning': 'Unable to perform AI-based factuality assessment',
            'source': 'fallback'
        }

    def generate_factuality_breakdown(self, content: str, factuality_score: int, article_url: str = None, include_score_assessment: bool = True) -> Dict[str, Any]:
        """
        Generate detailed factuality analysis breakdown with optional score assessment.
        Explicitly forbids any use of "current date" or temporal comparisons.
        """
        if not self.is_available():
            return self._fallback_breakdown(factuality_score)
        
        try:
            # Helper to strip temporal phrases from any AI output
            def _strip_temporal(text: str) -> str:
                if not text:
                    return text
                # Dates
                text = re.sub(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b', '[date removed]', text, flags=re.IGNORECASE)
                text = re.sub(r'\b\d{1,2}/\d{1,2}/\d{4}\b', '[date removed]', text)
                text = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', '[date removed]', text)
                # Relative temporal language
                temporal_phrases = [
                    r'\bas of today\b', r'\bcurrent date\b', r'\bas of now\b', r'\btoday\b',
                    r'\byesterday\b', r'\bnow\b', r'\brecent\b', r'\bcurrently\b',
                    r'\blast week\b', r'\bthis week\b', r'\blast month\b', r'\bthis month\b',
                    r'\blast year\b', r'\bthis year\b', r'\bhours after\b', r'\bdays after\b',
                    r'\bweeks after\b', r'\bmonths after\b', r'\byears after\b', r'\bimmediately after\b',
                    r'\bminutes after\b', r'\bsoon after\b', r'\bshortly after\b'
                ]
                for pat in temporal_phrases:
                    text = re.sub(pat, '[temporal removed]', text, flags=re.IGNORECASE)
                return ' '.join(text.split())

            # First, get Gemini's own factuality assessment if requested (non-temporal)
            gemini_assessment = None
            if include_score_assessment:
                gemini_assessment = self.assess_factuality_score(content, article_url)
                if gemini_assessment and isinstance(gemini_assessment.get('reasoning'), str):
                    gemini_assessment['reasoning'] = _strip_temporal(gemini_assessment['reasoning'])
            
            url_context = f"\nArticle URL: {article_url}" if article_url else "\nContent Source: User-provided text or manual input"
            
            # Simplified content description
            if article_url:
                content_description = "published article"
                source_context = "from a published news source"
            else:
                content_description = "text content"
                source_context = "provided by the user"
            
            # Include Gemini's assessment in the prompt if available (scrubbed)
            assessment_context = ""
            if gemini_assessment and gemini_assessment.get('factuality_score') is not None:
                assessment_context = f"\n\nGemini AI Assessment: {gemini_assessment['factuality_score']}/100 ({gemini_assessment['factuality_level']}) - {gemini_assessment.get('reasoning','')}"
            
            prompt = f"""
            Analyze the following {content_description} and provide a detailed factuality breakdown based on the given factuality score of {factuality_score}%.
            
            Content: {content}{url_context}{assessment_context}
            
            CRITICAL ANALYSIS INSTRUCTIONS:
            - Focus EXCLUSIVELY on content structure, sourcing methodology, and presentation quality
            - NEVER compare any statement to today's date, the system date, or any "current" timeframe
            - DO NOT reference, mention, or analyze ANY specific dates or temporal sequences
            - Treat the content as a standalone document without temporal context
            - Focus purely on: source attribution, evidence quality, logical structure, writing standards
            
            WHAT TO ANALYZE:
            - Quality and credibility of sources cited
            - Strength of evidence presented for claims
            - Logical coherence of arguments
            - Professional writing standards
            - Presence of bias or sensationalism
            - Attribution and transparency practices
            
            WHAT TO COMPLETELY IGNORE:
            - Any specific dates or timelines
            - Temporal references or timing of events
            - Publication timing or currency of information
            
            Provide analysis for exactly these 5 factors (2-3 sentences each):
            
            1. Claim Verification: Assess the methodology used to support claims within the {content_description}. Evaluate whether assertions are backed by named sources, institutional references, or documented evidence. Focus on the quality of supporting material rather than timing.
            
            2. Internal Consistency: Evaluate the logical structure and coherence of arguments presented. Check whether the narrative flows logically and whether statements support each other. Note any contradictions in reasoning or evidence presentation.
            
            3. Source Assessment: Analyze the credibility and transparency of sources mentioned in the {content_description}. Evaluate whether sources are properly identified, authoritative for the subject matter, and whether attribution meets journalistic standards.
            
            4. Content Quality: Examine the writing style, tone, and presentation standards of this {content_description} {source_context}. Assess whether the content maintains journalistic objectivity or shows signs of bias, sensationalism, or partisan language.
            
            5. Conclusion: Explain why this {content_description} received a factuality score of {factuality_score}% based on the structural and qualitative factors analyzed above. Reference the specific content characteristics that influenced this assessment.
            
            Your analysis should align with the factuality score of {factuality_score}% (0-25% = Very Low, 26-50% = Low, 51-74% = Mostly Factual, 75-89% = High, 90-100% = Very High).
            
            Respond in JSON format:
            {{
                "claim_verification": "2-3 sentences analyzing claim support methodology and evidence quality",
                "internal_consistency": "2-3 sentences analyzing logical structure and argument coherence", 
                "source_assessment": "2-3 sentences analyzing source credibility and attribution standards",
                "content_quality": "2-3 sentences analyzing writing quality and presentation standards",
                "conclusion": "2-3 sentences explaining the score based on content characteristics",
                "factuality_level": "Very Low/Low/Mostly Factual/High/Very High",
                "gemini_assessment": {{
                    "score": {gemini_assessment.get('factuality_score') if gemini_assessment else 'null'},
                    "level": "{gemini_assessment.get('factuality_level', 'Unknown') if gemini_assessment else 'Unknown'}",
                    "confidence": {gemini_assessment.get('confidence', 0.0) if gemini_assessment else 0.0}
                }}
            }}
            """
            
            response = self._make_gemini_request(prompt)
            if not response:
                fallback_result = self._fallback_breakdown(factuality_score)
                if gemini_assessment:
                    fallback_result['gemini_assessment'] = {
                        'score': gemini_assessment.get('factuality_score'),
                        'level': gemini_assessment.get('factuality_level', 'Unknown'),
                        'confidence': gemini_assessment.get('confidence', 0.0)
                    }
                self._print_formatted_breakdown(fallback_result, factuality_score)
                return fallback_result
            
            result = self._extract_json_from_response(response.text)
            
            if result:
                # Add Gemini assessment data to result
                if gemini_assessment:
                    result['gemini_assessment'] = {
                        'score': gemini_assessment.get('factuality_score'),
                        'level': gemini_assessment.get('factuality_level', 'Unknown'),
                        'confidence': gemini_assessment.get('confidence', 0.0),
                        'reasoning': gemini_assessment.get('reasoning', ''),
                        'key_factors': gemini_assessment.get('key_factors', [])
                    }
                else:
                    result['gemini_assessment'] = {
                        'score': None,
                        'level': 'Unknown',
                        'confidence': 0.0,
                        'reasoning': 'Gemini assessment not available',
                        'key_factors': []
                    }
                
                # Add content type to result
                result['content_type'] = content_description
                
                # Scrub any temporal language that might slip through
                for key in ['claim_verification', 'internal_consistency', 'source_assessment', 'content_quality', 'conclusion']:
                    if key in result and result[key]:
                        result[key] = _strip_temporal(result[key])
                
                # Print formatted breakdown to console for better readability
                self._print_formatted_breakdown(result, factuality_score)
                return result
            else:
                fallback_result = self._fallback_breakdown(factuality_score)
                if gemini_assessment:
                    fallback_result['gemini_assessment'] = {
                        'score': gemini_assessment.get('factuality_score'),
                        'level': gemini_assessment.get('factuality_level', 'Unknown'),
                        'confidence': gemini_assessment.get('confidence', 0.0)
                    }
                fallback_result['content_type'] = content_description
                self._print_formatted_breakdown(fallback_result, factuality_score)
                return fallback_result
                
        except Exception as e:
            print(f"Error in factuality breakdown generation: {str(e)}")
            fallback_result = self._fallback_breakdown(factuality_score)
            fallback_result['content_type'] = 'unknown content'
            self._print_formatted_breakdown(fallback_result, factuality_score)
            return fallback_result
    
    def generate_article_title(self, content: str, input_type: str = 'text', url: str = None, extracted_title: str = None) -> str:
        """
        Generate a title automatically, either by using already-extracted title, extracting from URL metadata, or via Gemini API
        Args:
            content: Article content text
            input_type: 'text' or 'link'
            url: URL if input_type is 'link'
            extracted_title: Already-extracted title to avoid duplicate processing
        """
        try:
            # If we already have an extracted title, use it instead of running Selenium again
            if extracted_title and len(extracted_title.strip()) > 5:
                print(f"   🎯 Using provided extracted title: {extracted_title}")
                return extracted_title.strip()
            
            # For URL input, try to extract title from the content first if it's formatted with TITLE:
            if input_type == 'link' and content:
                # Check if content already has a title (from enhanced extraction)
                if content.startswith("TITLE:"):
                    title_line = content.split('\n')[0]
                    content_extracted_title = title_line.replace("TITLE:", "").strip()
                    if content_extracted_title and len(content_extracted_title) > 5:
                        print(f"   📝 Found title in content: {content_extracted_title}")
                        return content_extracted_title
                
                # Try to extract title from URL using improved Selenium approach
                if url:
                    try:
                        from selenium import webdriver
                        from selenium.webdriver.chrome.service import Service
                        from selenium.webdriver.chrome.options import Options
                        from webdriver_manager.chrome import ChromeDriverManager
                        from newspaper import Article
                        import time
                        
                        # Setup lightweight Chrome options for title extraction
                        options = Options()
                        options.add_argument("--headless=new")
                        options.add_argument("--no-sandbox")
                        options.add_argument("--disable-dev-shm-usage")
                        options.add_argument("--disable-gpu")
                        options.add_argument("--log-level=3")
                        options.add_experimental_option("excludeSwitches", ["enable-logging"])
                        
                        # Use eager loading for faster title extraction
                        options.page_load_strategy = "eager"
                        
                        # Disable unnecessary resources
                        prefs = {
                            "profile.managed_default_content_settings.images": 2,
                            "profile.managed_default_content_settings.stylesheets": 2,
                            "profile.managed_default_content_settings.plugins": 2
                        }
                        options.add_experimental_option("prefs", prefs)
                        
                        try:
                            service = Service(ChromeDriverManager().install())
                            driver = webdriver.Chrome(service=service, options=options)
                            driver.set_page_load_timeout(10)  # Shorter timeout for title extraction
                            
                            driver.get(url)
                            time.sleep(1)  # Brief wait for page load
                            html = driver.page_source
                            driver.quit()
                            
                            # Use newspaper to extract title
                            article = Article(url)
                            article.download_state = 2
                            article.html = html
                            article.parse()
                            
                            if article.title and len(article.title.strip()) > 5:
                                extracted_title = article.title.strip()
                                
                                # Skip if title contains error indicators
                                error_indicators = ['access denied', 'forbidden', '404', 'error', 'not found', 
                                                  'unauthorized', 'blocked', 'unavailable']
                                if not any(indicator in extracted_title.lower() for indicator in error_indicators):
                                    # Clean up common title suffixes
                                    for suffix in [' | Philippine News Agency', ' | Reuters', ' | CNN', ' | BBC', 
                                                 ' - Philippine Daily Inquirer', ' - Manila Bulletin', ' | ABS-CBN News']:
                                        if extracted_title.endswith(suffix):
                                            extracted_title = extracted_title.replace(suffix, '').strip()
                                    
                                    if len(extracted_title) > 5:
                                        return extracted_title
                                        
                        except Exception as e:
                            print(f"Error in Selenium title extraction: {str(e)}")
                            
                            # Try fallback newspaper-only extraction for title
                            try:
                                fallback_article = Article(url, language='en')
                                fallback_article.download()
                                fallback_article.parse()
                                
                                if fallback_article.title and len(fallback_article.title.strip()) > 5:
                                    extracted_title = fallback_article.title.strip()
                                    error_indicators = ['access denied', 'forbidden', '404', 'error', 'not found']
                                    if not any(indicator in extracted_title.lower() for indicator in error_indicators):
                                        return extracted_title
                            except Exception as fallback_error:
                                print(f"Fallback title extraction also failed: {str(fallback_error)}")
                            
                    except Exception as e:
                        print(f"Error extracting title from URL: {str(e)}")
            
            # Fallback to AI generation using Gemini with rotating keys
            if self.is_available():
                try:
                    prompt = f"""
                    Please provide a single concise and descriptive title for the following article content. 
                    Extract the title if one is already present, or create an appropriate headline that summarizes the main topic.
                    The title should be informative and capture the essence of the article.
                    Do not include any quotes, formatting, or prefixes like "Title:".
                    Respond with only the title text:

                    {content[:1500]}
                    """
                    
                    response = self._make_gemini_request(prompt)
                    
                    if response and response.text:
                        title = response.text.strip()
                        
                        # Clean up the response - take only the first line
                        title = title.split('\n')[0].strip()
                        
                        # Remove common prefixes and formatting
                        title = title.replace('Title:', '').strip()
                        title = title.strip('"').strip("'").strip()
                        
                        # Remove any remaining formatting markers
                        if title.startswith('**') and title.endswith('**'):
                            title = title[2:-2].strip()
                        
                        # Check if the generated title is meaningful
                        if (len(title) > 5 and 
                            title.lower() not in ['article analysis', 'news article', 'untitled', 'no title'] and
                            not title.lower().startswith('error')):
                            return title
                            
                except Exception as e:
                    print(f"Error in Gemini title generation: {str(e)}")
            
            # Smart fallback - extract meaningful content from the article using sentence boundaries
            if content and len(content.strip()) > 20:
                # Try to find the first substantial sentence using proper sentence tokenization
                try:
                    from nltk.tokenize import sent_tokenize
                    sentences = sent_tokenize(content)
                except:
                    # Fallback to simple splitting if NLTK is not available
                    sentences = re.split(r'[.!?]+', content)
                
                for sentence in sentences[:5]:  # Check first 5 sentences
                    sentence = sentence.strip()
                    
                    # Skip short sentences, URLs, and common prefixes
                    if (len(sentence) > 15 and len(sentence) < 120 and
                        not sentence.lower().startswith(('http', 'www', 'photo', 'image', 'source:')) and
                        not re.match(r'^[A-Z\s]+$', sentence)):  # Skip all-caps sentences
                        
                        # Clean up sentence to make it title-like
                        title = sentence.replace('\n', ' ').replace('\r', '').strip()
                        
                        # Remove common news article prefixes
                        prefixes_to_remove = [
                            'manila -', 'manila –', 'breaking:', 'update:', 'news:', 
                            'report:', 'reuters -', 'ap -', 'dpa -'
                        ]
                        
                        title_lower = title.lower()
                        for prefix in prefixes_to_remove:
                            if title_lower.startswith(prefix):
                                title = title[len(prefix):].strip()
                                break
                        
                        # Ensure it doesn't end with incomplete words and has proper punctuation
                        if not title.endswith('...') and len(title) > 10:
                            # Ensure title ends properly
                            if not title.endswith('.'):
                                title = title.rstrip('.,!?;:') + '.'
                            return title.replace('.', '')  # Remove the period for title format
                
                # If no good sentence found, try to extract key phrases with sentence boundaries
                try:
                    from nltk.tokenize import sent_tokenize
                    sentences = sent_tokenize(content)
                    if sentences:
                        # Take first few sentences up to word limit
                        preview_sentences = []
                        word_count = 0
                        for sentence in sentences[:3]:
                            words = sentence.split()
                            if word_count + len(words) <= 50:
                                preview_sentences.append(sentence)
                                word_count += len(words)
                            else:
                                break
                        if preview_sentences:
                            meaningful_text = " ".join(preview_sentences)
                            # Remove common article metadata
                            meaningful_text = re.sub(r'\b(photo|image|source|courtesy|reuters|ap|dpa)\b.*', '', meaningful_text, flags=re.IGNORECASE)
                            if len(meaningful_text.strip()) > 15:
                                return meaningful_text.strip()
                except:
                    # Fallback to word-based approach
                    words = content.split()[:50]
                    meaningful_text = ' '.join(words)
                    meaningful_text = re.sub(r'\b(photo|image|source|courtesy|reuters|ap|dpa)\b.*', '', meaningful_text, flags=re.IGNORECASE)
                    if len(meaningful_text.strip()) > 15:
                        first_chunk = meaningful_text[:80].strip()
                        if first_chunk and not first_chunk.lower().startswith(('http', 'www')):
                            return first_chunk
            
            # Final fallback based on input type and URL
            if input_type == 'link' and url:
                # Try to extract domain name for a more descriptive title
                try:
                    from urllib.parse import urlparse
                    parsed_url = urlparse(url)
                    domain = parsed_url.netloc.replace('www.', '')
                    
                    # Map common domains to readable names
                    domain_mapping = {
                        'pna.gov.ph': 'Philippine News Agency Article',
                        'rappler.com': 'Rappler News Article',
                        'abs-cbn.com': 'ABS-CBN News Article',
                        'gma.news': 'GMA News Article',
                        'inquirer.net': 'Philippine Daily Inquirer Article',
                        'philstar.com': 'Philippine Star Article',
                        'mb.com.ph': 'Manila Bulletin Article'
                    }
                    
                    return domain_mapping.get(domain, f'News Article from {domain}')
                    
                except Exception:
                    return 'News Article from External Source'
            
            return 'News Article Analysis'
            
        except Exception as e:
            print(f"Error in generate_article_title: {str(e)}")
            return 'News Article Analysis'
    
    def process_user_text_snippet(self, user_text: str) -> Dict[str, Any]:
        """
        Process user-provided text snippet to ensure completeness and proper formatting
        """
        if not user_text or not user_text.strip():
            return {
                'processed_preview': 'No text provided for analysis.',
                'is_complete': False,
                'word_count': 0,
                'source': 'error_handling'
            }
        
        if not self.is_available():
            # Fallback processing without Gemini
            cleaned_text = user_text.strip()
            # Ensure it ends with proper punctuation
            if cleaned_text and not cleaned_text.endswith(('.', '!', '?')):
                cleaned_text += '.'
            
            return {
                'processed_preview': cleaned_text,
                'is_complete': len(cleaned_text.split()) > 10,
                'word_count': len(cleaned_text.split()),
                'source': 'fallback_processing'
            }
        
        try:
            prompt = f"""
            Analyze the following user-provided text snippet and process it for completeness:
            
            1. Check if the text appears to be complete or if it seems cut off mid-sentence
            2. If the text is incomplete or ends abruptly, complete it naturally without changing the meaning
            3. Ensure proper punctuation and sentence structure
            4. Keep the original content intact, only fix formatting and completion issues
            5. Do not add new information, only complete obvious incomplete sentences
            
            Text: {user_text}
            
            Respond in JSON format:
            {{
                "processed_preview": "cleaned and completed text",
                "is_complete": true/false,
                "word_count": number_of_words,
                "completion_notes": "brief note if any completion was done"
            }}
            """
            
            response = self._make_gemini_request(prompt)
            if not response:
                # Fallback if request fails
                cleaned_text = user_text.strip()
                if cleaned_text and not cleaned_text.endswith(('.', '!', '?')):
                    cleaned_text += '.'
                
                return {
                    'processed_preview': cleaned_text,
                    'is_complete': len(cleaned_text.split()) > 10,
                    'word_count': len(cleaned_text.split()),
                    'source': 'fallback_processing'
                }
            
            result = self._extract_json_from_response(response.text)
            
            if result and result.get('processed_preview'):
                result['source'] = 'gemini_ai'
                return result
            else:
                # Fallback if JSON extraction fails or no processed_preview
                cleaned_text = user_text.strip()
                if cleaned_text and not cleaned_text.endswith(('.', '!', '?')):
                    cleaned_text += '.'
                
                return {
                    'processed_preview': cleaned_text,
                    'is_complete': len(cleaned_text.split()) > 10,
                    'word_count': len(cleaned_text.split()),
                    'source': 'fallback_processing'
                }
                
        except Exception as e:
            print(f"Error in text snippet processing: {str(e)}")
            # Fallback processing
            cleaned_text = user_text.strip()
            if cleaned_text and not cleaned_text.endswith(('.', '!', '?')):
                cleaned_text += '.'
            
            return {
                'processed_preview': cleaned_text,
                'is_complete': len(cleaned_text.split()) > 10,
                'word_count': len(cleaned_text.split()),
                'source': 'fallback_processing'
            }
    
    def _extract_json_from_response(self, response_text: str) -> Optional[Dict]:
        """Extract JSON from Gemini response"""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            return None
        except json.JSONDecodeError:
            return None
    
    def _print_formatted_breakdown(self, breakdown: Dict[str, Any], score: int):
        """Print formatted factuality breakdown to console for better readability"""
        print("\n" + "="*80)
        print(f"FACTUALITY BREAKDOWN - Score: {score}% ({breakdown.get('factuality_level', 'Unknown')})")
        print("="*80)
        
        print(f"\n📊 CLAIM VERIFICATION:")
        print(f"   {breakdown.get('claim_verification', 'N/A')}")
        
        print(f"\n🔗 INTERNAL CONSISTENCY:")
        print(f"   {breakdown.get('internal_consistency', 'N/A')}")
        
        print(f"\n🛡️ SOURCE ASSESSMENT:")
        print(f"   {breakdown.get('source_assessment', 'N/A')}")
        
        print(f"\n⭐ CONTENT QUALITY:")
        print(f"   {breakdown.get('content_quality', 'N/A')}")
        
        print(f"\n🎯 CONCLUSION:")
        print(f"   {breakdown.get('conclusion', 'N/A')}")
        
        print("="*80 + "\n")

    def _fallback_breakdown(self, factuality_score: int) -> Dict[str, Any]:
        """Generate fallback breakdown when Gemini is not available"""
        
        if factuality_score >= 90:
            level = "Very High"
            claim_desc = "The article presents claims that appear well-substantiated and verifiable. Main assertions align with established facts and reputable reporting standards."
            consistency_desc = "The content demonstrates strong internal logic with coherent timeline and consistent narrative flow. Quoted statements and arguments support each other effectively."
            source_desc = "Sources mentioned appear credible and institutional. The article references verifiable entities and maintains professional journalistic standards."
            quality_desc = "Writing quality is professional and informative with neutral tone. The content appears balanced and fact-focused rather than sensational."
            conclusion_desc = f"The model assigned {factuality_score}% based on strong indicators of reliability, credible sourcing, and professional presentation standards."
        
        elif factuality_score >= 75:
            level = "High" 
            claim_desc = "Most claims in the article can be verified, though some minor details may lack complete substantiation. Overall factual foundation appears solid."
            consistency_desc = "The article maintains good internal consistency with mostly coherent arguments. Timeline and narrative structure are generally well-organized."
            source_desc = "Sources are generally credible though some may have minor transparency concerns. Most references appear legitimate and verifiable."
            quality_desc = "Content quality is good with mostly neutral presentation. Writing is informative though may contain slight editorial elements."
            conclusion_desc = f"The {factuality_score}% score reflects generally reliable content with minor concerns about complete verification or sourcing transparency."
        
        elif factuality_score >= 51:
            level = "Mostly Factual"
            claim_desc = "The article contains verifiable claims with some assertions that are difficult to confirm. Core facts appear sound but details may be speculative."
            consistency_desc = "Internal consistency is moderate with generally coherent flow. Some timeline or argument inconsistencies may be present but don't undermine the main narrative."
            source_desc = "Sources show varied credibility with combination of reliable and questionable references. Some institutional sources present alongside less verifiable claims."
            quality_desc = "Writing quality varies with informative sections alongside potentially biased or opinion-based content. Tone may show some editorial influence."
            conclusion_desc = f"The {factuality_score}% score indicates mostly reliable information with notable concerns about complete accuracy or source reliability."
        
        elif factuality_score >= 26:
            level = "Low"
            claim_desc = "Claims in the article show questionable content with frequent issues. Factual assertions are balanced by speculative or unconfirmed statements that raise reliability concerns."
            consistency_desc = "Internal consistency is poor with problematic logical flow. Some contradictions or unclear connections between different parts of the narrative affect credibility."
            source_desc = "Source credibility is variable with mix of unreliable references. Equal or greater weight given to questionable sources over credible ones."
            quality_desc = "Content quality is inconsistent with biased sections mixed with sensational elements. Professional standards are frequently compromised."
            conclusion_desc = f"The {factuality_score}% score reflects significant reliability concerns due to questionable sourcing, inconsistencies, and misleading content patterns."
            level = "Low"
            claim_desc = "Many claims lack proper verification and appear speculative or misleading. Assertions often cannot be confirmed through reliable sources."
            consistency_desc = "Internal consistency is poor with contradictory statements and unclear timeline. Narrative flow is disrupted by logical inconsistencies."
            source_desc = "Sources are largely questionable or anonymous with few credible references. Heavy reliance on unverifiable or biased sources."
            quality_desc = "Content quality is poor with sensational tone and clear bias. Writing appears designed to influence rather than inform."
            conclusion_desc = f"The {factuality_score}% score indicates significant reliability concerns due to poor sourcing, inconsistencies, and misleading content patterns."
        
        else:  # 0-25%
            level = "Very Low"
            claim_desc = "The article contains primarily unverifiable or false claims that contradict established facts. Main assertions appear fabricated or severely distorted."
            consistency_desc = "Internal consistency is severely compromised with major contradictions and illogical flow. Timeline and narrative structure are fundamentally flawed."
            source_desc = "Sources are unreliable, anonymous, or completely absent. No credible institutional backing or verifiable references provided."
            quality_desc = "Content quality is very poor with highly sensational and biased presentation. Writing appears deliberately misleading or inflammatory."
            conclusion_desc = f"The {factuality_score}% score reflects content that appears largely fabricated or severely misleading, contradicting reliable sources and journalistic standards."
        
        return {
            "claim_verification": claim_desc,
            "internal_consistency": consistency_desc,
            "source_assessment": source_desc,
            "content_quality": quality_desc,
            "conclusion": conclusion_desc,
            "factuality_level": level
        }

# Initialize global analyzer instance
gemini_analyzer = GeminiAnalyzer()
