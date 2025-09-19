# Fake News Detection Process Documentation

## Overview
This is a sophisticated fake news detection system specifically designed for **Philippine political content**, using multiple AI technologies and cross-checking mechanisms.

## Complete Detection Pipeline

### 1. Input Processing & Article Extraction

#### Two Input Methods:
- **Link Input**: URLs from news websites
- **Snippet Input**: User-provided text

#### Article Extraction Process (`services/article_extractor.py`):
- Uses **Selenium WebDriver** with Chrome for dynamic content extraction
- Falls back to **Newspaper3k** library for static extraction
- Optimized with eager page loading and disabled unnecessary resources
- Extracts title, content, authors, publish date, keywords, and images
- Generates clean content previews (up to 120 words ending at sentence boundaries)

**Key Features:**
```python
# Chrome options for optimized extraction
options.page_load_strategy = "eager"  # Don't wait for all resources
# Disable images, stylesheets for faster loading
prefs = {
    "profile.managed_default_content_settings.images": 2,
    "profile.managed_default_content_settings.stylesheets": 2,
    # ... other optimizations
}
```

### 2. Content Classification & Filtering

#### Philippine Political Content Check (`helpers.py` - GeminiAnalyzer):
- Uses **Gemini AI** with rotating API keys for content classification
- Determines if content is Philippine political news
- Checks content safety for AI analysis
- **CRITICAL FILTER**: Only Philippine political content proceeds to full analysis
- Non-political content is immediately rejected with appropriate message

**Classification Logic:**
```python
def check_philippine_political_content(self, content: str) -> Dict[str, Any]:
    # Analyzes content for Philippine political indicators
    # Keywords: 'philippines', 'manila', 'duterte', 'marcos', 'senate', etc.
    # Returns: is_philippine_political, is_safe_content, confidence, reason
```

### 3. Duplicate Analysis Prevention

#### Database Check:
- Searches global database for existing analyses before processing
- Matches by title, URL, and content summary
- **Saves API resources** by reusing existing results
- Handles user-specific history management

**Benefits:**
- Prevents redundant API calls
- Faster response times for duplicate content
- Consistent results across users
- Resource optimization

### 4. Title Processing

#### Three Title Methods:
- **Automatic**: AI-generated using Gemini or extracted from webpage
- **Manual**: User-provided title
- **Extracted**: From article metadata during content extraction

#### Title Generation (`helpers.py`):
- Uses Selenium + Newspaper for webpage title extraction
- Gemini AI fallback for content-based title generation
- Smart fallback to meaningful content snippets
- Cleans and formats titles appropriately

**Title Processing Pipeline:**
1. Check for pre-extracted title from content extraction
2. Selenium + Newspaper extraction for URLs
3. Gemini AI generation as fallback
4. Smart content-based title extraction
5. Domain-based fallback titles

### 5. Machine Learning Prediction

#### Model Service (`services/model_service.py`):
- **TF-IDF Vectorization** with 5000 max features
- **Ensemble approach**: Tests Logistic Regression, Random Forest, Naive Bayes
- **Text Preprocessing**: Lowercasing, regex cleaning, stemming, stopword removal
- **Model Persistence**: Loads pre-trained model from `fake_news_model.pkl`
- Outputs base ML factuality score (0-100%)

**Preprocessing Steps:**
```python
def preprocess_text(self, text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)  # Remove non-alphabetic
    text = ' '.join(text.split())            # Normalize whitespace
    words = text.split()
    words = [self.stemmer.stem(word) for word in words if word not in self.stop_words]
    return ' '.join(words)
```

**Model Training:**
- Tests multiple algorithms and selects best performer
- Uses stratified train-test split (80/20)
- Evaluates on accuracy score
- Saves best model with metadata

### 6. Cross-Check Verification

#### External Validation (`crosscheck.py`):
- **Google Custom Search API** with rotating keys
- Searches **18+ trusted news domains**:
  - International: CNN, BBC, Reuters, AP News, The Guardian
  - Philippine: Rappler, ABS-CBN, Inquirer, GMA, Philippine Star, Manila Bulletin, PNA
- **Semantic Similarity Analysis** using dedicated Gemini client
- Compares titles for similarity (60% threshold)
- Returns confidence levels: Very High, High, Medium, Low

**Trusted Domains:**
```python
TRUSTED_DOMAINS = [
    "cnn.com", "bbc.com", "reuters.com", "rappler.com", "abs-cbn.com",
    "inquirer.net", "newsinfo.inquirer.net", "gmanetwork.com", "philstar.com", 
    "mb.com.ph", "manilatimes.net", "pna.gov.ph", "politiko.com.ph", 
    "malaya.com.ph", "msn.com", "news.google.com", "apnews.com", "theguardian.com"
]
```

**Search Process:**
1. Chunk domains into OR-queries for efficient searching
2. Use Google Custom Search API with domain restrictions
3. Extract and parse search results
4. Compare semantic similarity using Gemini AI
5. Filter results above similarity threshold
6. Rank by similarity score

### 7. Gemini AI Factuality Assessment

#### Enhanced AI Analysis (`helpers.py`):
- **Dedicated factuality scoring** (0-100%) using Gemini AI
- **Source-aware scoring** - boosts scores when cross-check finds trusted sources
- **Intelligent boost calculation** based on:
  - Number of trusted sources found
  - Average similarity scores
  - Cross-check confidence levels
- **Maximum 25-point boost** for strong external validation

**Scoring Criteria:**
```
90-100: Very High - Highly factual, well-sourced, verifiable claims
75-89:  High - Generally factual with minor concerns
51-74:  Mostly Factual - Some questionable elements but generally reliable
26-50:  Low - Frequently misleading or poorly sourced
0-25:   Very Low - Largely false, fabricated, or contradicts verified sources
```

**Source Boost Logic:**
- Strong validation (3+ sources, 70%+ similarity): Full boost
- High confidence (2+ sources, 80%+ similarity): Full boost
- Broad coverage (4+ sources): Full boost regardless of similarity
- High precision (1 source, 90%+ similarity): Full boost

### 8. Weighted Score Calculation

#### Intelligent Score Fusion (`services/model_service.py`):
- **Dynamic weighting** between ML and Gemini scores
- **Source-boost awareness** - trusts Gemini more when source-validated
- **Weighted configurations** based on trusted source count:

| Trusted Sources | ML Weight | Gemini Weight | Reasoning |
|----------------|-----------|---------------|-----------|
| 0 sources | 90% | 10% | No external validation, trust ML |
| 1 source | 70% | 30% | Weak external support, mostly ML |
| 2 sources | 40% | 60% | Moderate external confirmation |
| 3+ sources | 20% | 80% | Strong consensus, rely on Gemini |

**Special Handling:**
- **Source-boosted Gemini scores**: Enhanced trust when Gemini score was boosted by external validation
- **Disagreement resolution**: Balanced weights for extreme score differences
- **Confidence adjustment**: Additional boosts for highly source-validated scores

### 9. Content Analysis & Breakdown

#### Detailed Factuality Analysis (`helpers.py`):
- **5-factor analysis**:
  1. **Claim Verification**: Evidence quality and source backing
  2. **Internal Consistency**: Logical coherence and timeline
  3. **Source Assessment**: Credibility and transparency
  4. **Content Quality**: Writing standards and bias detection
  5. **Conclusion**: Overall assessment reasoning

**Key Features:**
- **Temporal filtering** - removes date references to avoid time-based bias
- **Context-aware analysis** including cross-check results
- **Professional presentation** with detailed explanations
- **JSON-structured output** for consistent parsing

**Analysis Prompt Structure:**
```
CRITICAL ANALYSIS INSTRUCTIONS:
- Focus EXCLUSIVELY on content structure, sourcing methodology, and presentation quality
- NEVER compare any statement to today's date, the system date, or any "current" timeframe
- DO NOT reference, mention, or analyze ANY specific dates or temporal sequences
- Treat the content as a standalone document without temporal context
- Focus purely on: source attribution, evidence quality, logical structure, writing standards
```

### 10. Content Summarization

#### AI-Powered Summarization:
- **3-sentence maximum** strict limit
- Uses Gemini AI with fallback to sentence tokenization
- Maintains objectivity and key facts
- Provides clean previews for frontend display

**Summarization Process:**
1. Gemini AI generates concise 3-sentence summary
2. Sentence boundary validation and enforcement
3. Fallback to NLTK sentence tokenization if needed
4. Simple truncation as last resort

### 11. Final Classification & Output

#### Classification Logic:
- **Real**: Factuality score ≥ 51%
- **Fake**: Factuality score < 51%

#### Factuality Levels:
- **Very High (90-100%)**: Highly factual, well-sourced
- **High (75-89%)**: Generally factual, minor concerns
- **Mostly Factual (51-74%)**: Some questionable elements
- **Low (26-50%)**: Frequently misleading
- **Very Low (0-25%)**: Largely false/fabricated

#### Output Structure:
```json
{
    "prediction": "Real/Fake",
    "confidence": 0.85,
    "factuality_score": 78,
    "factuality_level": "High",
    "factuality_description": "Generally factual with minor sourcing concerns",
    "factuality_breakdown": {
        "claim_verification": "...",
        "internal_consistency": "...",
        "source_assessment": "...",
        "content_quality": "...",
        "conclusion": "..."
    },
    "cross_check": {
        "status": "verified",
        "confidence": "High",
        "matches": [...]
    },
    "weighting_info": {
        "original_ml_score": 70,
        "gemini_score": 85,
        "ml_weight": 0.4,
        "gemini_weight": 0.6
    }
}
```

### 12. Database Storage & User History

#### Analysis Persistence:
- Saves complete analysis results to SQLite database
- **Global sharing** - reuses analyses across users
- **User-specific history** tracking
- **Feedback integration** for model improvement
- **Processing time tracking** and performance metrics

**Database Schema:**
- **articles**: Core article information
- **user_analysis**: User-specific analysis history
- **factuality_breakdowns**: Detailed analysis components
- **crosscheck_results**: External validation results
- **user_feedback**: User corrections for model improvement

## Key Technical Features

### API Key Rotation
- **Multiple Gemini keys**: 3 rotating keys for different functions
- **Google CSE keys**: 3 rotating keys for search API
- **Automatic failover**: Switches keys on rate limits
- **Usage tracking**: Monitors key performance and limits

### Cancellation Support
- **Analysis tracking**: Unique IDs for each analysis
- **Cancellation endpoints**: Users can cancel long-running analyses
- **Resource cleanup**: Proper cleanup of cancelled operations
- **State management**: Global cancellation tracking

### Error Handling
- **Comprehensive fallbacks** at every stage
- **Graceful degradation**: System continues with reduced functionality
- **User-friendly messages**: Clear error communication
- **Logging and debugging**: Detailed error tracking

### Resource Optimization
- **API call reduction**: Smart caching and duplicate detection
- **Efficient extraction**: Optimized Selenium settings
- **Parallel processing**: Where possible without violating rate limits
- **Memory management**: Proper cleanup of browser instances

### Security Features
- **Input validation**: Comprehensive sanitization
- **URL parsing**: Safe handling of external URLs
- **Error sanitization**: No sensitive information leakage
- **Rate limiting**: Built-in protection against abuse

## Performance Metrics

### Typical Processing Times:
- **Content extraction**: 3-8 seconds
- **ML prediction**: < 1 second
- **Cross-check verification**: 5-15 seconds
- **Gemini analysis**: 3-10 seconds
- **Total analysis**: 10-30 seconds

### Accuracy Factors:
- **ML model accuracy**: Varies by model selection (typically 85-95%)
- **Cross-check validation**: Improves accuracy by 10-15%
- **Gemini integration**: Provides contextual understanding
- **Weighted scoring**: Balances multiple approaches for optimal results

## System Requirements

### API Dependencies:
- **Gemini AI**: 3+ API keys recommended for rotation
- **Google Custom Search**: 3+ keys for cross-checking
- **ChromeDriver**: For web content extraction

### Python Dependencies:
- **Flask**: Web framework
- **Selenium**: Web automation
- **scikit-learn**: Machine learning
- **NLTK**: Natural language processing
- **newspaper3k**: Article extraction
- **pandas/numpy**: Data processing

### Hardware Requirements:
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: Multi-core processor for parallel processing
- **Storage**: 2GB for model files and database
- **Network**: Stable internet for API calls

## Maintenance & Updates

### Model Retraining:
- **Feedback integration**: User corrections improve model
- **Periodic retraining**: Scheduled model updates
- **Performance monitoring**: Accuracy tracking over time
- **Dataset expansion**: Continuous data collection

### API Management:
- **Key rotation**: Regular key updates
- **Usage monitoring**: Track API consumption
- **Rate limit handling**: Automatic key switching
- **Cost optimization**: Efficient API usage

### Database Maintenance:
- **Regular cleanup**: Remove old analyses
- **Performance optimization**: Index maintenance
- **Backup procedures**: Data protection
- **Migration scripts**: Schema updates

This comprehensive detection system provides robust, multi-layered fake news detection specifically optimized for Philippine political content, combining traditional machine learning with modern AI technologies and external verification for maximum accuracy and reliability.
