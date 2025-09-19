import json
import os
import threading
from datetime import datetime
import pandas as pd

class FeedbackService:
    def __init__(self, model_service=None):
        self.model_service = model_service
        self.feedback_file = 'user_feedback.json'
        self.feedback_data = []
        self.retrain_threshold = 10
        self.load_feedback_data()
    
    def load_feedback_data(self):
        """Load existing feedback data"""
        try:
            if os.path.exists(self.feedback_file):
                with open(self.feedback_file, 'r', encoding='utf-8') as f:
                    self.feedback_data = json.load(f)
                print(f"Loaded {len(self.feedback_data)} feedback entries")
        except Exception as e:
            print(f"Error loading feedback data: {str(e)}")
            self.feedback_data = []
    
    def save_feedback_data(self):
        """Save feedback data to file"""
        try:
            with open(self.feedback_file, 'w', encoding='utf-8') as f:
                json.dump(self.feedback_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving feedback data: {str(e)}")
    
    def add_feedback(self, text, predicted_label, actual_label, confidence, user_comment=None, link=None, title=None, summary=None, factuality_score=None):
        """Add user feedback for model improvement"""
        if not self.model_service:
            print("No model service available for preprocessing")
            return
        
        print(f"\n📝 ADDING FEEDBACK TO SYSTEM:")
        print(f"   text: {len(text)} chars")
        print(f"   predicted_label: {predicted_label}")
        print(f"   actual_label: {actual_label}")
        print(f"   confidence: {confidence}")
        print(f"   user_comment: {user_comment}")
        print(f"   link: {link}")
        print(f"   title: {title}")
        print(f"   summary: {summary}")
        print(f"   factuality_score: {factuality_score}")
            
        feedback_entry = {
            'timestamp': datetime.now().isoformat(),
            'text': text,
            'predicted_label': predicted_label,
            'actual_label': actual_label,
            'confidence': confidence,
            'user_comment': user_comment,
            'link': link,
            'title': title,
            'summary': summary,
            'factuality_score': factuality_score,
            'processed_text': self.model_service.preprocess_text(text)
        }
        
        print(f"\n💾 FEEDBACK ENTRY CREATED:")
        print(f"   Entry keys: {list(feedback_entry.keys())}")
        print(f"   Title in entry: {feedback_entry.get('title')}")
        print(f"   Summary in entry: {feedback_entry.get('summary')}")
        print(f"   Factuality score in entry: {feedback_entry.get('factuality_score')}")
        
        self.feedback_data.append(feedback_entry)
        self.save_feedback_data()
        
        print(f"✅ Feedback added. Total feedback entries: {len(self.feedback_data)}")
        
        # Remove automatic retraining - now manual only
        unprocessed_feedback = [f for f in self.feedback_data if not f.get('used_for_training', False)]
        print(f"📊 Current unprocessed feedback: {len(unprocessed_feedback)} entries")
        print(f"💡 Use manual retrain button to retrain model with feedback")
    
    def manual_retrain_with_feedback(self):
        """Manually retrain the model incorporating user feedback"""
        if not self.model_service:
            print("No model service available for retraining")
            return {'success': False, 'message': 'Model service not available'}
            
        try:
            print("Starting MANUAL model retraining with user feedback...")
            
            df = self.model_service.load_and_prepare_data('WELFake_Dataset.csv')
            unprocessed_feedback = [f for f in self.feedback_data if not f.get('used_for_training', False)]
            
            if not unprocessed_feedback:
                return {'success': False, 'message': 'No new feedback available for training'}
            
            feedback_df = pd.DataFrame([
                {
                    'processed_text': f['processed_text'],
                    'label': 1 if f['actual_label'].lower() == 'real' else 0
                }
                for f in unprocessed_feedback
                if f['processed_text'].strip()
            ])
            
            if feedback_df.empty:
                return {'success': False, 'message': 'No valid feedback entries for training'}
            
            combined_df = pd.concat([df[['processed_text', 'label']], feedback_df], ignore_index=True)
            print(f"Training with {len(df)} original samples + {len(feedback_df)} feedback samples")
            
            old_accuracy = self.model_service.accuracy
            new_accuracy = self.model_service.train_best_model(combined_df)
            
            # CRITICAL: Save updated model to disk
            self.model_service.save_model(
                training_samples=len(combined_df),
                feedback_samples=len(feedback_df)
            )
            
            # Mark feedback as used ONLY after successful model save
            for feedback in unprocessed_feedback:
                feedback['used_for_training'] = True
                feedback['training_date'] = datetime.now().isoformat()
            
            self.save_feedback_data()
            
            print(f"✅ Manual model retraining completed!")
            print(f"   Previous accuracy: {old_accuracy:.4f}")
            print(f"   New accuracy: {new_accuracy:.4f}")
            print(f"   Feedback entries processed: {len(feedback_df)}")
            print(f"   Model saved to disk with {len(combined_df)} total samples")
            
            return {
                'success': True,
                'message': f'Model retrained successfully! Accuracy: {old_accuracy:.4f} → {new_accuracy:.4f}',
                'old_accuracy': old_accuracy,
                'new_accuracy': new_accuracy,
                'feedback_used': len(feedback_df),
                'total_samples': len(combined_df)
            }
                    
        except Exception as e:
            print(f"❌ Error during manual retraining: {str(e)}")
            return {'success': False, 'message': f'Retraining failed: {str(e)}'}
    
    def get_feedback_stats(self):
        """Get statistics about user feedback"""
        print(f"\nGET_FEEDBACK_STATS CALLED:")
        print(f"   self.feedback_data exists: {self.feedback_data is not None}")
        print(f"   self.feedback_data length: {len(self.feedback_data) if self.feedback_data else 'N/A'}")
        
        try:
            if not self.feedback_data:
                result = {
                    'total_feedback': 0, 
                    'used_for_training': 0, 
                    'pending_training': 0,
                    'can_retrain': False
                }
                print(f"   📤 RETURNING STATS: {result}")
                return result
            
            used_count = len([f for f in self.feedback_data if f.get('used_for_training', False)])
            pending_count = len(self.feedback_data) - used_count
            can_retrain = pending_count > 0
            
            print(f"   📈 DETAILED CALCULATION:")
            print(f"     Total entries: {len(self.feedback_data)}")
            print(f"     Used entries: {used_count}")
            print(f"     Pending entries: {pending_count}")
            print(f"     Can retrain: {can_retrain}")
            
            result = {
                'total_feedback': len(self.feedback_data), 
                'used_for_training': used_count,
                'pending_training': pending_count,
                'can_retrain': can_retrain
            }
            
            print(f"   📤 RETURNING STATS: {result}")
            return result
            
        except Exception as e:
            print(f"   ❌ ERROR in get_feedback_stats: {str(e)}")
            # Return safe defaults on any error
            return {
                'total_feedback': 0, 
                'used_for_training': 0, 
                'pending_training': 0,
                'can_retrain': False
            }
    
    def delete_feedback(self, feedback_id):
        """Delete feedback entry by ID (index)"""
        try:
            if 0 <= feedback_id < len(self.feedback_data):
                deleted_feedback = self.feedback_data.pop(feedback_id)
                
                # Save the updated data immediately to maintain consistency
                self.save_feedback_data()
                
                print(f"Deleted feedback entry {feedback_id}: {deleted_feedback.get('timestamp', 'Unknown timestamp')}")
                return True
            else:
                print(f"Invalid feedback ID: {feedback_id}")
                return False
        except Exception as e:
            print(f"Error deleting feedback: {str(e)}")
            return False
    
    def get_all_feedback(self):
        """Get all feedback entries with IDs"""
        return [
            {
                'id': i, 
                'timestamp': entry.get('timestamp', ''), 
                'predicted_label': entry.get('predicted_label', ''),
                'actual_label': entry.get('actual_label', ''), 
                'confidence': entry.get('confidence', 0),
                'text_preview': entry.get('text', '')[:100] + '...' if len(entry.get('text', '')) > 100 else entry.get('text', ''),
                'user_comment': entry.get('user_comment', ''), 
                'link': entry.get('link', None),
                'title': entry.get('title', None),
                'summary': entry.get('summary', None),
                'factuality_score': entry.get('factuality_score', None),
                'used_for_training': entry.get('used_for_training', False)
            }
            for i, entry in enumerate(self.feedback_data)
        ]
