from flask import Blueprint, jsonify, current_app
import threading

model_bp = Blueprint('model', __name__)

@model_bp.route('/model-status')
def model_status():
    """Get current model status and statistics"""
    try:
        from web_app import detector, feedback_service
        
        # Enhanced debug logging with more details
        print("="*50)
        print("🔍 MODEL STATUS CHECK FROM ROUTES")
        print("="*50)
        print(f"detector.is_trained: {detector.is_trained}")
        print(f"detector.model exists: {detector.model is not None}")
        print(f"detector.accuracy: {detector.accuracy}")
        
        # Check model file existence
        import os
        model_file_exists = os.path.exists('fake_news_model.pkl')
        print(f"Model file exists: {model_file_exists}")
        
        # If model is not trained but file exists, try to reload
        if not detector.is_trained and model_file_exists:
            print("⚠️ Model not trained but file exists - attempting reload...")
            reload_success = detector.load_model()
            print(f"Reload attempt success: {reload_success}")
            print(f"After reload - is_trained: {detector.is_trained}")
        
        status_info = {
            'is_trained': detector.is_trained,
            'status': 'Model is ready' if detector.is_trained else 'Model is training...',
            'model_file_exists': model_file_exists
        }
        
        if detector.is_trained and detector.accuracy:
            status_info['accuracy'] = f"{detector.accuracy:.4f}"
            status_info['status'] = f"Model ready (Accuracy: {detector.accuracy:.1%})"
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        print(f"🔍 FEEDBACK SERVICE CHECK:")
        print(f"   current_feedback_service exists: {current_feedback_service is not None}")
        print(f"   feedback_service from import exists: {feedback_service is not None}")
        
        if current_feedback_service:
            print(f"   📊 Getting feedback stats...")
            feedback_stats = current_feedback_service.get_feedback_stats()
            status_info['feedback'] = feedback_stats
            print(f"   📤 Feedback stats from service: {feedback_stats}")
            print(f"   📊 Key values:")
            print(f"     total_feedback: {feedback_stats.get('total_feedback')}")
            print(f"     pending_training: {feedback_stats.get('pending_training')}")
            print(f"     can_retrain: {feedback_stats.get('can_retrain')}")
        else:
            print("⚠️ No feedback service available")
            status_info['feedback'] = {
                'total_feedback': 0, 
                'used_for_training': 0, 
                'pending_training': 0, 
                'can_retrain': False
            }
        
        print(f"📤 FINAL status_info being returned:")
        print(f"   feedback section: {status_info.get('feedback')}")
        print("="*50)
        
        return jsonify(status_info)
        
    except Exception as e:
        print(f"❌ Error in model status route: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@model_bp.route('/trigger-retrain', methods=['POST'])
def trigger_retrain():
    """Manually trigger model retraining with confirmation"""
    try:
        from web_app import feedback_service
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        if not current_feedback_service:
            return jsonify({'error': 'Feedback service not available'}), 503
        
        feedback_stats = current_feedback_service.get_feedback_stats()
        
        if feedback_stats['pending_training'] == 0:
            return jsonify({
                'success': False,
                'message': 'No new feedback available for retraining.'
            }), 400
        
        print(f"🔄 Manual retraining triggered with {feedback_stats['pending_training']} pending feedback entries")
        
        # Perform manual retraining (synchronous for immediate feedback)
        result = current_feedback_service.manual_retrain_with_feedback()
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'details': {
                    'old_accuracy': result.get('old_accuracy'),
                    'new_accuracy': result.get('new_accuracy'),
                    'feedback_used': result.get('feedback_used'),
                    'total_samples': result.get('total_samples')
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
        
    except Exception as e:
        print(f"❌ Error in manual retrain route: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'An error occurred during retraining: {str(e)}'
        }), 500
