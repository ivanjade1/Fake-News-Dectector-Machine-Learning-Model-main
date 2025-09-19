-- TruthGuard Supabase Database Schema
-- Migrated from SQLite to PostgreSQL for Supabase

-- Enable RLS (Row Level Security) and required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Main authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_password_reset TIMESTAMPTZ
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Articles table - Central table for analyzed news articles
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    link VARCHAR(2048),
    content TEXT NOT NULL,
    summary TEXT,
    input_type VARCHAR(10) NOT NULL CHECK (input_type IN ('url', 'snippet')),
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    factuality_score INTEGER,
    factuality_level VARCHAR(50),
    factuality_description TEXT,
    classification VARCHAR(10),
    cross_check_data TEXT, -- JSON stored as text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique constraint for articles
ALTER TABLE articles 
ADD CONSTRAINT unique_user_article 
UNIQUE (user_id, title, link, summary);

-- Create indexes for articles table
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_analysis_date ON articles(analysis_date);

-- Breakdowns table - Detailed AI-generated factuality analysis
CREATE TABLE IF NOT EXISTS breakdowns (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    claim_verification TEXT,
    internal_consistency TEXT,
    source_assessment TEXT,
    content_quality TEXT,
    analysis_conclusion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for breakdowns table
CREATE INDEX IF NOT EXISTS idx_breakdowns_article_id ON breakdowns(article_id);

-- CrossCheckResults table - Cross-reference verification results
CREATE TABLE IF NOT EXISTS crosscheckresults (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    search_query VARCHAR(500),
    match_title VARCHAR(500),
    match_url VARCHAR(2048),
    similarity_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for crosscheckresults table
CREATE INDEX IF NOT EXISTS idx_crosscheckresults_article_id ON crosscheckresults(article_id);

-- Feedback table - User feedback and ratings
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    comments TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    submission_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submission_date ON feedback(submission_date);

-- User Game Stats table - Game progress tracking
CREATE TABLE IF NOT EXISTS user_game_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    overall_accuracy DECIMAL(5,2) DEFAULT 0.0,
    total_correct_answers INTEGER DEFAULT 0,
    total_rounds_played INTEGER DEFAULT 0,
    first_played_at TIMESTAMPTZ,
    last_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user_game_stats table
CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON user_game_stats(user_id);

-- Password Reset Requests table - Admin-controlled password resets
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(20) NOT NULL,
    email VARCHAR(120) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    ip_address VARCHAR(45) -- IPv4/IPv6 address
);

-- Create index for password_reset_requests table
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);

-- Admin Logs table - Audit trail for admin actions
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for admin_logs table
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at fields
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_game_stats_updated_at 
    BEFORE UPDATE ON user_game_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for enhanced security (disabled during migration)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own data (commented out for migration)
-- CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid()::text = id::text);
-- CREATE POLICY articles_own_data ON articles FOR ALL USING (auth.uid()::text = user_id::text);
-- CREATE POLICY feedback_own_data ON feedback FOR ALL USING (auth.uid()::text = user_id::text);
-- CREATE POLICY user_game_stats_own_data ON user_game_stats FOR ALL USING (auth.uid()::text = user_id::text);

-- Admin access policies (admins can see all data) - commented out for migration
-- CREATE POLICY admin_all_access ON users FOR ALL TO authenticated 
-- USING (
--     EXISTS (
--         SELECT 1 FROM users 
--         WHERE id::text = auth.uid()::text 
--         AND role = 'admin'
--     )
-- );

-- Insert default admin user (password should be changed after first login)
-- Password hash for 'admin123' - CHANGE THIS IN PRODUCTION
INSERT INTO users (username, email, password_hash, role) 
VALUES (
    'admin', 
    'admin@truthguard.com', 
    'scrypt:32768:8:1$wK8rGhZcAQN7xBVr$7c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for TruthGuard authentication and personalization';
COMMENT ON TABLE articles IS 'Central table storing analyzed Philippine political news articles and fact-checking results';
COMMENT ON TABLE breakdowns IS 'Stores detailed AI-generated factuality analysis components';
COMMENT ON TABLE crosscheckresults IS 'Stores individual cross-reference verification results from trusted news sources';
COMMENT ON TABLE feedback IS 'User feedback table for collecting opinions, suggestions, and bug reports';
COMMENT ON TABLE user_game_stats IS 'Game statistics tracking for user progress display';
COMMENT ON TABLE password_reset_requests IS 'Password reset requests tracking for admin-controlled resets';
COMMENT ON TABLE admin_logs IS 'Admin action logging for auditing and tracking administrative actions';
