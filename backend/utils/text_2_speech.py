import os
from io import BytesIO
import logging
from typing import Tuple
import openai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def text_to_speech(
    text: str, 
    voice: str = "alloy",
    response_format: str = "mp3",
    speed: float = 1.0
) -> Tuple[BytesIO, float]:
    """
    Generate speech from text using OpenAI's TTS API.
    
    Args:
        text: Input text to convert
        voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
        response_format: Output format (mp3, opus, aac, flac)
        speed: Speaking speed (0.25 to 4.0)
        
    Returns:
        Tuple of (audio_bytes: BytesIO, duration: float)
        
    Raises:
        Exception: For API or processing errors
    """
    try:
        if not text.strip():
            raise ValueError("Empty text input")
            
        response = openai.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            response_format=response_format,
            speed=speed
        )
        
        # Estimate duration (approximate)
        duration = len(text.split()) / 3  # 3 words per second average
        
        return BytesIO(response.content), duration
        
    except Exception as e:
        logger.error(f"Text-to-speech conversion failed: {str(e)}")
        raise