# Game Database Design Specification

## Overview

This document outlines the recommended database schema for the TruthGuard game system, which consists of 5 progressive stages designed to teach fake news detection skills. The system should track user progress, performance metrics, scoring, achievements, and detailed gameplay data.

## Game Stages Analysis

### Stage 1: Headline Check
- **Objective**: Identify real vs fake headlines using drag-and-drop REAL/FAKE stamps
- **Time Limit**: 15 seconds per round
- **Rounds**: 10 total
- **Scoring**: 
  - Base: 20 XP per correct answer
  - Speed bonus: ≤5 seconds (+5 XP)
  - Lightning bonus: ≤3 seconds (+5 XP additional)
  - Maximum: 350 XP (perfect game)
- **Data Structure**: Static article pairs with real/fake headlines and reasoning

### Stage 2: Source Showdown
- **Objective**: Choose the more trustworthy source between two options
- **Time Limit**: 30 seconds per round
- **Rounds**: 10 total
- **Scoring**: Up to 500 XP maximum
- **Data Structure**: JSON with reliable/unreliable sources, including URL, headline, date, and content

### Stage 3: Content Preview
- **Objective**: Choose between credible and unreliable content versions
- **Data Structure**: Headlines with multiple choice options, answer indices, hints, and lessons
- **Scoring**: Variable XP based on accuracy and speed

### Stage 4: Advanced Challenge
- **Objective**: Complex multi-source verification with claim validation
- **Data Structure**: Claims with metadata, multiple references, credibility verdicts, and detailed rationales
- **Features**: Cross-referencing multiple sources, evaluating claim credibility

### Stage 5: Expert Level
- **Objective**: Real-world news verification scenarios
- **Data Structure**: Real news articles with verdicts, URLs, headlines, sources, dates, content, hints, and lessons
- **Scoring**: 
  - Base: 60 XP per correct answer
  - Speed bonus: ≤10 seconds (+15 XP)  
  - Lightning bonus: ≤5 seconds (+25 XP additional)
  - Maximum: 100 XP per round

## Simplified Database Schema

### Core Game Table

#### 1. User Game Statistics
```sql
CREATE TABLE user_game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Core Statistics (displayed in game.html)
    games_played INTEGER DEFAULT 0,          -- Total completed games across all stages
    total_xp_earned INTEGER DEFAULT 0,       -- Cumulative XP from all completed games
    overall_accuracy REAL DEFAULT 0.0,      -- Running average accuracy across all games
    
    -- Internal tracking fields
    total_correct_answers INTEGER DEFAULT 0, -- For accuracy calculation
    total_rounds_played INTEGER DEFAULT 0,   -- For accuracy calculation (games_played * 10)
    
    -- Timestamps
    first_played_at TIMESTAMP NULL,
    last_played_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id),
    INDEX idx_user_stats (user_id)
);
```

## Game Completion Logic

### Data Saving Conditions
- **XP and accuracy are ONLY saved when**:
  1. User completes all 10 rounds of any stage (1-5)
  2. User reaches the completion/results page with final stats
  3. User is logged in (has valid user_id)

- **No data is saved if**:
  1. User quits mid-game (doesn't complete 10 rounds)
  2. User closes browser/tab before reaching completion page
  3. User is not logged in (guest mode)

### XP Calculation
- XP accumulates cumulatively across all completed games
- Each stage has different XP potential:
  - **Stage 1**: Up to 350 XP (perfect game)
  - **Stage 2**: Up to 500 XP
  - **Stage 3**: Up to 700 XP 
  - **Stage 4**: Up to 800 XP
  - **Stage 5**: Up to 1000 XP

### Accuracy Calculation  
- Running average accuracy across ALL completed rounds
- Formula: `(total_correct_answers / total_rounds_played) * 100`
- Updates with each completed game

## Database Operations

### Key Queries for Game Functionality

#### Initialize User Stats (First Time)
```sql
INSERT INTO user_game_stats (user_id, first_played_at)
VALUES (?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id) DO NOTHING;
```

#### Update Stats After Game Completion
```sql
UPDATE user_game_stats SET
    games_played = games_played + 1,
    total_xp_earned = total_xp_earned + ?,
    total_correct_answers = total_correct_answers + ?,
    total_rounds_played = total_rounds_played + 10,
    overall_accuracy = CAST(total_correct_answers + ? AS REAL) / (total_rounds_played + 10) * 100,
    last_played_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ?;
```

#### Get User Stats for Display
```sql
SELECT games_played, total_xp_earned, overall_accuracy
FROM user_game_stats 
WHERE user_id = ?;
```

## Implementation Strategy

### Phase 1: Basic Game Statistics (Immediate Implementation)
1. Create `user_game_stats` table in database
2. Modify game completion routes to save statistics
3. Update `game.html` to display real user statistics
4. Add database service methods for game stats

### Frontend Integration (game.html Updates)
- Replace static values (42, 87%, 1,250) with dynamic data from database
- Show "0 games played" for new users
- Update stats immediately after game completion
- Handle cases where user has no game history

### Backend Integration Points
1. **Game Routes** (`routes/game_routes.py`):
   - Add completion endpoints for all 5 stages
   - Implement stats calculation and saving logic
   - Return updated stats to frontend after save

2. **Database Service** (`database.py`):
   - Add `UserGameStats` model
   - Create methods: `get_user_game_stats()`, `update_game_stats()`
   - Handle first-time user initialization

3. **Template Updates** (`templates/game.html`):
   - Replace hardcoded stats with Jinja2 template variables
   - Add conditional display for users with no games played
   - Remove leaderboard rank display (will implement later)

## Example Implementation Code

### Database Model Addition (database.py)
```python
class UserGameStats(db.Model):
    """
    Simplified game statistics tracking for user progress display
    """
    __tablename__ = 'user_game_stats'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Core statistics displayed in game.html
    games_played = db.Column(db.Integer, default=0)
    total_xp_earned = db.Column(db.Integer, default=0)
    overall_accuracy = db.Column(db.Float, default=0.0)
    
    # Internal tracking fields
    total_correct_answers = db.Column(db.Integer, default=0)
    total_rounds_played = db.Column(db.Integer, default=0)
    
    # Timestamps
    first_played_at = db.Column(db.DateTime, nullable=True)
    last_played_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationship
    user = db.relationship("User", back_populates="game_stats")

    def update_after_game(self, xp_earned, correct_answers):
        """Update stats after completing a game"""
        self.games_played += 1
        self.total_xp_earned += xp_earned
        self.total_correct_answers += correct_answers
        self.total_rounds_played += 10
        self.overall_accuracy = (self.total_correct_answers / self.total_rounds_played) * 100 if self.total_rounds_played > 0 else 0.0
        self.last_played_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
```

### Game Route Update Example
```python
@game_bp.route('/api/complete-game', methods=['POST'])
def complete_game():
    """Handle game completion and update user stats"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
            
        # Validate completion data
        xp_earned = data.get('total_xp', 0)
        correct_answers = data.get('correct_answers', 0)
        stage = data.get('stage')
        
        # Get or create user game stats
        stats = UserGameStats.query.filter_by(user_id=user_id).first()
        if not stats:
            stats = UserGameStats(user_id=user_id, first_played_at=datetime.now(timezone.utc))
            db.session.add(stats)
        
        # Update statistics
        stats.update_after_game(xp_earned, correct_answers)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'stats': {
                'games_played': stats.games_played,
                'total_xp_earned': stats.total_xp_earned,
                'overall_accuracy': round(stats.overall_accuracy, 1)
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
```

### Template Update (game.html)
```html
<!-- Replace static stats with dynamic data -->
<div class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
  {{ user_stats.games_played if user_stats else 0 }}
</div>
<div class="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Games Played</div>

<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
  {{ "%.1f"|format(user_stats.overall_accuracy) if user_stats and user_stats.games_played > 0 else 0.0 }}%
</div>
<div class="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Accuracy Rate</div>

<div class="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
  {{ "{:,}".format(user_stats.total_xp_earned) if user_stats else 0 }}
</div>
<div class="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Total XP Earned</div>

<!-- Remove leaderboard rank section for now -->
```

This simplified database design provides exactly what's needed for the game statistics display while maintaining clean, efficient data storage and easy expansion for future features.
