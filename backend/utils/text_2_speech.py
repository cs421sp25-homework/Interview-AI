from flask import Blueprint, request, jsonify, send_file
import io
from google.cloud import texttospeech

tts_bp = Blueprint('tts', __name__)

@tts_bp.route('/', methods=['POST'])
def text_to_speech():
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
