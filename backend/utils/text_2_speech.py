import os
import uuid
import tempfile
from gtts import gTTS
from flask import Blueprint, request, jsonify, send_file
import io
from google.cloud import texttospeech

# Create Blueprint for text-to-speech routes
tts_bp = Blueprint('tts', __name__)

def text_to_speech(text: str, output_file: str = None, lang: str = 'en') -> str:
    """
    Convert text to speech and save as an MP3 file.
    If no output_file is provided, a unique temporary file is created.
    
    Parameters:
        text (str): The text to convert.
        output_file (str, optional): The path where the audio file will be saved.
        lang (str): The language for TTS conversion (default is English).
    
    Returns:
        str: The path of the saved audio file.
    """
    if output_file is None:
        tmp_dir = tempfile.gettempdir()
        unique_filename = f"{uuid.uuid4()}.mp3"
        output_file = os.path.join(tmp_dir, unique_filename)
    
    tts = gTTS(text=text, lang=lang)
    tts.save(output_file)
    return output_file


@tts_bp.route('/', methods=['POST'])
def tts_route():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400

    text = data['text']
    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    try:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        return send_file(
            io.BytesIO(response.audio_content),
            mimetype="audio/mp3",
            as_attachment=False,
            download_name="output.mp3"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Mock implementation for text_to_speech

def mock_text_to_speech():
    """
    Mock implementation of text_to_speech service
    
    Returns:
        A mock service object with the required methods
    """
    class MockTextToSpeechService:
        def convert_text_to_speech(self, text):
            """
            Mock method to convert text to speech
            
            Args:
                text: The text to convert
                
            Returns:
                dict: Result with success status and audio data or error
            """
            if not text:
                return {"success": False, "error": "Empty text provided"}
            
            try:
                # Return mock audio data
                return {
                    "success": True,
                    "audio_data": b"mock_audio_data"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Error converting text to speech: {str(e)}"
                }
    
    return MockTextToSpeechService()

if __name__ == "__main__":
    sample_text = "Hello, this is a test of text to speech conversion."
    audio_file = text_to_speech(sample_text)
    print(f"Audio file saved as: {audio_file}")

