#!/usr/bin/env python3
"""
TruthGuard SQLite to Supabase Migration Script

This script migrates data from the existing SQLite database to Supabase PostgreSQL.
It handles schema creation and data transfer while preserving relationships.
"""

import os
import sys
import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configure logging with Windows-compatible format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class SupabaseMigrator:
    """Handles migration from SQLite to Supabase"""
    
    def __init__(self, sqlite_db_path: str, supabase_url: str, supabase_key: str):
        """
        Initialize the migrator
        
        Args:
            sqlite_db_path: Path to the SQLite database file
            supabase_url: Supabase project URL
            supabase_key: Supabase anon/service key
        """
        self.sqlite_db_path = sqlite_db_path
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.sqlite_conn = None
        
        # Table migration order (respecting foreign key dependencies)
        self.migration_order = [
            'users',
            'articles', 
            'breakdowns',
            'crosscheckresults',
            'feedback',
            'user_game_stats',
            'password_reset_requests',
            'admin_logs'
        ]
        
    def connect_sqlite(self) -> bool:
        """Connect to SQLite database"""
        try:
            self.sqlite_conn = sqlite3.connect(self.sqlite_db_path)
            self.sqlite_conn.row_factory = sqlite3.Row  # Enable column access by name
            logger.info(f"Connected to SQLite database: {self.sqlite_db_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to SQLite database: {e}")
            return False
    
    def test_supabase_connection(self) -> bool:
        """Test connection to Supabase"""
        try:
            # Try a simple query to test connection
            result = self.supabase.table('users').select("id").limit(1).execute()
            logger.info("Successfully connected to Supabase")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            return False
    
    def create_schema(self) -> bool:
        """Create Supabase schema by running the SQL file"""
        try:
            # Read the schema file
            schema_path = os.path.join(os.path.dirname(__file__), 'supabase_schema.sql')
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            
            logger.info("Creating Supabase schema...")
            
            # Note: The schema should be applied directly in Supabase SQL editor
            # as the Python client doesn't support raw SQL execution
            logger.warning("IMPORTANT: Please run 'supabase_schema.sql' in your Supabase SQL editor first!")
            logger.info("Schema file location: supabase_schema.sql")
            
            # Test if tables exist by trying to query users table
            try:
                self.supabase.table('users').select("id").limit(1).execute()
                logger.info("Schema appears to be already created")
                return True
            except Exception:
                logger.error("Schema not found. Please run supabase_schema.sql in Supabase SQL editor first.")
                return False
                
        except Exception as e:
            logger.error(f"Error checking schema: {e}")
            return False
    
    def get_sqlite_table_data(self, table_name: str) -> List[Dict[str, Any]]:
        """Get all data from SQLite table"""
        try:
            if self.sqlite_conn is None:
                logger.error("SQLite connection is not established")
                return []
                
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            
            # Get column names
            columns = [description[0] for description in cursor.description]
            
            # Fetch all rows and convert to list of dictionaries
            rows = cursor.fetchall()
            data = []
            
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    column_name = columns[i]
                    # Handle datetime conversion
                    if isinstance(value, str) and self._is_datetime_column(column_name):
                        try:
                            # Try to parse datetime string
                            parsed_dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            row_dict[column_name] = parsed_dt.isoformat()
                        except:
                            row_dict[column_name] = value
                    else:
                        row_dict[column_name] = value
                data.append(row_dict)
            
            logger.info(f"Retrieved {len(data)} records from {table_name}")
            return data
            
        except Exception as e:
            logger.error(f"Error retrieving data from {table_name}: {e}")
            return []
    
    def _is_datetime_column(self, column_name: str) -> bool:
        """Check if column name suggests it contains datetime data"""
        datetime_indicators = [
            'created_at', 'updated_at', 'analysis_date', 'submission_date',
            'last_login', 'last_password_reset', 'requested_at', 'processed_at',
            'first_played_at', 'last_played_at', 'timestamp'
        ]
        return column_name.lower() in datetime_indicators
    
    def insert_data_to_supabase(self, table_name: str, data: List[Dict[str, Any]]) -> bool:
        """Insert data into Supabase table with duplicate handling"""
        if not data:
            logger.info(f"No data to migrate for table: {table_name}")
            return True
        
        try:
            # Insert in batches to avoid timeouts
            batch_size = 100
            total_batches = (len(data) + batch_size - 1) // batch_size
            successful_inserts = 0
            
            for i in range(0, len(data), batch_size):
                batch = data[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                
                logger.info(f"Inserting batch {batch_num}/{total_batches} for {table_name} ({len(batch)} records)")
                
                # Clean data for PostgreSQL compatibility
                cleaned_batch = self._clean_data_for_postgres(batch, table_name)
                
                try:
                    # Try to insert the batch
                    result = self.supabase.table(table_name).insert(cleaned_batch).execute()
                    
                    if result.data:
                        successful_inserts += len(result.data)
                        logger.info(f"Successfully inserted {len(result.data)} records from batch {batch_num}")
                    
                except Exception as batch_error:
                    # If batch insert fails, try individual inserts to handle duplicates
                    logger.warning(f"Batch insert failed for {table_name} batch {batch_num}, trying individual inserts...")
                    
                    for record in cleaned_batch:
                        try:
                            # Try upsert (insert or update)
                            if 'id' in record:
                                # Use upsert for records with ID
                                result = self.supabase.table(table_name).upsert(record).execute()
                                if result.data:
                                    successful_inserts += 1
                            else:
                                # Regular insert for records without ID
                                result = self.supabase.table(table_name).insert(record).execute()
                                if result.data:
                                    successful_inserts += 1
                        except Exception as individual_error:
                            logger.warning(f"Skipping duplicate record in {table_name}: {individual_error}")
                            continue
            
            logger.info(f"Successfully migrated {successful_inserts} records to {table_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting data to {table_name}: {e}")
            return False
    
    def _clean_data_for_postgres(self, data: List[Dict[str, Any]], table_name: str) -> List[Dict[str, Any]]:
        """Clean data for PostgreSQL compatibility"""
        cleaned_data = []
        
        for row in data:
            cleaned_row = {}
            for key, value in row.items():
                # Handle None values
                if value is None:
                    cleaned_row[key] = None
                # Handle empty strings that should be None for foreign keys
                elif isinstance(value, str) and value == '' and key.endswith('_id'):
                    cleaned_row[key] = None
                # Handle boolean conversion
                elif key in ['is_active'] and isinstance(value, int):
                    cleaned_row[key] = bool(value)
                # Handle JSON fields
                elif key in ['cross_check_data'] and isinstance(value, str) and value:
                    try:
                        # Validate JSON
                        json.loads(value)
                        cleaned_row[key] = value
                    except:
                        cleaned_row[key] = None
                else:
                    cleaned_row[key] = value
            
            cleaned_data.append(cleaned_row)
        
        return cleaned_data
    
    def check_table_exists_sqlite(self, table_name: str) -> bool:
        """Check if table exists in SQLite database"""
        try:
            if self.sqlite_conn is None:
                logger.error("SQLite connection is not established")
                return False
                
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            """, (table_name,))
            return cursor.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking if table {table_name} exists: {e}")
            return False
    
    def get_migration_summary(self) -> Dict[str, int]:
        """Get summary of records in each table for comparison"""
        summary = {}
        
        # SQLite counts
        if self.sqlite_conn:
            for table in self.migration_order:
                if self.check_table_exists_sqlite(table):
                    try:
                        cursor = self.sqlite_conn.cursor()
                        cursor.execute(f"SELECT COUNT(*) FROM {table}")
                        count = cursor.fetchone()[0]
                        summary[f"sqlite_{table}"] = count
                    except Exception as e:
                        logger.error(f"Error counting SQLite records in {table}: {e}")
                        summary[f"sqlite_{table}"] = 0
        
        # Supabase counts
        for table in self.migration_order:
            try:
                result = self.supabase.table(table).select("id").execute()
                summary[f"supabase_{table}"] = len(result.data) if result.data else 0
            except Exception as e:
                logger.error(f"Error counting Supabase records in {table}: {e}")
                summary[f"supabase_{table}"] = 0
        
        return summary
    
    def run_migration(self) -> bool:
        """Run the complete migration process"""
        logger.info("="*60)
        logger.info("Starting TruthGuard SQLite to Supabase Migration")
        logger.info("="*60)
        
        # Step 1: Connect to databases
        if not self.connect_sqlite():
            return False
            
        if not self.test_supabase_connection():
            return False
        
        # Step 2: Create schema (requires manual step)
        if not self.create_schema():
            return False
        
        # Step 3: Migrate data for each table
        migration_success = True
        
        for table_name in self.migration_order:
            logger.info(f"\n--- Migrating table: {table_name} ---")
            
            # Check if table exists in SQLite
            if not self.check_table_exists_sqlite(table_name):
                logger.warning(f"Table {table_name} does not exist in SQLite, skipping...")
                continue
            
            # Get data from SQLite
            data = self.get_sqlite_table_data(table_name)
            
            # Insert into Supabase
            if not self.insert_data_to_supabase(table_name, data):
                migration_success = False
                logger.error(f"Migration failed for table: {table_name}")
                break
        
        # Step 4: Generate migration summary
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        
        summary = self.get_migration_summary()
        for key, value in summary.items():
            logger.info(f"{key}: {value} records")
        
        if migration_success:
            logger.info("\nMigration completed successfully!")
        else:
            logger.error("\nMigration failed!")
        
        # Close SQLite connection
        if self.sqlite_conn:
            self.sqlite_conn.close()
        
        return migration_success


def main():
    """Main migration function"""
    # Configuration
    sqlite_db_path = os.path.join(os.path.dirname(__file__), 'instance', 'truthguard.db')
    
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for migration to bypass RLS
    
    if not supabase_url or not supabase_key:
        logger.error("Missing Supabase credentials!")
        logger.error("Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables")
        logger.error("You can create a .env file with:")
        logger.error("SUPABASE_URL=https://your-project.supabase.co")
        logger.error("SUPABASE_SERVICE_KEY=your-service-key")
        return False
    
    # Check if SQLite database exists
    if not os.path.exists(sqlite_db_path):
        logger.error(f"SQLite database not found: {sqlite_db_path}")
        logger.error("Please make sure the TruthGuard application has been run at least once to create the database")
        return False
    
    # Run migration
    migrator = SupabaseMigrator(sqlite_db_path, supabase_url, supabase_key)
    success = migrator.run_migration()
    
    if success:
        logger.info("\nMigration completed! Next steps:")
        logger.info("1. Update your application configuration to use Supabase")
        logger.info("2. Test the application functionality")
        logger.info("3. Update environment variables for production")
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
