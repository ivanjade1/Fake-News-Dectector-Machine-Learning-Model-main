"""
WSGI entry point for Vercel deployment
"""
import sys
import os

# Add the parent directory to the Python path so we can import web_app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web_app import app

# Vercel expects the Flask app to be named 'app'
if __name__ == "__main__":
    app.run()