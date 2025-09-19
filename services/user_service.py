"""
User Service - Centralized user management for consistent username-to-email mapping
Ensures all email communications use the correct and verified user details.
"""

from database import DatabaseService
from typing import Optional, Dict, Any

class UserService:
    """Centralized service for consistent user identification and email mapping"""
    
    def __init__(self):
        self.db = DatabaseService()
    
    def get_user_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get user by username or email with consistent error handling
        
        Args:
            identifier: Username or email address
            
        Returns:
            User dictionary with all details or None if not found
        """
        try:
            return self.db.get_user_by_username_or_email(identifier)
        except Exception as e:
            print(f"❌ Error retrieving user by identifier '{identifier}': {e}")
            return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user specifically by username
        
        Args:
            username: The username to look up
            
        Returns:
            User dictionary or None if not found
        """
        try:
            return self.db.get_user_by_username(username)
        except Exception as e:
            print(f"❌ Error retrieving user by username '{username}': {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user specifically by email
        
        Args:
            email: The email address to look up
            
        Returns:
            User dictionary or None if not found
        """
        try:
            return self.db.get_user_by_email(email)
        except Exception as e:
            print(f"❌ Error retrieving user by email '{email}': {e}")
            return None
    
    def get_email_for_user(self, identifier: str) -> Optional[str]:
        """
        Get verified email address for a user by any identifier
        
        Args:
            identifier: Username or email address
            
        Returns:
            Verified email address or None if user not found
        """
        user = self.get_user_by_identifier(identifier)
        return user['email'] if user else None
    
    def get_username_for_email(self, email: str) -> Optional[str]:
        """
        Get username for a given email address
        
        Args:
            email: Email address to look up
            
        Returns:
            Username or None if not found
        """
        user = self.get_user_by_email(email)
        return user['username'] if user else None
    
    def validate_user_email_pair(self, username: str, email: str) -> bool:
        """
        Validate that a username and email belong to the same user
        
        Args:
            username: Username to validate
            email: Email to validate
            
        Returns:
            True if they belong to the same user, False otherwise
        """
        user = self.get_user_by_username(username)
        if not user:
            return False
        
        return user['email'].lower() == email.lower()
    
    def get_user_display_info(self, identifier: str) -> Dict[str, str]:
        """
        Get user display information for emails and notifications
        
        Args:
            identifier: Username or email address
            
        Returns:
            Dictionary with 'username', 'email', and 'display_name' or empty dict if not found
        """
        user = self.get_user_by_identifier(identifier)
        if not user:
            return {}
        
        return {
            'username': user['username'],
            'email': user['email'],
            'display_name': user['username'],  # Can be enhanced with first_name if added later
            'user_id': user['id']
        }
    
    def ensure_valid_email_recipient(self, recipient_identifier: str) -> Optional[Dict[str, str]]:
        """
        Ensure we have valid user details before sending email
        
        Args:
            recipient_identifier: Username or email of intended recipient
            
        Returns:
            Dictionary with verified user details or None if invalid
        """
        user_info = self.get_user_display_info(recipient_identifier)
        
        if not user_info:
            print(f"⚠️ Cannot send email: User '{recipient_identifier}' not found")
            return None
        
        # Additional validation - ensure email is properly formatted
        email = user_info['email']
        if not email or '@' not in email:
            print(f"⚠️ Cannot send email: Invalid email address for user '{user_info['username']}'")
            return None
        
        print(f"✅ Email recipient validated: {user_info['username']} <{user_info['email']}>")
        return user_info
    
    def get_all_admin_emails(self) -> list:
        """
        Get email addresses of all admin users for system notifications
        
        Returns:
            List of admin email addresses
        """
        try:
            # This would need to be implemented in DatabaseService if needed
            # For now, return empty list as this feature isn't currently used
            return []
        except Exception as e:
            print(f"❌ Error retrieving admin emails: {e}")
            return []

# Singleton instance for use across the application
user_service = UserService()