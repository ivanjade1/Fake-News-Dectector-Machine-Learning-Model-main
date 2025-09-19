"""
TruthGuard Database Configuration for Supabase Migration

This file provides configuration support for both SQLite (development) and Supabase (production).
Add this configuration to enable Supabase support in your TruthGuard application.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConfig:
    """Database configuration class that supports both SQLite and Supabase"""
    
    def __init__(self):
        self.use_supabase = os.getenv('USE_SUPABASE', 'false').lower() == 'true'
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
    def get_database_uri(self):
        """Get the appropriate database URI based on configuration"""
        if self.use_supabase and self.supabase_url:
            # For Supabase with Flask-SQLAlchemy, we'll use the REST API through supabase-py
            # instead of direct PostgreSQL connection
            # This avoids needing the database password
            
            # Return a special marker that indicates we're using Supabase
            # The actual database operations will go through the Supabase client
            return "supabase://connection"
        else:
            # Default to SQLite for development
            basedir = os.path.abspath(os.path.dirname(__file__))
            instance_dir = os.path.join(basedir, 'instance')
            os.makedirs(instance_dir, exist_ok=True)
            return f'sqlite:///{os.path.join(instance_dir, "truthguard.db")}'
    
    def is_using_supabase(self):
        """Check if Supabase is being used"""
        return self.use_supabase and self.supabase_url and self.supabase_key
    
    def get_flask_config(self, app):
        """Configure Flask app with appropriate database settings"""
        database_uri = self.get_database_uri()
        
        if self.is_using_supabase():
            print(f"🚀 Using Supabase database via REST API")
            # For Supabase, we'll use SQLite as a fallback for Flask-SQLAlchemy
            # but actual operations will go through Supabase client
            basedir = os.path.abspath(os.path.dirname(__file__))
            instance_dir = os.path.join(basedir, 'instance')
            os.makedirs(instance_dir, exist_ok=True)
            
            # Use SQLite for Flask-SQLAlchemy initialization, but operations will use Supabase
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_dir, "truthguard_temp.db")}'
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            # Store Supabase configuration for the application
            app.config['USE_SUPABASE'] = True
            app.config['SUPABASE_URL'] = self.supabase_url
            app.config['SUPABASE_KEY'] = self.supabase_key
        else:
            print(f"💾 Using SQLite database")
            app.config['SQLALCHEMY_DATABASE_URI'] = database_uri
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            app.config['USE_SUPABASE'] = False
        
        return database_uri


def init_database_with_supabase_support(app):
    """
    Initialize the database with Supabase support.
    This is a drop-in replacement for the original init_database function.
    """
    from database import db, _needs_articles_migration, _migrate_articles_table
    
    # Configure database
    db_config = DatabaseConfig()
    database_uri = db_config.get_flask_config(app)
    
    db.init_app(app)
    
    with app.app_context():
        if db_config.is_using_supabase():
            # For Supabase, just create a minimal temp database for Flask-SQLAlchemy
            # The actual operations will use Supabase client
            db.create_all()
            print(f"✅ Supabase configuration initialized")
            
            # Initialize Supabase client for database operations
            try:
                from supabase import create_client
                if db_config.supabase_url and db_config.supabase_key:
                    supabase_client = create_client(db_config.supabase_url, db_config.supabase_key)
                    app.supabase = supabase_client
                    print(f"✅ Supabase client initialized")
                else:
                    raise ValueError("Missing Supabase URL or key")
            except Exception as e:
                print(f"❌ Failed to initialize Supabase client: {e}")
                # Fallback to SQLite
                app.config['USE_SUPABASE'] = False
                print("🔄 Falling back to SQLite")
        else:
            # Create any missing tables (does not alter existing)
            db.create_all()
            
            # Only run SQLite-specific migrations if we're using SQLite
            with db.engine.begin() as conn:
                if _needs_articles_migration(conn):
                    print("⚙️  Migrating 'articles' table to fix input_type CHECK constraint...")
                    _migrate_articles_table(conn)
                    print("✅ Migration complete.")
            
            print(f"✅ SQLite database initialized: {database_uri}")
    
    return db


# Environment variable template for Supabase configuration
ENVIRONMENT_TEMPLATE = """
# TruthGuard Supabase Configuration
# Copy these variables to your .env file and fill in your Supabase details

# Set to 'true' to use Supabase, 'false' to use SQLite
USE_SUPABASE=false

# Your Supabase project URL (e.g., https://your-project.supabase.co)
SUPABASE_URL=

# Your Supabase anon key (for client-side operations)
SUPABASE_ANON_KEY=

# Your Supabase service role key (for server-side operations with full access)
SUPABASE_SERVICE_KEY=

# Your Supabase database password (found in Database settings)
SUPABASE_DB_PASSWORD=

# Example:
# USE_SUPABASE=true
# SUPABASE_URL=https://abcdefghijklmnop.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SUPABASE_DB_PASSWORD=your_database_password_here
"""

def create_env_template():
    """Create a .env template file for Supabase configuration"""
    env_template_path = os.path.join(os.path.dirname(__file__), '.env.supabase.template')
    
    with open(env_template_path, 'w', encoding='utf-8') as f:
        f.write(ENVIRONMENT_TEMPLATE)
    
    print(f"📝 Created Supabase environment template: {env_template_path}")
    print("💡 Copy this file to .env and configure your Supabase credentials")

if __name__ == "__main__":
    # Create environment template when run directly
    create_env_template()
    
    # Test configuration
    config = DatabaseConfig()
    print(f"\nCurrent configuration:")
    print(f"Use Supabase: {config.use_supabase}")
    print(f"Supabase URL: {config.supabase_url}")
    print(f"Database URI: {config.get_database_uri()}")