# project/backend/openai_tts.py

import os
from io import BytesIO
import openai

# Ensure you have your API key set in an environment variable, for example:
openai.api_key = os.getenv("OPENAI_API_KEY")

def text_to_speech(text: str, voice: str = "coral", instructions: str = "Speak in a cheerful and positive tone.", response_format: str = "mp3") -> BytesIO:
    """
    Generate spoken audio from input text using OpenAI's TTS API.
    
    Parameters:
        text (str): The input text to be spoken.
        voice (str): The voice to be used. (E.g., "coral")
        instructions (str): Additional instructions for the voice tone.
        response_format (str): The desired output format (e.g., "mp3", "wav").
    
    Returns:
        BytesIO: A stream containing the audio data.
    """

    # Call the OpenAI Audio API's speech endpoint
    # Note: This example uses the synchronous version.
    response = openai.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice=voice,
        input=text,
        # instructions=instructions,
        response_format=response_format
    )
    
    # Convert the response to raw bytes.
    audio_bytes = response.content
    return BytesIO(audio_bytes)
