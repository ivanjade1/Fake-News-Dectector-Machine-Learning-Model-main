from flask import Flask, jsonify, session
import pandas as pd
import numpy as np
import nltk
import warnings
import os
import time
import logging
import joblib
import json
from datetime import datetime
import threading

# Import database with Supabase support
from database import DatabaseService, init_database_with_supabase_support, User

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

# Import services
from services.model_service import FakeNewsDetector
from services.article_extractor import ArticleExtractor
from services.feedback_service import FeedbackService
from services.gemini_service import GeminiService
from crosscheck import cross_checker

warnings.filterwarnings('ignore')

app = Flask(__name__)

# Configure Flask sessions
import secrets
app.secret_key = secrets.token_hex(16)  # Generate a secure secret key
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

# Session cookie configuration for better incognito compatibility
app.config['SESSION_COOKIE_SECURE'] = False  # Allow non-HTTPS for development
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent XSS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Allow cross-tab in same site

# Configure Flask-Mail (optional - will work without Flask-Mail installed)
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@truthguard.com')

# Initialize email service
try:
    from services.email_service import init_mail
    init_mail(app)
    print("✅ Email service initialized")
except ImportError:
    print("⚠️ Flask-Mail not available - email functionality will be disabled")

# Initialize database with Supabase support
db = init_database_with_supabase_support(app)

# Global initialization flag to prevent duplicate initialization
_initialized = False

# Initialize services globally so routes can access them
detector = FakeNewsDetector()
article_extractor = ArticleExtractor()
gemini_service = GeminiService()
feedback_service = None  # Will be initialized after detector

# Make services available globally for routes
app.detector = detector
app.article_extractor = article_extractor
app.gemini_service = gemini_service
app.db_service = DatabaseService

def initialize_feedback_service_if_needed():
    """Initialize feedback service if not already initialized"""
    global feedback_service
    if not feedback_service and detector.is_trained:
        print("🔧 Initializing feedback service...")
        feedback_service = FeedbackService(detector)
        app.feedback_service = feedback_service
        print("✅ Feedback service initialized")

def initialize_model():
    """Initialize and train the model - only runs once"""
    global feedback_service, _initialized
    
    # Prevent duplicate initialization
    if _initialized:
        print("ℹ️ Model already initialized, skipping...")
        return
    
    try:
        print("="*60)
        print("🚀 STARTING MODEL INITIALIZATION")
        print("="*60)
        
        # Mark as initialized immediately to prevent race conditions
        _initialized = True
        
        # Explicitly set is_trained to False during initialization
        detector.is_trained = False
        
        # Check if model file exists
        model_file_exists = os.path.exists('fake_news_model.pkl')
        print(f"📁 Model file exists: {model_file_exists}")
        
        if model_file_exists:
            print("🔄 Attempting to load existing model...")
            load_success = detector.load_model()
            print(f"✅ Model load success: {load_success}")
            print(f"📊 Model trained status after load: {detector.is_trained}")
            print(f"🧠 Model object exists: {detector.model is not None}")
            print(f"🎯 Model accuracy: {detector.accuracy}")
            
            if load_success and detector.is_trained and detector.model is not None:
                print("✅ Successfully loaded existing pre-trained model.")
                # Initialize feedback service after model is ready
                initialize_feedback_service_if_needed()
                return
            else:
                print("❌ Failed to load existing model properly, will retrain...")
                # Reset state if loading failed
                detector.is_trained = False
                detector.model = None
                detector.accuracy = None
        
        print("🔄 No existing model found or load failed. Training new model...")
        print("⏳ This may take a few minutes...")
        
        # Check if dataset exists
        dataset_exists = os.path.exists('WELFake_Dataset.csv')
        print(f"📊 Dataset file exists: {dataset_exists}")
        
        if not dataset_exists:
            print("❌ ERROR: WELFake_Dataset.csv not found!")
            print("Please ensure 'WELFake_Dataset.csv' is in the project directory.")
            # Keep is_trained as False if no dataset
            detector.is_trained = False
            return
        
        # Load and prepare data
        print("📖 Loading and preparing dataset...")
        df = detector.load_and_prepare_data('WELFake_Dataset.csv')
        print(f"📊 Dataset loaded: {len(df)} samples")
        
        # Train model
        print("🏋️ Training model...")
        accuracy = detector.train_best_model(df)
        print(f"🎯 Model training completed with accuracy: {accuracy:.4f}")
        print(f"📊 Model trained status after training: {detector.is_trained}")
        print(f"🧠 Model object exists after training: {detector.model is not None}")
        
        # Verify model is actually working before declaring it ready
        if detector.model is not None and detector.is_trained:
            try:
                # Test prediction with sample text
                test_result = detector.predict("This is a test article about current events.")
                if test_result and 'prediction' in test_result:
                    print("✅ Model test prediction successful")
                else:
                    print("❌ Model test prediction failed")
                    detector.is_trained = False
                    return
            except Exception as test_error:
                print(f"❌ Model test prediction error: {test_error}")
                detector.is_trained = False
                return
        
        # Save model only if everything is working
        if detector.is_trained and detector.model is not None:
            print("💾 Saving model...")
            detector.save_model(training_samples=len(df), feedback_samples=0)
            print("💾 Model saved as 'fake_news_model.pkl'")
        
        # Initialize feedback service after model is ready
        initialize_feedback_service_if_needed()
        
        # Verify final state
        print(f"✅ Final model is_trained status: {detector.is_trained}")
        print(f"✅ Final model object exists: {detector.model is not None}")
        print(f"✅ Final model accuracy: {detector.accuracy}")
        
        if detector.is_trained and detector.model is not None:
            print("="*60)
            print("🎉 MODEL INITIALIZATION COMPLETED SUCCESSFULLY")
            print("="*60)
        else:
            print("="*60)
            print("❌ MODEL INITIALIZATION FAILED")
            print("="*60)
        
    except Exception as e:
        print("="*60)
        print("❌ ERROR IN MODEL INITIALIZATION")
        print("="*60)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        print("="*60)
        
        # Ensure model is marked as not ready if initialization fails
        detector.is_trained = False
        detector.model = None
        detector.accuracy = None

# Initialize model only once when module is imported (not in main block)
if not _initialized and __name__ == '__main__':
    print("🚀 Starting application initialization...")
    initialize_model()

# Register all routes after the detector is initialized
try:
    from routes import register_routes
    
    # Add template context processor for admin status
    @app.context_processor
    def inject_user_info():
        """Make user admin status available in all templates"""
        is_admin = False
        if session.get('user_id'):
            # Check if user role is in session
            if session.get('user_role') == 'admin':
                is_admin = True
            else:
                # Fallback: query database if role not in session
                user = DatabaseService.get_user_by_id(session['user_id'])
                if user and user.get('role') == 'admin':
                    is_admin = True
                    # Update session with role for future requests
                    session['user_role'] = 'admin'
        
        return {
            'user_is_admin': is_admin,
            'user_id': session.get('user_id'),
            'username': session.get('username')
        }
    
    # Ensure feedback service is available before routes registration
    initialize_feedback_service_if_needed()
    
    register_routes(app)
    print("Routes registered successfully")
except ImportError as e:
    print(f"Error importing routes: {e}")
    # Fallback - register essential routes directly
    @app.route('/model-status')
    def model_status_fallback():
        try:
            status_info = {
                'is_trained': detector.is_trained,
                'status': 'Model is ready' if detector.is_trained else 'Model is training...'
            }
            if detector.is_trained and detector.accuracy:
                status_info['accuracy'] = f"{detector.accuracy:.4f}"
                status_info['status'] = f"Model ready (Accuracy: {detector.accuracy:.1%})"
            
            # Use the global feedback_service or app.feedback_service
            current_feedback_service = getattr(app, 'feedback_service', feedback_service)
            if current_feedback_service:
                feedback_stats = current_feedback_service.get_feedback_stats()
                status_info['feedback'] = feedback_stats
            
            # Enhanced debug logging
            print(f"Model status endpoint called:")
            print(f"  detector.is_trained: {detector.is_trained}")
            print(f"  detector.model is not None: {detector.model is not None}")
            print(f"  detector.accuracy: {detector.accuracy}")
            print(f"  Returning status_info: {status_info}")
            
            return jsonify(status_info)
        except Exception as e:
            print(f"Error in model status endpoint: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Only initialize if not already done
    if not _initialized:
        print("🚀 Starting application initialization...")
        initialize_model()
    
    # Wait a moment and verify model state
    time.sleep(1)
    
    print("\n" + "="*60)
    print("🔍 FINAL MODEL STATUS VERIFICATION")
    print("="*60)
    print(f"✅ detector.is_trained: {detector.is_trained}")
    print(f"✅ detector.model exists: {detector.model is not None}")
    print(f"✅ detector.accuracy: {detector.accuracy}")
    print(f"✅ feedback_service initialized: {feedback_service is not None}")
    print(f"✅ app.feedback_service exists: {hasattr(app, 'feedback_service')}")
    
    if detector.is_trained:
        print("🎉 MODEL IS READY - Starting Flask server...")
    else:
        print("❌ MODEL NOT READY - Flask will start but model endpoints may fail")
    
    print("="*60)
    
    # Use use_reloader=False in development to prevent double initialization
    app.run(debug=True, port=5000, use_reloader=False)