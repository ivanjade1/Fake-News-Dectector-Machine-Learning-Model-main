import os
import logging
import re
import json
import requests
from urllib.parse import urlparse
from google import genai

logger = logging.getLogger(__name__)

# API credentials with rotating key support for CSE
GOOGLE_API_KEYS = [
    os.getenv("GOOGLE_CSE_API_KEY"),
    os.getenv("GOOGLE_CSE_API_KEY2"), 
    os.getenv("GOOGLE_CSE_API_KEY3")
]
# Filter out None values to get only available keys
GOOGLE_API_KEYS = [key for key in GOOGLE_API_KEYS if key]

GOOGLE_CX_ID = os.getenv("GOOGLE_CSE_ID")

# Dedicated Gemini client for similarity comparison with initialization guard
GEMINI_WEB_SEARCH_KEY = os.getenv("GEMINI_WEB_SEARCH")
gemini_similarity_client = None
_gemini_client_initialized = False

def initialize_gemini_client():
    """Initialize Gemini client only once"""
    global gemini_similarity_client, _gemini_client_initialized
    
    if _gemini_client_initialized:
        return
    
    _gemini_client_initialized = True
    
    if GEMINI_WEB_SEARCH_KEY:
        try:
            gemini_similarity_client = genai.Client(api_key=GEMINI_WEB_SEARCH_KEY)
            print(f"🔧 Gemini similarity client initialized with key ...{GEMINI_WEB_SEARCH_KEY[-4:]}")
        except Exception as e:
            print(f"Warning: Failed to initialize Gemini similarity client: {e}")
            gemini_similarity_client = None
    else:
        print("Warning: GEMINI_WEB_SEARCH key not found. Similarity comparison will be limited.")

# Initialize client only once
initialize_gemini_client()

# Configuration
MAX_RESULTS    = 5      # how many domains to return
SIM_THRESHOLD  = 60     # minimum similarity percentage
FETCH_CHUNK    = 5      # number of domains per OR-query chunk

# Approved news domains for cross-checking
TRUSTED_DOMAINS = [
    "cnn.com", "bbc.com", "reuters.com", "rappler.com", "abs-cbn.com",
    "inquirer.net", "newsinfo.inquirer.net", "gmanetwork.com", "philstar.com", "mb.com.ph",
    "manilatimes.net", "pna.gov.ph", "politiko.com.ph", "malaya.com.ph",
    "msn.com", "news.google.com", "apnews.com", "theguardian.com"
]

class CrossChecker:
    def __init__(self):
        self.api_available = bool(GOOGLE_API_KEYS and GOOGLE_CX_ID)
        self.current_key_index = 0  # Track current key index for rotation
        self.similarity_client = gemini_similarity_client
        
        if not self.api_available:
            logger.warning("Google CSE credentials missing—cross-check disabled.")
        else:
            logger.info(f"Cross-checker initialized with {len(GOOGLE_API_KEYS)} API key(s)")
            
        if not self.similarity_client:
            logger.warning("Gemini similarity client not available—similarity comparison will be basic.")

    def is_available(self) -> bool:
        return self.api_available

    def _get_next_api_key(self) -> str:
        """Get the next API key in rotation"""
        if not GOOGLE_API_KEYS:
            return None
            
        key = GOOGLE_API_KEYS[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(GOOGLE_API_KEYS)
        
        # Log key rotation for debugging (show only last 4 characters for security)
        key_display = f"...{key[-4:]}" if key and len(key) > 4 else "invalid"
        logger.debug(f"Using API key: {key_display} (index {self.current_key_index - 1 if self.current_key_index > 0 else len(GOOGLE_API_KEYS) - 1})")
        
        return key

    def _search_global(self, query: str, num_results: int = 10):
        """Perform a global Google Custom Search with rotating API keys."""
        if not self.api_available:
            return []
            
        url = "https://www.googleapis.com/customsearch/v1"
        api_key = self._get_next_api_key()
        
        if not api_key:
            logger.warning("No valid API key available for search")
            return []
            
        params = {
            "key": api_key,
            "cx":  GOOGLE_CX_ID,
            "q":   query,
            "num": min(num_results, 10)
        }
        
        try:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            items = resp.json().get("items", []) or []
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Rate limit exceeded
                logger.warning(f"Rate limit exceeded for API key ending in ...{api_key[-4:] if api_key else 'N/A'}")
                # Try with next key if available
                if len(GOOGLE_API_KEYS) > 1:
                    logger.info("Attempting with next API key...")
                    return self._search_global(query, num_results)
            else:
                logger.warning(f"CSE HTTP error {e.response.status_code}: {e}")
            return []
        except Exception as e:
            logger.warning(f"CSE request failed: {e}")
            return []

        results = []
        for it in items:
            link = it.get("link", "")
            dom  = urlparse(link).netloc.lower().replace("www.", "")
            results.append({
                "source":  dom,
                "title":   it.get("title", ""),
                "link":    link,
                "snippet": it.get("snippet", "")
            })
        return results

    def _compare_semantic_similarity(self, original_title: str, search_result: dict):
        """Rate semantic similarity between original title and search result title using dedicated Gemini client."""
        if not self.similarity_client:
            # Fallback to basic string similarity
            original_lower = original_title.lower()
            result_lower = search_result['title'].lower()
            
            # Simple word overlap calculation
            original_words = set(original_lower.split())
            result_words = set(result_lower.split())
            
            if not original_words or not result_words:
                return 0, "Empty titles"
                
            overlap = len(original_words.intersection(result_words))
            total_unique = len(original_words.union(result_words))
            similarity = int((overlap / total_unique) * 100) if total_unique > 0 else 0
            
            return similarity, "Basic word overlap calculation"

        prompt = f"""
You are a semantic comparator for news headlines. Rate similarity 0–100 based on:
- Topic similarity
- Event/fact alignment
- Core subject overlap

Original Title: "{original_title}"
Hit Title: "{search_result['title']}"
Source: {search_result['source']}

Respond in JSON with keys:
{{
  "similarity": integer,
  "reasoning": "brief justification"
}}
"""
        try:
            response = self.similarity_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            if not response or not response.text:
                return 0, "No response from Gemini"
                
            m = re.search(r"\{.*\}", response.text, re.DOTALL)
            if m:
                js = json.loads(m.group())
                sim = max(0, min(100, int(js.get("similarity", 0))))
                reason = js.get("reasoning", "")
                return sim, reason
        except Exception as e:
            logger.warning(f"Gemini similarity comparison failed: {e}")
            
        # Fallback to basic similarity if Gemini fails
        original_lower = original_title.lower()
        result_lower = search_result['title'].lower()
        original_words = set(original_lower.split())
        result_words = set(result_lower.split())
        
        if not original_words or not result_words:
            return 0, "Empty titles (fallback)"
            
        overlap = len(original_words.intersection(result_words))
        total_unique = len(original_words.union(result_words))
        similarity = int((overlap / total_unique) * 100) if total_unique > 0 else 0
        
        return similarity, f"Fallback calculation - {overlap}/{total_unique} word overlap"

    def perform_cross_check(self, article_url: str, article_title: str, article_preview: str) -> dict:
        """Perform cross-reference checking against trusted news domains."""
        if not self.api_available:
            return {
                "status": "unavailable",
                "message": "CSE unavailable",
                "confidence": "Unknown",
                "matches": [],
                "summary": "Credentials required.",
                "total_searched": 0,
                "search_query": ""
            }

        # Handle None or empty article_url for snippet/manual inputs
        orig = ""
        if article_url and isinstance(article_url, str) and article_url.strip():
            try:
                orig = urlparse(article_url).netloc.lower().replace("www.", "")
            except Exception as e:
                print(f"Warning: Could not parse article URL '{article_url}': {e}")
                orig = ""
        
        base_q = article_title or ""
        if len(base_q) > 200:
            base_q = base_q[:200] + "..."

        print(f"\n🔍 CROSS-CHECKING: {base_q[:80]}...")
        print(f"   Available CSE API keys: {len(GOOGLE_API_KEYS)}")
        print(f"   Gemini similarity client: {'Available' if self.similarity_client else 'Not available'}")
        print(f"   Original domain: {orig if orig else 'N/A (snippet/manual input)'}")

        matches = []
        checked_domains = set()

        # chunk domains into OR-queries
        for i in range(0, len(TRUSTED_DOMAINS), FETCH_CHUNK):
            chunk = TRUSTED_DOMAINS[i:i + FETCH_CHUNK]
            # Skip chunk only if we have a valid original domain and it matches
            if orig and all(d == orig or orig.endswith("." + d) for d in chunk):
                continue

            sites_filter = " OR ".join(f"site:{d}" for d in chunk)
            query = f"{base_q} {sites_filter}"
            logger.info("CSE query chunk: %s", query)

            results = self._search_global(query, num_results=FETCH_CHUNK * 2)
            print(f"   Chunk returned {len(results)} results")

            for res in results:
                dom = res["source"]
                # Skip if domain matches original (only if we have an original domain)
                if orig and (dom == orig or dom not in TRUSTED_DOMAINS) or dom in checked_domains:
                    continue
                # For snippet inputs (no orig domain), just check if domain is trusted and not already checked
                if not orig and (dom not in TRUSTED_DOMAINS or dom in checked_domains):
                    continue
                    
                checked_domains.add(dom)

                sim, reason = self._compare_semantic_similarity(article_title, res)
                
                # Enhanced terminal output with source links
                print(f"   🔗 {dom}: {sim}% similarity")
                print(f"      Title: {res['title']}")
                print(f"      Link: {res['link']}")
                print(f"      Reason: {reason[:60]}...")

                if sim >= SIM_THRESHOLD:
                    matches.append({
                        "source": dom,
                        "title": res["title"],
                        "link": res["link"],
                        "snippet": res["snippet"],
                        "similarity": sim,
                        "reasoning": reason
                    })
                    if len(matches) >= MAX_RESULTS:
                        break
            if len(matches) >= MAX_RESULTS:
                break

        # sort and trim
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        top_matches = matches[:MAX_RESULTS]

        # confidence
        avg = sum(m["similarity"] for m in top_matches) / len(top_matches) if top_matches else 0
        if   avg >= 85: confidence, status = "Very High", "verified"
        elif avg >= 70: confidence, status = "High", "confirmed"
        elif avg >= 60: confidence, status = "Medium", "partial"
        else:            confidence, status = "Low", "limited"

        print(f"   📊 Cross-check complete: {len(top_matches)} matches, {confidence} confidence")
        print(f"   CSE API calls made across {len(GOOGLE_API_KEYS)} rotating key(s)")
        print(f"   Gemini similarity API: {'Used' if self.similarity_client else 'Fallback used'}")
        
        # Print final matches with links
        if top_matches:
            print(f"\n📋 FINAL MATCHES:")
            for i, match in enumerate(top_matches, 1):
                print(f"   {i}. {match['source']} ({match['similarity']}%)")
                print(f"      {match['link']}")

        return {
            "status": status,
            "confidence": confidence,
            "matches": top_matches,
            "search_query": base_q,
            "total_searched": len(checked_domains),
            "summary": self._generate_summary(top_matches, confidence)
        }

    def _generate_summary(self, matches: list, confidence: str) -> str:
        if not matches:
            return "No matching reports found."
        count = len(matches)
        avg = sum(m["similarity"] for m in matches) / count
        if count == 1:
            return f"Found 1 report from {matches[0]['source']} at {avg:.0f}% ({confidence})."
        srcs = ", ".join(m['source'] for m in matches[:3])
        if count > 3:
            srcs += f" and {count-3} more"
        return f"Found {count} reports from {srcs}, avg {avg:.0f}% ({confidence})."

    def get_key_status(self) -> dict:
        """Get status information about available API keys"""
        return {
            "total_cse_keys": len(GOOGLE_API_KEYS),
            "current_index": self.current_key_index,
            "cse_keys_available": self.api_available,
            "next_key_preview": f"...{GOOGLE_API_KEYS[self.current_key_index][-4:]}" if GOOGLE_API_KEYS else "None",
            "gemini_similarity_available": self.similarity_client is not None,
            "gemini_similarity_key": f"...{GEMINI_WEB_SEARCH_KEY[-4:]}" if GEMINI_WEB_SEARCH_KEY else "None"
        }

# Global cross-checker instance
cross_checker = CrossChecker()
