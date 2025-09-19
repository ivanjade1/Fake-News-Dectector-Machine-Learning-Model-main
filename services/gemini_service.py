from helpers import GeminiAnalyzer
gemini_analyzer = GeminiAnalyzer()


class GeminiService:
    def __init__(self):
        pass
    
    def analyze_with_gemini(self, text, title=None):
        """Analyze text using Gemini AI"""
        try:
            return gemini_analyzer(text, title)
        except Exception as e:
            print(f"Error in Gemini analysis: {str(e)}")
            return {
                'error': 'Gemini analysis failed',
                'details': str(e)
            }
    
    def get_gemini_status(self):
        """Check if Gemini service is available"""
        try:
            # Test with a simple text
            test_result = gemini_analyzer("Test news article", "Test Title")
            return {'available': True, 'status': 'Gemini service is operational'}
        except Exception as e:
            return {'available': False, 'status': f'Gemini service unavailable: {str(e)}'}
