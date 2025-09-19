# TruthGuard - Vercel Deployment Guide

This Flask application is configured for deployment on Vercel.

## Required Environment Variables

Before deploying to Vercel, you need to set up the following environment variables in your Vercel project settings:

### Database (Supabase)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Email Service (Optional)
```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

### Password Reset (Optional)
```
PASSWORD_RESET_SECRET_KEY=your_secret_key_for_password_reset_tokens
PASSWORD_RESET_TOKEN_EXPIRY_HOURS=1
```

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy the application**:
   ```bash
   vercel
   ```

4. **Set environment variables** (after first deployment):
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_KEY
   # Add other environment variables as needed
   ```

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

## File Structure

- `api/index.py` - Vercel entry point that imports the Flask app
- `web_app.py` - Main Flask application
- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files to exclude from deployment

## Notes

- The application uses a pre-trained ML model (`fake_news_model.pkl`) that will be included in the deployment
- Static files are served from the `/static` directory
- Templates are served from the `/templates` directory
- The application automatically initializes the ML model on startup

## Troubleshooting

- **Cold starts**: First request may be slow due to ML model loading
- **Memory limits**: Adjusted to 1GB for ML model operations
- **Timeout**: Set to 60 seconds for model initialization

For issues, check the Vercel function logs in your Vercel dashboard.