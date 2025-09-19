# Admin System Setup Instructions

## Overview
The TruthGuard application now includes a comprehensive admin system with role-based access control. This document provides instructions for setting up and using the admin functionality.

## Database Setup

### 1. Update Database Schema
First, add the role field to your existing users table:

```bash
python update_database.py
```

This script will:
- Add a `role` column to the users table (default: 'user')
- Update the database schema without losing existing data

### 2. Create Initial Admin User
After updating the database schema, create your first admin user:

```bash
python create_admin.py
```

Follow the prompts to enter:
- Username
- Email address
- Password (minimum 6 characters)

You can also list existing admin users:
```bash
python create_admin.py list
```

## Admin System Features

### Admin Dashboard (`/admin/dashboard`)
- **System Statistics**: Total users, articles analyzed, game sessions, feedback
- **User Management**: View, search, and manage user accounts
- **Activity Charts**: Visual representation of daily activity
- **System Information**: Server status and version details

### Admin Feedback Management (`/admin/feedback`)
- **View All Feedback**: See all user feedback submissions
- **Search & Filter**: Filter by status, type, priority
- **Detailed View**: Expand feedback for full details
- **Status Management**: Mark feedback as resolved/pending
- **User Information**: See which users submitted feedback

## Access Control

### Role-Based Authentication
- Users have either 'user' or 'admin' roles
- Only users with 'admin' role can access admin pages
- Automatic redirection for admins to dashboard
- Session-based authentication with role checking

### Protected Routes
All admin routes are protected by the `@admin_required` decorator:
- `/admin/dashboard` - Admin dashboard
- `/admin/feedback` - Feedback management
- `/admin/api/*` - All admin API endpoints

## File Structure

### Templates
```
templates/admin/
├── admin_dashboard.html    # Admin dashboard interface
└── admin_feedback.html     # Feedback management interface
```

### Static Assets
```
static/
├── css/admin/
│   ├── admin_dashboard.css # Dashboard styling
│   └── admin_feedback.css  # Feedback page styling
└── js/admin/
    ├── admin_dashboard.js  # Dashboard functionality
    └── admin_feedback.js   # Feedback management
```

### Backend Routes
```
routes/
└── admin_routes.py         # All admin routes and API endpoints
```

## API Endpoints

### Dashboard APIs
- `GET /admin/api/dashboard-stats` - Get system statistics
- `GET /admin/api/users` - Get paginated users list
- `POST /admin/api/users/{id}/toggle-role` - Toggle user role
- `POST /admin/api/users/{id}/toggle-status` - Toggle user status

### Feedback APIs
- `GET /admin/api/feedback` - Get paginated feedback list
- `GET /admin/api/feedback/{id}` - Get specific feedback details
- `POST /admin/api/feedback/{id}/status` - Update feedback status
- `DELETE /admin/api/feedback/{id}` - Delete feedback

## Design System

The admin interface follows the existing design system:
- **Base Styles**: Inherits from `history.css` for consistency
- **Color Themes**: Purple for dashboard, orange for feedback
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Supports system dark mode preferences
- **Icons**: Bootstrap Icons for consistent iconography

## Usage Instructions

### 1. Login as Admin
1. Navigate to `/login`
2. Use your admin credentials
3. You'll be automatically redirected to `/admin/dashboard`

### 2. Managing Users
1. Go to Admin Dashboard
2. Use the Users section to:
   - Search for specific users
   - Toggle user roles (admin ↔ user)
   - Activate/deactivate user accounts
   - View user statistics

### 3. Managing Feedback
1. Navigate to `/admin/feedback`
2. Use filters to find specific feedback:
   - Search by content or username
   - Filter by status (pending/resolved)
   - Filter by type (bug/feature/general)
   - Sort by date or priority
3. Click on feedback cards for detailed view
4. Update status or delete feedback as needed

## Security Considerations

### Role Verification
- Role checking happens on every admin route access
- Session-based authentication prevents unauthorized access
- Database role field ensures persistent role assignment

### Input Validation
- All admin API endpoints validate input parameters
- SQL injection protection through SQLAlchemy ORM
- XSS protection through proper HTML escaping

### Error Handling
- Graceful error messages for failed operations
- Logging of admin actions for audit trail
- Proper HTTP status codes for API responses

## Troubleshooting

### Common Issues

1. **"Access Denied" when accessing admin pages**
   - Verify user role is set to 'admin' in database
   - Check if you're logged in with correct credentials
   - Clear browser cache and cookies

2. **Database errors after role update**
   - Ensure `update_database.py` was run successfully
   - Check database connection and permissions
   - Verify SQLite database file exists and is writable

3. **Admin dashboard not loading data**
   - Check browser console for JavaScript errors
   - Verify all static files are accessible
   - Check Flask logs for API endpoint errors

4. **CSS/JavaScript not loading**
   - Verify file paths in templates are correct
   - Check if static files were created properly
   - Clear browser cache

### Development Notes

- Admin routes are registered as a Flask Blueprint
- Database migrations are handled separately from main app
- All admin APIs return JSON responses
- Frontend uses modern JavaScript (ES6+) features
- CSS uses custom properties for theming

## Future Enhancements

Potential improvements for the admin system:
- Real-time notifications for new feedback
- Advanced analytics and reporting
- Bulk user operations
- Email notifications to users
- Audit log of admin actions
- Advanced permission granularity
- Export functionality for data

## Support

For issues or questions regarding the admin system:
1. Check this documentation first
2. Review Flask and SQLAlchemy documentation
3. Check browser console for frontend errors
4. Review Flask application logs for backend errors
