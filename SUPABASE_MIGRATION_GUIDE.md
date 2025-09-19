# TruthGuard Database Migration to Supabase

This guide will help you migrate your TruthGuard application from SQLite to Supabase PostgreSQL database.

## Overview

The migration process involves:
1. Setting up a Supabase project
2. Configuring your environment variables
3. Creating the database schema in Supabase
4. Running the migration script to transfer data
5. Updating your application configuration

## Prerequisites

- Existing TruthGuard application with SQLite database
- Supabase account (free tier available)
- Python environment with required packages

## Step 1: Create Supabase Project

1. Sign up at [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: TruthGuard (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project setup to complete (1-2 minutes)

## Step 2: Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...`
   - **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...`

3. Go to **Settings** → **Database**
4. Find your **Database password** (the one you set during project creation)

## Step 3: Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.template .env
   ```

2. Edit `.env` file with your Supabase credentials:
   ```env
   # Database Configuration
   USE_SUPABASE=true
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   SUPABASE_DB_PASSWORD=your-database-password-here
   
   # Other settings (keep existing values)
   GEMINI_API_KEY=your-existing-gemini-key
   MAIL_USERNAME=your-existing-mail-config
   # ... etc
   ```

## Step 4: Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy the entire contents of `supabase_schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the schema creation
7. Verify tables were created in **Table Editor**

Expected tables:
- `users`
- `articles`
- `breakdowns`
- `crosscheckresults`
- `feedback`
- `user_game_stats`
- `password_reset_requests`
- `admin_logs`

## Step 5: Test Connection

Before running the migration, test your Supabase connection:

```bash
python test_supabase.py
```

This will:
- ✅ Verify your credentials
- ✅ Check database schema
- ✅ Test basic operations
- ✅ Ensure everything is ready for migration

## Step 6: Run Migration

1. Ensure your SQLite database exists and has data:
   ```bash
   ls -la instance/truthguard.db
   ```

2. Run the migration script:
   ```bash
   python migrate_to_supabase.py
   ```

3. The script will:
   - Connect to both databases
   - Transfer all data in the correct order
   - Handle data type conversions
   - Provide detailed logging
   - Generate a migration summary

## Step 7: Verify Migration

1. Check the migration logs for any errors
2. Verify data in Supabase **Table Editor**:
   - Check user accounts
   - Verify articles and their analysis results
   - Confirm relationships are intact

3. Test your application:
   ```bash
   python web_app.py
   ```

4. Login and verify:
   - User authentication works
   - Article history is preserved
   - New analysis can be performed
   - Game statistics are intact

## Step 8: Update Production

Once migration is successful:

1. Update your production environment variables
2. Deploy the updated code with Supabase support
3. Monitor application logs for any issues

## Troubleshooting

### Common Issues

**Connection Error**: `Failed to connect to Supabase`
- Verify your `SUPABASE_URL` and keys are correct
- Check your internet connection
- Ensure Supabase project is active

**Schema Error**: `Schema not found`
- Run the `supabase_schema.sql` in SQL Editor
- Check for SQL syntax errors
- Verify all tables were created

**Migration Error**: `Error transferring data`
- Check the migration log file: `migration.log`
- Verify SQLite database file exists
- Ensure Supabase has sufficient storage

**Authentication Error**: `Row Level Security policy violation`
- RLS policies are created automatically
- Admin users can access all data
- Regular users can only access their own data

### Rollback Process

If you need to rollback to SQLite:

1. Set `USE_SUPABASE=false` in `.env`
2. Restart your application
3. Your SQLite data remains untouched

### Data Validation

To validate your migration was successful:

```bash
# Check record counts in both databases
python -c "
from migrate_to_supabase import SupabaseMigrator
import os
migrator = SupabaseMigrator(
    'instance/truthguard.db',
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_ANON_KEY')
)
summary = migrator.get_migration_summary()
for key, value in summary.items():
    print(f'{key}: {value}')
"
```

## Performance Considerations

### Supabase Advantages
- ✅ Better performance for concurrent users
- ✅ Automatic backups
- ✅ Real-time capabilities
- ✅ Built-in authentication
- ✅ REST API generation
- ✅ Horizontal scaling

### Resource Limits (Free Tier)
- Database size: 500 MB
- Bandwidth: 5 GB
- Requests: 50,000/month

For production, consider upgrading to Pro plan.

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to version control
2. **Database Password**: Use a strong, unique password
3. **Service Role Key**: Keep this secret, only use server-side
4. **Anon Key**: Safe for client-side, has limited permissions
5. **Row Level Security**: Enabled by default, users can only access their data

## Support

If you encounter issues:

1. Check the migration log: `migration.log`
2. Review Supabase logs in your dashboard
3. Test connection with `test_supabase.py`
4. Verify environment variables are correct

## Next Steps

After successful migration:

1. Set up regular backups (automatic in Supabase)
2. Monitor performance in Supabase dashboard
3. Consider upgrading for production use
4. Explore additional Supabase features (Auth, Storage, Edge Functions)

---

**Migration Complete!** 🎉

Your TruthGuard application is now running on Supabase with improved scalability and performance.