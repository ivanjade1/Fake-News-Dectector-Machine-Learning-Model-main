# TruthGuard Database Dictionary

This document describes the database structure for the TruthGuard fake news detection system.

---

# Articles Table

| Collection ID | Data Item               | Data Type     | Required | Description                                           |
|---------------|-------------------------|---------------|----------|-------------------------------------------------------|
| articles      | id                     | integer       | Yes      | Article unique ID, auto generated primary key         |
|               | title                  | varchar(255)  | Yes      | Article title or headline                             |
|               | link                   | varchar(2048) | No       | Source URL (for link-based analysis)                 |
|               | content                | text          | Yes      | Full article content or user-provided text           |
|               | summary                | text          | No       | AI-generated summary of the content                  |
|               | input_type             | varchar(10)   | Yes      | Input method: 'url' or 'snippet'                    |
|               | analysis_date          | datetime      | No       | When the analysis was performed                      |
|               | factuality_score       | integer       | No       | Calculated factuality score (0-100)                 |
|               | factuality_level       | varchar(50)   | No       | Factuality level (Very Low/Low/Mostly Factual/High/Very High) |
|               | factuality_description | text          | No       | Description of factuality assessment                 |
|               | classification         | varchar(10)   | No       | Final classification: 'Real' or 'Fake'              |
|               | cross_check_data       | text          | No       | JSON data from cross-check verification              |
|               | created_at             | datetime      | No       | Record creation timestamp                            |
|               | updated_at             | datetime      | No       | Record last update timestamp                         |
|               | user_id                | integer       | No       | Foreign key reference to users table                |

**Foreign Keys:**
- user_id → users.id

---

# Breakdowns Table

| Collection ID | Data Item            | Data Type | Required | Description                                      |
|---------------|----------------------|-----------|----------|--------------------------------------------------|
| breakdowns    | id                   | integer   | Yes      | Breakdown unique ID, auto generated primary key  |
|               | article_id           | integer   | Yes      | Foreign key reference to articles table         |
|               | claim_verification   | text      | No       | Analysis of claim verification methodology       |
|               | internal_consistency | text      | No       | Analysis of internal logical consistency         |
|               | source_assessment    | text      | No       | Assessment of source credibility                 |
|               | content_quality      | text      | No       | Evaluation of writing quality and standards      |
|               | analysis_conclusion  | text      | No       | Overall conclusion of the factuality analysis   |
|               | created_at           | datetime  | No       | Record creation timestamp                        |

**Foreign Keys:**
- article_id → articles.id

---

# CrossCheckResults Table

| Collection ID    | Data Item        | Data Type     | Required | Description                                      |
|------------------|------------------|---------------|----------|--------------------------------------------------|
| crosscheckresults| id              | integer       | Yes      | CrossCheck unique ID, auto generated primary key |
|                  | article_id      | integer       | Yes      | Foreign key reference to articles table         |
|                  | source_name     | varchar(255)  | Yes      | Name of the trusted news source                  |
|                  | search_query    | varchar(500)  | No       | Query used to search for matching content       |
|                  | match_title     | varchar(500)  | No       | Title of the matching article found             |
|                  | match_url       | varchar(2048) | No       | URL of the matching article                      |
|                  | similarity_score| float         | No       | Semantic similarity score (0-100)               |
|                  | created_at      | datetime      | No       | Record creation timestamp                        |

**Foreign Keys:**
- article_id → articles.id

---

# Users Table

| Collection ID | Data Item     | Data Type     | Required | Description                                      |
|---------------|---------------|---------------|----------|--------------------------------------------------|
| users         | id            | integer       | Yes      | User unique ID, auto generated primary key       |
|               | username      | varchar(20)   | Yes      | Unique username for login                        |
|               | email         | varchar(120)  | Yes      | Unique email address                             |
|               | password_hash | varchar(255)  | Yes      | Hashed password for authentication              |
|               | role          | varchar(10)   | Yes      | User role: 'admin' or 'user' (default: 'user')  |
|               | created_at    | datetime      | No       | Account creation timestamp                       |
|               | last_login    | datetime      | No       | Last login timestamp                             |
|               | is_active     | boolean       | Yes      | Account active status flag                       |

---

# Feedback Table

| Collection ID | Data Item       | Data Type     | Required | Description                                      |
|---------------|-----------------|---------------|----------|--------------------------------------------------|
| feedback      | id              | integer       | Yes      | Feedback unique ID, auto generated primary key   |
|               | name            | varchar(255)  | No       | User's name (for guest feedback)                |
|               | comments        | text          | Yes      | Feedback comments and suggestions                |
|               | rating          | integer       | Yes      | Numerical rating (1-5 stars)                    |
|               | submission_date | datetime      | Yes      | When feedback was submitted                      |
|               | user_id         | integer       | No       | Foreign key reference to users table            |

**Foreign Keys:**
- user_id → users.id

**Constraints:**
- rating must be between 1 and 5

---

# UserGameStats Table

| Collection ID    | Data Item            | Data Type | Required | Description                                      |
|------------------|----------------------|-----------|----------|--------------------------------------------------|
| user_game_stats  | id                   | integer   | Yes      | GameStats unique ID, auto generated primary key  |
|                  | user_id              | integer   | Yes      | Foreign key reference to users table            |
|                  | games_played         | integer   | No       | Total number of games completed                  |
|                  | total_xp_earned      | integer   | No       | Total experience points earned                   |
|                  | overall_accuracy     | float     | No       | Overall accuracy percentage across all games    |
|                  | total_correct_answers| integer   | No       | Total correct answers across all games          |
|                  | total_rounds_played  | integer   | No       | Total rounds played (games × 10 rounds)         |
|                  | first_played_at      | datetime  | No       | Timestamp of first game played                   |
|                  | last_played_at       | datetime  | No       | Timestamp of most recent game                    |
|                  | created_at           | datetime  | No       | Record creation timestamp                        |
|                  | updated_at           | datetime  | No       | Record last update timestamp                     |

**Foreign Keys:**
- user_id → users.id

**Constraints:**
- user_id must be unique (one stats record per user)
