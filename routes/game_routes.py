from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
import json
import os
from database import DatabaseService, db
from datetime import datetime, timezone

game_bp = Blueprint('game', __name__, url_prefix='/game')

def login_required(f):
    """Decorator to require login for game routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/game/api/'):
                return jsonify({'error': 'Login required'}), 401
            else:
                flash('Please log in to access the Game Hub.', 'warning')
                return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@game_bp.route('/')
@login_required
def game_hub():
    """Game hub - main game selection page"""
    user_stats = None
    user_id = session['user_id']
    user_stats = DatabaseService.get_user_game_stats(user_id)
    
    # Initialize stats if user doesn't have any yet
    if not user_stats:
        DatabaseService.initialize_user_game_stats(user_id)
        user_stats = DatabaseService.get_user_game_stats(user_id)
    
    return render_template('game.html', user_stats=user_stats)

@game_bp.route('/stage1')
@login_required
def stage1_game():
    """Stage 1: News Detective Game - Basic fake news detection"""
    return render_template('stages/stage1/stage1.html')

@game_bp.route('/stage2')
@login_required
def stage2_game():
    """Stage 2: Source Verification Challenge - Advanced source credibility analysis"""
    return render_template('stages/stage2/stage2.html')

@game_bp.route('/stage3')
@login_required
def stage3_game():
    """Stage 3: Fact-Checking Olympics - Speed rounds and competitive challenges"""
    return render_template('stages/stage3/stage3.html')

@game_bp.route('/stage4')
@login_required
def stage4_game():
    """Stage 4: Advanced Challenge - Complex multi-source verification"""
    return render_template('stages/stage4/stage4.html')

@game_bp.route('/stage5')
@login_required
def stage5_game():
    """Stage 5: Expert Level - Real-world scenario simulation"""
    return render_template('stages/stage5/stage5.html')

# API endpoints for game functionality
@game_bp.route('/api/stage2/data', methods=['GET'])
@login_required
def get_stage2_data():
    """Get Stage 2: Source Showdown game data"""
    try:
        # Load stage2.json file
        stage2_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'stage2.json')
        
        if not os.path.exists(stage2_file_path):
            return jsonify({'success': False, 'error': 'Stage 2 data file not found'}), 404
        
        with open(stage2_file_path, 'r', encoding='utf-8') as file:
            stage2_data = json.load(file)
        
        return jsonify({
            'success': True,
            'data': stage2_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage3/data', methods=['GET'])
@login_required
def get_stage3_data():
    """Get Stage 3: Content Preview game data"""
    try:
        # Load stage3.json file
        stage3_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'stage3.json')
        
        if not os.path.exists(stage3_file_path):
            return jsonify({'success': False, 'error': 'Stage 3 data file not found'}), 404
        
        with open(stage3_file_path, 'r', encoding='utf-8') as file:
            stage3_data = json.load(file)
        
        return jsonify(stage3_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage3/complete', methods=['POST'])
@login_required
def complete_stage3():
    """Handle Stage 3 game completion - DEPRECATED, use /api/complete-game"""
    return complete_game()

@game_bp.route('/api/complete-game', methods=['POST'])
@login_required
def complete_game():
    """Handle game completion for any stage and update user stats"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
        
        # Validate completion data
        xp_earned = data.get('total_xp', 0)
        correct_answers = data.get('correct_answers', 0)
        stage = data.get('stage', 'unknown')
        
        # Validate that all 10 rounds were completed
        if correct_answers < 0 or correct_answers > 10:
            return jsonify({'success': False, 'error': 'Invalid correct_answers value'}), 400
        
        # Update user game statistics
        result = DatabaseService.update_user_game_stats(user_id, xp_earned, correct_answers)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': f'Stage {stage} completed successfully',
                'stats': result['stats']
            })
        else:
            return jsonify({'success': False, 'error': result.get('error', 'Unknown error')}), 500
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage4/data', methods=['GET'])
@login_required
def get_stage4_data():
    """Get Stage 4: Claim Cross-Check game data"""
    try:
        # Load stage4.json file
        stage4_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'stage4.json')
        
        if not os.path.exists(stage4_file_path):
            return jsonify({'success': False, 'error': 'Stage 4 data file not found'}), 404
        
        with open(stage4_file_path, 'r', encoding='utf-8') as file:
            stage4_data = json.load(file)
        
        return jsonify(stage4_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage4/complete', methods=['POST'])
@login_required
def complete_stage4():
    """Handle Stage 4 game completion"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        # Store results in database if user is logged in
        if user_id:
            db = DatabaseService()
            db.save_game_results({
                'user_id': user_id,
                'stage': data.get('stage'),
                'total_xp': data.get('totalXP'),
                'accuracy': data.get('accuracy'),
                'average_time': data.get('averageTime'),
                'answers': data.get('answers'),
                'completed_at': data.get('completedAt')
            })
        
        return jsonify({'success': True, 'message': 'Stage 4 completed successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage5/data', methods=['GET'])
@login_required
def get_stage5_data():
    """Get Stage 5: Full Article Analysis game data"""
    try:
        # Load stage5.json file
        stage5_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'stage5.json')
        
        if not os.path.exists(stage5_file_path):
            return jsonify({'success': False, 'error': 'Stage 5 data file not found'}), 404
        
        with open(stage5_file_path, 'r', encoding='utf-8') as file:
            stage5_data = json.load(file)
        
        return jsonify(stage5_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/stage5/complete', methods=['POST'])
@login_required
def complete_stage5():
    """Handle Stage 5 game completion"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        # Store results in database if user is logged in
        if user_id:
            db = DatabaseService()
            db.save_game_results({
                'user_id': user_id,
                'stage': data.get('stage'),
                'total_xp': data.get('totalXP'),
                'accuracy': data.get('accuracy'),
                'average_time': data.get('averageTime'),
                'answers': data.get('answers'),
                'completed_at': data.get('completedAt')
            })
        
        return jsonify({'success': True, 'message': 'Stage 5 completed successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/submit-answer', methods=['POST'])
@login_required
def submit_answer():
    """Submit answer for any game stage"""
    try:
        data = request.get_json()
        stage = data.get('stage')
        answer = data.get('answer')
        round_id = data.get('round_id')
        user_id = session.get('user_id')
        
        # Process the answer based on stage
        result = process_game_answer(stage, answer, round_id, user_id)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@game_bp.route('/api/user-stats')
@login_required
def get_user_stats():
    """Get user's game statistics"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User not logged in'}), 401
        
        stats = get_user_game_stats(user_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Helper functions
def process_game_answer(stage, answer, round_id, user_id):
    """Process game answer and return result"""
    # This would contain the logic for processing answers
    # For now, return a placeholder
    return {
        'success': True,
        'correct': True,  # This would be calculated based on actual answer
        'score': 100,
        'message': 'Correct! Well done.',
        'explanation': 'This article was correctly identified.'
    }

def get_user_game_stats(user_id):
    """Get user's game statistics"""
    # This would fetch user stats from database
    # For now, return placeholder data
    return {
        'success': True,
        'stats': {
            'games_played': 42,
            'accuracy_rate': 87,
            'total_xp': 1250,
            'rank': 15,
            'level': 8
        }
    }
