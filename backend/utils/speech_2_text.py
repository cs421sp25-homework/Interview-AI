import io
import logging
from typing import Union
from openai import OpenAI
from openai.types.audio import Transcription

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def speech_to_text(audio_input: Union[bytes, str]) -> str:
    """
    Convert speech to text using OpenAI's Whisper API.
    
    Args:
        audio_input: Either bytes of audio file or path to audio file
        
    Returns:
        Transcribed text
        
    Raises:
        ValueError: If audio input is invalid
        Exception: For API or processing errors
    """
    try:
        if isinstance(audio_input, bytes):
            if len(audio_input) == 0:
                raise ValueError("Empty audio data received")
            audio_file = io.BytesIO(audio_input)
            audio_file.name = "recording.wav"
        elif isinstance(audio_input, str):
            audio_file = open(audio_input, "rb")
        else:
            raise ValueError("Unsupported audio input type")

        client = OpenAI()
        transcription: Transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return transcription.text
        
    except Exception as e:
        logger.error(f"Speech-to-text conversion failed: {str(e)}")
        raise