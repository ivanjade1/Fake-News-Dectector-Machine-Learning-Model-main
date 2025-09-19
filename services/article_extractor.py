import time
import os
import logging
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from newspaper import Article
import nltk
from nltk.tokenize import sent_tokenize

# Suppress logs for cleaner output
os.environ['WDM_LOG_LEVEL'] = '0'
logging.getLogger('selenium').setLevel(logging.CRITICAL)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)

# News source mapping for friendly names
SOURCE_NAME_MAP = {
    "cnn.com": "CNN", "edition.cnn.com": "CNN", "bbc.com": "BBC", "reuters.com": "Reuters",
    "rappler.com": "Rappler", "abs-cbn.com": "ABS-CBN News", "news.abs-cbn.com": "ABS-CBN News",
    "inquirer.net": "Philippine Daily Inquirer", "gmanetwork.com": "GMA Network", 
    "mb.com.ph": "Manila Bulletin", "philstar.com": "The Philippine Star",
    "manilatimes.net": "The Manila Times", "theguardian.com": "The Guardian",
    "pna.gov.ph": "Philippine News Agency"
}

class ArticleExtractor:
    def __init__(self):
        pass
    
    def get_chrome_options(self):
        """Get standardized Chrome options for Selenium with eager loading"""
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920x1080")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        options.add_argument("--log-level=3")
        options.add_experimental_option("excludeSwitches", ["enable-logging"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Key improvement: Use eager page load strategy
        options.page_load_strategy = "eager"  # Don't wait for all resources to load
        
        # Disable unnecessary resources for faster loading
        prefs = {
            "profile.managed_default_content_settings.images": 2,
            "profile.managed_default_content_settings.stylesheets": 2,
            "profile.managed_default_content_settings.plugins": 2,
            "profile.managed_default_content_settings.popups": 2,
            "profile.managed_default_content_settings.geolocation": 2,
            "profile.managed_default_content_settings.notifications": 2,
            "profile.managed_default_content_settings.media_stream": 2
        }
        options.add_experimental_option("prefs", prefs)
        return options

    def create_chrome_driver(self):
        """Create and return a Chrome WebDriver instance"""
        try:
            service = Service(ChromeDriverManager().install())
            return webdriver.Chrome(service=service, options=self.get_chrome_options())
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {str(e)}")
            return None

    def static_article_extract(self, url):
        """Fallback pure-newspaper extraction without Selenium"""
        try:
            print(f"Using fallback newspaper extraction for: {url}")
            article = Article(url, language='en')
            article.download()
            article.parse()
            
            if article.text and len(article.text.strip()) > 50:
                try:
                    article.nlp()
                except Exception as e:
                    print(f"NLP processing failed in fallback: {str(e)}")
                return article
        except Exception as e:
            print(f"Static newspaper extraction failed: {str(e)}")
        return None

    def preview_text(self, text, max_words=120):
        """Return a clean preview ending at sentence boundary up to max_words."""
        if not text:
            return ""
        try:
            sentences = sent_tokenize(text)
            preview = []
            word_count = 0
            for sentence in sentences:
                words = sentence.split()
                if word_count + len(words) <= max_words:
                    preview.append(sentence)
                    word_count += len(words)
                else:
                    break
            return " ".join(preview)
        except Exception:
            # Fallback if NLTK fails - use period-based sentence splitting
            sentences = text.split('.')
            preview = []
            word_count = 0
            for sentence in sentences:
                words = sentence.strip().split()
                if words and word_count + len(words) <= max_words:
                    preview.append(sentence.strip())
                    word_count += len(words)
                else:
                    break
            # Join with periods and ensure proper ending
            result = '.'.join(preview)
            if result and not result.endswith('.'):
                result += '.'
            return result

    def print_extracted_article_info(self, article_info, url):
        """Print formatted article information to terminal for better readability"""
        print("\n" + "="*80)
        print("📰 EXTRACTED ARTICLE INFORMATION")
        print("="*80)
        
        print(f"\n🔗 SOURCE URL:")
        print(f"   {url}")
        
        print(f"\n📰 NEWS SOURCE:")
        print(f"   {article_info.get('source', 'Unknown Source')}")
        
        print(f"\n📝 ARTICLE TITLE:")
        title = article_info.get('title', 'Untitled Article')
        print(f"   {title}")
        
        print(f"\n✍️ AUTHORS:")
        authors = article_info.get('authors', [])
        if authors and len(authors) > 0:
            for i, author in enumerate(authors[:3]):  # Show max 3 authors
                print(f"   {i+1}. {author}")
            if len(authors) > 3:
                print(f"   ... and {len(authors) - 3} more author(s)")
        else:
            print("   No authors identified")
        
        print(f"\n📅 PUBLISH DATE:")
        pub_date = article_info.get('publish_date')
        if pub_date and pub_date != 'None':
            print(f"   {pub_date}")
        else:
            print("   Date not available")
        
        print(f"\n🖼️ TOP IMAGE:")
        top_image = article_info.get('top_image')
        if top_image:
            print(f"   {top_image}")
        else:
            print("   No image found")
        
        print(f"\n🏷️ KEYWORDS:")
        keywords = article_info.get('keywords', [])
        if keywords and len(keywords) > 0:
            # Show max 10 keywords
            keyword_list = keywords[:10]
            keywords_str = ", ".join(keyword_list)
            print(f"   {keywords_str}")
            if len(keywords) > 10:
                print(f"   ... and {len(keywords) - 10} more keyword(s)")
        else:
            print("   No keywords identified")
        
        print(f"\n📄 CONTENT PREVIEW (Same as Frontend):")
        preview = article_info.get('content_preview', '')
        if preview:
            # Display the EXACT same content preview that's sent to frontend
            # Format it nicely in terminal but keep the same text
            print(f"   {preview}")
            print(f"   ")
            print(f"   📏 Preview Length: {len(preview.split())} words")
            
            # Check if it ends properly at sentence boundary
            if preview.endswith('.') or preview.endswith('!') or preview.endswith('?'):
                print(f"   ✅ Ends at sentence boundary")
            else:
                print(f"   ⚠️  May not end at sentence boundary")
        else:
            print("   No preview available")
        
        print(f"\n📊 CONTENT STATISTICS:")
        content = article_info.get('content', '')
        if content:
            word_count = len(content.split())
            char_count = len(content)
            sentences_count = len([s for s in content.split('.') if s.strip()])
            print(f"   Word count: {word_count:,}")
            print(f"   Character count: {char_count:,}")
            print(f"   Approximate sentences: {sentences_count:,}")
        else:
            print("   No content statistics available")
        
        print("="*80 + "\n")

    def extract_article_content(self, url):
        """Extract article content with improved timeout handling and fallback"""
        try:
            print(f"Extracting content from URL: {url}")
            
            article_data = None
            
            # Phase 1: Try Selenium with aggressive timeouts
            driver = self.create_chrome_driver()
            if driver:
                try:
                    # Set shorter page load timeout for faster failure
                    driver.set_page_load_timeout(15)  # Reduced from 30
                    
                    print("Attempting Selenium extraction...")
                    driver.get(url)
                    
                    # Wait for content with shorter timeout
                    try:
                        WebDriverWait(driver, 5).until(  # Reduced from 10
                            EC.any_of(
                                EC.presence_of_element_located((By.TAG_NAME, "article")),
                                EC.presence_of_element_located((By.CLASS_NAME, "article-content")),
                                EC.presence_of_element_located((By.CLASS_NAME, "post-content")),
                                EC.presence_of_element_located((By.TAG_NAME, "main"))
                            )
                        )
                    except Exception:
                        # Don't wait long if elements aren't found
                        time.sleep(1)
                    
                    html = driver.page_source
                    
                    # Parse with newspaper
                    article = Article(url)
                    article.download_state = 2  # Mark as downloaded
                    article.html = html
                    article.parse()
                    
                    # Perform NLP if text is available
                    if article.text and len(article.text.strip()) > 50:
                        try:
                            article.nlp()
                        except Exception as e:
                            print(f"NLP processing failed: {str(e)}")
                        
                        article_data = article
                        print("Selenium extraction successful")
                    else:
                        print("Selenium extracted insufficient content, will try fallback")
                        
                except Exception as e:
                    error_msg = str(e).lower()
                    if "timeout" in error_msg:
                        print(f"Selenium timeout occurred: {str(e)}")
                    elif "net::" in error_msg:
                        print(f"Network error with Selenium: {str(e)}")
                    else:
                        print(f"Selenium extraction failed: {str(e)}")
                finally:
                    try:
                        driver.quit()
                    except:
                        pass
            
            # Phase 2: Fallback to pure newspaper extraction if Selenium failed
            if not article_data or not article_data.text or len(article_data.text.strip()) < 100:
                print("Selenium failed or insufficient content, trying newspaper fallback...")
                fallback_article = self.static_article_extract(url)
                
                if fallback_article and fallback_article.text and len(fallback_article.text.strip()) > 50:
                    article_data = fallback_article
                    print("Fallback newspaper extraction successful")
            
            # Phase 3: Final validation
            if not article_data or not article_data.text or len(article_data.text.strip()) < 50:
                return {'error': 'Could not extract meaningful content from the webpage. The site may be blocking automated access or the content may not be accessible.'}
            
            # Get source name from domain
            try:
                domain = urlparse(url).netloc.replace("www.", "")
                source_name = next((SOURCE_NAME_MAP[domain_key] for domain_key in SOURCE_NAME_MAP if domain_key in domain), domain)
            except Exception:
                source_name = "Unknown Source"
            
            content_preview = self.preview_text(article_data.text, max_words=120)
            
            # Format the result
            result = {
                'title': article_data.title or 'Untitled Article',
                'content': article_data.text,
                'combined': f"{article_data.title or ''} {article_data.text}".strip(),
                'source': source_name,
                'authors': article_data.authors,
                'publish_date': str(article_data.publish_date) if article_data.publish_date else None,
                'top_image': article_data.top_image,
                'keywords': getattr(article_data, 'keywords', []),
                'summary': getattr(article_data, 'summary', '') or content_preview,
                'content_preview': content_preview
            }
            
            # Print formatted article information to terminal using the SAME content preview
            self.print_extracted_article_info(result, url)
            
            return result
            
        except Exception as e:
            print(f"Unexpected error in article extraction: {str(e)}")
            
            # Last resort: Try one more time with just newspaper
            try:
                print("Attempting final fallback extraction...")
                final_attempt = self.static_article_extract(url)
                if final_attempt and final_attempt.text and len(final_attempt.text.strip()) > 50:
                    # Quick result formatting using same preview logic
                    try:
                        domain = urlparse(url).netloc.replace("www.", "")
                        source_name = next((SOURCE_NAME_MAP[domain_key] for domain_key in SOURCE_NAME_MAP if domain_key in domain), domain)
                    except:
                        source_name = "Unknown Source"
                    
                    content_preview = self.preview_text(final_attempt.text, max_words=120)
                    
                    final_result = {
                        'title': final_attempt.title or 'Untitled Article',
                        'content': final_attempt.text,
                        'combined': f"{final_attempt.title or ''} {final_attempt.text}".strip(),
                        'source': source_name,
                        'authors': getattr(final_attempt, 'authors', []),
                        'publish_date': str(final_attempt.publish_date) if final_attempt.publish_date else None,
                        'top_image': getattr(final_attempt, 'top_image', ''),
                        'keywords': getattr(final_attempt, 'keywords', []),
                        'summary': getattr(final_attempt, 'summary', '') or content_preview,
                        'content_preview': content_preview
                    }
                    
                    # Print formatted article information for final attempt using SAME content preview
                    self.print_extracted_article_info(final_result, url)
                    
                    return final_result
            except Exception as final_error:
                print(f"Final fallback also failed: {str(final_error)}")
            
            return {'error': f"Failed to extract content from the URL. This could be due to website restrictions, network issues, or the content not being accessible to automated tools."}
