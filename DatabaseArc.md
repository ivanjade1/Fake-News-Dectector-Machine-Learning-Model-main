# TruthGuard Database Architecture

## Overview

TruthGuard's database architecture is designed around three core tables that handle the complete fact-checking workflow for Philippine political news articles.

## Core Database Tables

### 1. `articles` Table
Central table storing analyzed Philippine political news articles and fact-checking results.

```sql
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    link VARCHAR(2048),
    content TEXT NOT NULL,
    summary TEXT,
    input_type VARCHAR(10) NOT NULL CHECK (input_type IN ('link', 'snippet')),
    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    factuality_score INTEGER CHECK (factuality_score >= 0 AND factuality_score <= 100),
    factuality_level VARCHAR(50),
    factuality_description TEXT,
    classification VARCHAR(10) CHECK (classification IN ('Real', 'Fake', 'Mixed')),
    cross_check_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Primary key, article identifier
- `title`: Article title (max 255 characters)
- `link`: Source URL (max 2048 characters)
- `content`: Full article text content/content preview shown in the frontend
- `summary`: AI-generated summary
- `input_type`: Type of input ('link' or 'snippet')
- `analysis_date`: When the analysis was performed
- `factuality_score`: Numerical score (0-100) (Combined Final Score ML + Gemini)
- `factuality_level`: Categorical rating (Very Low, Low, Mixed, Mostly Factual, High, Very High)
- `factuality_description`: Detailed explanation of the score (            - 90-100: Very High - Highly factual, well-sourced, verifiable claims
            - 75-89: High - Generally factual with minor concerns
            - 51-74: Mostly Factual - Some questionable elements but generally reliable
            - 50: Mixed - Equal amounts of factual and questionable content
            - 26-49: Low - Frequently misleading or poorly sourced
            - 0-25: Very Low - Largely false, fabricated, or contradicts verified sources)
- `classification`: Final verdict ('Real', 'Fake', 'Mixed')
- `cross_check_data`: JSON with verification results from trusted sources

### 2. `breakdowns` Table
Stores detailed AI-generated factuality analysis components.

```sql
CREATE TABLE breakdowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    claim_verification TEXT,
    internal_consistency TEXT,
    source_assessment TEXT,
    content_quality TEXT,
    analysis_conclusion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

**Fields**:
- `id`: Primary key
- `article_id`: Reference to analyzed article
- `claim_verification`: Analysis of claim support methodology
- `internal_consistency`: Logical structure evaluation
- `source_assessment`: Source credibility analysis
- `content_quality`: Writing and presentation standards review
- `analysis_conclusion`: Summary explanation of factuality score

### 3. `crosscheckresults` Table
Stores individual cross-reference verification results from trusted Philippine news sources.

```sql
CREATE TABLE crosscheckresults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    search_query VARCHAR(500),
    match_title VARCHAR(500),
    match_url VARCHAR(2048),
    similarity_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

**Fields**:
- `id`: Primary key, cross-check result identifier
- `article_id`: Foreign key to the article being verified
- `source_name`: Name of the trusted news source (e.g., 'PNA', 'Inquirer', 'Rappler')
- `search_query`: The search terms used to find matching content
- `match_title`: Title of the matching article found
- `match_url`: URL of the matching article
- `similarity_score`: Percentage similarity between the analyzed content and the found match (0-100)
- `created_at`: When the cross-check was performed

This table stores the results of cross-referencing analyzed content against trusted Philippine news sources to validate the story's authenticity. Each row represents one source's verification result for a specific article.
