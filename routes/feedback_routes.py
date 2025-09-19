from flask import Blueprint, request, jsonify, current_app
import traceback

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    """Submit user feedback for model improvement"""
    try:
        from web_app import feedback_service
        
        data = request.get_json()
        print(f"Feedback request data: {data}")
        
        if not data:
            print("Error: No JSON data received for feedback")
            return jsonify({'error': 'No data provided'}), 400
        
        text = data.get('text', '').strip()
        predicted_label = data.get('predicted_label', '').strip()
        actual_label = data.get('actual_label', '').strip()
        confidence = data.get('confidence', 0.0)
        user_comment = data.get('comment', '').strip()
        link = data.get('link', None)
        title = data.get('title', None)
        summary = data.get('summary', None)
        factuality_score = data.get('factuality_score', None)
        
        print(f"Feedback fields extracted:")
        print(f"  - text: {len(text)} chars")
        print(f"  - predicted: {predicted_label}")
        print(f"  - actual: {actual_label}")
        print(f"  - confidence: {confidence}")
        print(f"  - link: {link}")
        print(f"  - title: {title}")
        print(f"  - summary: {summary}")
        print(f"  - factuality_score: {factuality_score}")
        
        # Validate required fields
        if not text or not predicted_label or not actual_label:
            missing_fields = []
            if not text: missing_fields.append('text')
            if not predicted_label: missing_fields.append('predicted_label')
            if not actual_label: missing_fields.append('actual_label')
            print(f"Error: Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        if actual_label.lower() not in ['fake', 'real']:
            print(f"Error: Invalid actual_label: {actual_label}")
            return jsonify({'error': 'actual_label must be either "fake" or "real"'}), 400
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        if not current_feedback_service:
            return jsonify({'error': 'Feedback service not available'}), 503
        
        print("Adding feedback to system...")
        # Pass parameters in the correct order according to the method signature
        current_feedback_service.add_feedback(
            text=text,
            predicted_label=predicted_label,
            actual_label=actual_label,
            confidence=confidence,
            user_comment=user_comment,
            link=link,
            title=title,
            summary=summary,
            factuality_score=factuality_score
        )
        
        feedback_stats = current_feedback_service.get_feedback_stats()
        print(f"Updated feedback stats: {feedback_stats}")
        
        response = {
            'message': 'Thank you for your feedback! It will help improve the model.',
            'feedback_stats': feedback_stats
        }
        
        # Ensure we're using the correct key name with safe access
        if feedback_stats.get('can_retrain', False):
            response['message'] += f' The model can be retrained with {feedback_stats.get("pending_training", 0)} new feedback entries.'
        
        print(f"Feedback submission successful: {response}")
        return jsonify(response)
        
    except Exception as e:
        print(f"Submit feedback error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@feedback_bp.route('/feedback-stats')
def feedback_stats():
    """Get feedback statistics"""
    try:
        from web_app import feedback_service
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        if not current_feedback_service:
            return jsonify({'error': 'Feedback service not available'}), 503
        
        stats = current_feedback_service.get_feedback_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@feedback_bp.route('/delete-feedback/<int:feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    """Delete a specific feedback entry"""
    try:
        from web_app import feedback_service
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        if not current_feedback_service:
            return jsonify({'error': 'Feedback service not available'}), 503
        
        success = current_feedback_service.delete_feedback(feedback_id)
        
        if success:
            feedback_stats = current_feedback_service.get_feedback_stats()
            return jsonify({
                'message': 'Feedback entry deleted successfully',
                'feedback_stats': feedback_stats
            })
        else:
            return jsonify({'error': 'Feedback entry not found or could not be deleted'}), 404
            
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@feedback_bp.route('/get-feedback', methods=['GET'])
def get_feedback():
    """Get all feedback entries"""
    try:
        from web_app import feedback_service
        
        # Use the correct feedback service reference
        current_feedback_service = getattr(current_app, 'feedback_service', feedback_service)
        if not current_feedback_service:
            return jsonify({'error': 'Feedback service not available'}), 503
        
        feedback_entries = current_feedback_service.get_all_feedback()
        feedback_stats = current_feedback_service.get_feedback_stats()
        
        return jsonify({
            'feedback_entries': feedback_entries,
            'feedback_stats': feedback_stats
        })
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
