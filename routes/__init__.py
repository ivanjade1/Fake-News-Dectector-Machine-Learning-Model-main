from .main_routes import main_bp
from .prediction_routes import prediction_bp
from .feedback_routes import feedback_bp
from .model_routes import model_bp
from .history_routes import history_bp
from .auth_routes import auth_bp
from .game_routes import game_bp
from .admin_routes import admin_bp
from .passwordreset_routes import passwordreset_bp

def register_routes(app):
    """Register all route blueprints with the Flask app"""
    app.register_blueprint(main_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(passwordreset_bp)
