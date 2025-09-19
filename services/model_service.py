import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
import warnings
import os
import joblib
from datetime import datetime

warnings.filterwarnings('ignore')

class FakeNewsDetector:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        self.model = None
        self.stemmer = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))
        self.is_trained = False
        self.accuracy = None
    
    def load_model(self, filepath='fake_news_model.pkl'):
        """Load a pre-trained model from disk"""
        try:
            if not os.path.exists(filepath):
                print(f"Model file '{filepath}' not found.")
                return False
                
            model_data = joblib.load(filepath)
            self.model = model_data['model']
            self.stemmer = model_data['stemmer']
            self.stop_words = model_data['stop_words']
            self.accuracy = model_data['accuracy']
            self.is_trained = True
            
            training_samples = model_data.get('training_samples', 'Unknown')
            feedback_samples = model_data.get('feedback_samples', 0)
            last_retrain = model_data.get('last_retrain', 'Unknown')
            
            print(f"Model loaded successfully with accuracy: {self.accuracy:.4f}")
            print(f"Training samples: {training_samples}, Feedback samples: {feedback_samples}")
            if last_retrain != 'Unknown':
                print(f"Last retrained: {last_retrain}")
            
            return True
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False
    
    def save_model(self, filepath='fake_news_model.pkl', training_samples=0, feedback_samples=0):
        """Save the current model to disk"""
        try:
            model_data = {
                'model': self.model, 
                'accuracy': self.accuracy, 
                'stemmer': self.stemmer,
                'stop_words': self.stop_words, 
                'training_samples': training_samples, 
                'feedback_samples': feedback_samples,
                'last_retrain': datetime.now().isoformat()
            }
            joblib.dump(model_data, filepath)
            print(f"Model saved to {filepath}")
        except Exception as e:
            print(f"Error saving model: {str(e)}")
    
    def preprocess_text(self, text):
        """Clean and preprocess text data"""
        if pd.isna(text) or text is None:
            return ""
        
        text = text.lower()
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        text = ' '.join(text.split())
        words = text.split()
        words = [self.stemmer.stem(word) for word in words if word not in self.stop_words]
        return ' '.join(words)
    
    def load_and_prepare_data(self, filepath):
        """Load and prepare the dataset"""
        print("Loading dataset...")
        df = pd.read_csv(filepath)
        df['title'] = df['title'].fillna('')
        df['text'] = df['text'].fillna('')
        df['combined_text'] = df['title'] + ' ' + df['text']
        df['processed_text'] = df['combined_text'].apply(self.preprocess_text)
        df = df[df['processed_text'].str.len() > 0]
        return df
    
    def train_best_model(self, df):
        """Train and select the best model"""
        X = df['processed_text']
        y = df['label']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        models = {
            'Logistic Regression': LogisticRegression(random_state=42),
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'Naive Bayes': MultinomialNB()
        }
        
        best_accuracy = 0
        best_model = None
        
        for name, model in models.items():
            pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english')),
                ('classifier', model)
            ])
            
            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            print(f"{name} Accuracy: {accuracy:.4f}")
            
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_model = pipeline
        
        self.model = best_model
        self.is_trained = True
        self.accuracy = best_accuracy
        print(f"Best model selected with accuracy: {best_accuracy:.4f}")
        return best_accuracy
    
    def calculate_weighted_factuality_score(self, ml_score: int, gemini_score: int = None, trusted_sources_count: int = 0, gemini_source_boosted: bool = False) -> dict:
        """
        Calculate weighted factuality score with enhanced handling of source-boosted Gemini scores
        
        Args:
            ml_score: Machine learning model's factuality score (0-100)
            gemini_score: Gemini AI's factuality score (0-100), optional
            trusted_sources_count: Number of trusted sources found in cross-check
            
        Returns:
            dict: Contains final score, weights used, and reasoning
        """
        # Define weights based on trusted sources count and Gemini boost status
        if gemini_source_boosted and trusted_sources_count >= 2:
            # If Gemini score was boosted by sources, trust it more heavily
            weight_config = {
                0: {"ml_weight": 0.80, "gemini_weight": 0.20, "reason": "Gemini source-boosted but no cross-check matches."},
                1: {"ml_weight": 0.60, "gemini_weight": 0.40, "reason": "Single external source, Gemini source-validated."},
                2: {"ml_weight": 0.30, "gemini_weight": 0.70, "reason": "Moderate external validation, Gemini source-boosted."},
                3: {"ml_weight": 0.15, "gemini_weight": 0.85, "reason": "Strong consensus with source-validated Gemini score."}
            }
        else:
            # Standard weights for non-boosted scores
            weight_config = {
                0: {"ml_weight": 0.90, "gemini_weight": 0.10, "reason": "No external validation, trust ML."},
                1: {"ml_weight": 0.70, "gemini_weight": 0.30, "reason": "Weak external support, mostly ML."},
                2: {"ml_weight": 0.40, "gemini_weight": 0.60, "reason": "Moderate external confirmation."},
                3: {"ml_weight": 0.20, "gemini_weight": 0.80, "reason": "Strong consensus, rely on Gemini."}
            }
        
        # Get weights for the trusted sources count (3+ uses same weights as 3)
        effective_count = min(trusted_sources_count, 3)
        config = weight_config[effective_count]
        
        ml_weight = config["ml_weight"]
        gemini_weight = config["gemini_weight"]
        reason = config["reason"]
        
        # If no Gemini score provided, adjust logic based on trusted sources
        if gemini_score is None:
            if trusted_sources_count >= 3:
                source_boost = min(20, trusted_sources_count * 4)
                final_score = min(100, ml_score + source_boost)
                confidence_adjustment = 0.85
                adjusted_reason = f"Strong external validation ({trusted_sources_count} trusted sources) compensates for missing Gemini analysis. Applied {source_boost}% boost to ML score."
                print(f"📈 High trusted sources ({trusted_sources_count}) but no Gemini score - boosting ML score by {source_boost}%")
            elif trusted_sources_count >= 2:
                source_boost = min(10, trusted_sources_count * 3)
                final_score = min(100, ml_score + source_boost)
                confidence_adjustment = 0.80
                adjusted_reason = f"Moderate external validation ({trusted_sources_count} trusted sources). Applied {source_boost}% boost to ML score."
                print(f"📈 Moderate trusted sources ({trusted_sources_count}) but no Gemini score - boosting ML score by {source_boost}%")
            elif trusted_sources_count == 1:
                source_boost = 5
                final_score = min(100, ml_score + source_boost)
                confidence_adjustment = 0.75
                adjusted_reason = f"Single trusted source found. Applied {source_boost}% boost to ML score."
            else:
                final_score = ml_score
                confidence_adjustment = 0.70
                adjusted_reason = f"{reason} (Gemini analysis unavailable)"
        else:
            # Enhanced handling for source-boosted Gemini scores
            score_difference = abs(ml_score - gemini_score)
            
            if gemini_source_boosted and trusted_sources_count >= 2:
                # When Gemini score is source-boosted, be more conservative about extreme disagreements
                if score_difference > 50:
                    # Very extreme disagreement even with source boost - use more balanced weights
                    ml_weight = 0.45
                    gemini_weight = 0.55
                    adjusted_reason = f"Extreme disagreement despite source validation, using balanced weights. Gemini was source-boosted."
                    print(f"⚠️ Extreme disagreement with source-boosted Gemini: ML={ml_score}%, Gemini={gemini_score}%, using balanced approach")
                else:
                    adjusted_reason = f"{reason} (Gemini score enhanced by source validation)"
                    print(f"✅ Using source-validated Gemini score with enhanced weight: {gemini_weight:.1%}")
            elif trusted_sources_count >= 3 and score_difference > 40:
                # High source count but scores disagree and Gemini wasn't source-boosted
                ml_weight = 0.40
                gemini_weight = 0.60
                adjusted_reason = f"High source count ({trusted_sources_count}) but score disagreement, using balanced weights."
                print(f"⚠️ Score disagreement: ML={ml_score}%, Gemini={gemini_score}%, adjusting weights")
            elif trusted_sources_count >= 2 and score_difference > 50:
                ml_weight = 0.50
                gemini_weight = 0.50
                adjusted_reason = f"Moderate source count ({trusted_sources_count}) with extreme disagreement, using equal weights."
                print(f"⚠️ Extreme disagreement: ML={ml_score}%, Gemini={gemini_score}%, using equal weights")
            else:
                adjusted_reason = reason
            
            # Calculate weighted average
            final_score = int((ml_score * ml_weight) + (gemini_score * gemini_weight))
            confidence_adjustment = 1.0
            
            # Additional boost for highly source-validated scores
            if trusted_sources_count >= 3 and gemini_source_boosted and final_score < 40:
                additional_boost = min(10, trusted_sources_count * 2)
                final_score = min(100, final_score + additional_boost)
                adjusted_reason += f" (Applied additional {additional_boost}% boost for strong source validation)"
                print(f"📈 Applied additional {additional_boost}% boost for strong source validation")
        
        # Determine factuality level based on final score
        if final_score >= 90:
            factuality_level = "Very High"
            factuality_description = "Article is highly factual. Clear alignment with verified, trusted sources."
        elif final_score >= 75:
            factuality_level = "High"
            factuality_description = "Generally factual with minor sourcing or transparency concerns."
        elif final_score >= 51:
            factuality_level = "Mostly Factual"
            factuality_description = "Some unverifiable or weak claims; generally reliable and informative."
        elif final_score >= 26:
            factuality_level = "Low"
            factuality_description = "Frequently misleading or poorly sourced; lacks consistent verification."
        else:
            factuality_level = "Very Low"
            factuality_description = "Largely false or fabricated; contradicts verified sources."
        
        return {
            'final_score': final_score,
            'original_ml_score': ml_score,
            'gemini_score': gemini_score,
            'trusted_sources_count': trusted_sources_count,
            'ml_weight': ml_weight,
            'gemini_weight': gemini_weight,
            'reasoning': adjusted_reason,
            'factuality_level': factuality_level,
            'factuality_description': factuality_description,
            'confidence_adjustment': confidence_adjustment,
            'gemini_source_boosted': gemini_source_boosted
        }

    def predict(self, text, cross_check_data=None, gemini_factuality_score=None):
        """Predict if a news article is fake or real with enhanced factuality score"""
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained yet!")
        
        processed_text = self.preprocess_text(text)
        if not processed_text:
            return {
                'prediction': 'Fake', 'confidence': 0.5, 'probabilities': {'Fake': 0.5, 'Real': 0.5},
                'factuality_score': 50, 'factuality_level': 'Low',
                'factuality_description': 'Frequently misleading or poorly sourced; lacks consistent verification.',
                'error': 'Text is empty after preprocessing'
            }
        
        try:
            prediction = self.model.predict([processed_text])[0]
            probability = self.model.predict_proba([processed_text])[0]
            
            real_prob = float(probability[1])
            ml_factuality_score = int(real_prob * 100)
            
            # Get trusted sources count from cross-check data
            trusted_sources_count = 0
            if cross_check_data and 'matches' in cross_check_data:
                trusted_sources_count = len(cross_check_data['matches'])
            
            # Check if Gemini score was source-boosted (from enhanced assessment)
            gemini_source_boosted = False
            if isinstance(gemini_factuality_score, dict):
                # If we received the full Gemini assessment object
                gemini_source_boosted = gemini_factuality_score.get('source_boost_applied', False)
                gemini_factuality_score = gemini_factuality_score.get('factuality_score')
            
            # Calculate weighted factuality score with source boost awareness
            weighted_result = self.calculate_weighted_factuality_score(
                ml_score=ml_factuality_score,
                gemini_score=gemini_factuality_score,
                trusted_sources_count=trusted_sources_count,
                gemini_source_boosted=gemini_source_boosted
            )
            
            final_factuality_score = weighted_result['final_score']
            
            # Determine classification based on final weighted score
            classification = "Real" if final_factuality_score >= 51 else "Fake"
            
            # Adjust confidence based on trusted sources and source validation
            base_confidence = float(max(probability))
            confidence_boost = 0
            if trusted_sources_count >= 3:
                confidence_boost = 0.1
            elif trusted_sources_count >= 2:
                confidence_boost = 0.05
            
            adjusted_confidence = min(1.0, base_confidence * weighted_result['confidence_adjustment'] + confidence_boost)
            
            result = {
                'prediction': classification, 
                'confidence': adjusted_confidence,
                'probabilities': {'Fake': float(probability[0]), 'Real': float(probability[1])},
                'factuality_score': final_factuality_score, 
                'factuality_level': weighted_result['factuality_level'],
                'factuality_description': weighted_result['factuality_description'],
                'weighting_info': {
                    'original_ml_score': weighted_result['original_ml_score'],
                    'gemini_score': weighted_result['gemini_score'],
                    'trusted_sources_count': weighted_result['trusted_sources_count'],
                    'ml_weight': weighted_result['ml_weight'],
                    'gemini_weight': weighted_result['gemini_weight'],
                    'reasoning': weighted_result['reasoning'],
                    'gemini_source_boosted': weighted_result.get('gemini_source_boosted', False)
                }
            }
            
            # Only print weighting information if this is the final calculation
            should_show_output = (
                gemini_factuality_score is not None or
                (cross_check_data and cross_check_data.get('final_calculation', False)) or
                (cross_check_data and not cross_check_data.get('suppress_weighting_output', False) and 
                 gemini_factuality_score is None)
            )
            
            if should_show_output:
                print(f"\n📊 ENHANCED FACTUALITY SCORE WEIGHTING:")
                print(f"   Original ML Score: {weighted_result['original_ml_score']}%")
                print(f"   Gemini Score: {weighted_result['gemini_score'] or 'N/A'}")
                if weighted_result.get('gemini_source_boosted'):
                    print(f"   Gemini Source Boosted: ✅ (Enhanced by cross-check validation)")
                print(f"   Trusted Sources: {weighted_result['trusted_sources_count']}")
                print(f"   ML Weight: {weighted_result['ml_weight']:.1%}")
                print(f"   Gemini Weight: {weighted_result['gemini_weight']:.1%}")
                print(f"   Final Score: {final_factuality_score}%")
                print(f"   Reasoning: {weighted_result['reasoning']}")
            
            return result
            
        except Exception as e:
            return {
                'prediction': 'Fake', 'confidence': 0.5, 'probabilities': {'Fake': 0.5, 'Real': 0.5},
                'factuality_score': 50, 'factuality_level': 'Low',
                'factuality_description': 'Frequently misleading or poorly sourced; lacks consistent verification.',
                'error': str(e)
            }
