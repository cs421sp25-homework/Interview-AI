import io
import speech_recognition as sr
from openai import OpenAI
import io

def speech_to_text(audio_input) -> str:
    if isinstance(audio_input, bytes):
        audio_file = io.BytesIO(audio_input)
        # Set a filename so Whisper can detect the format.
        audio_file.name = "recording.wav"
    elif isinstance(audio_input, str):
        audio_file = open(audio_input, "rb")
    else:
        raise ValueError("Unsupported audio input type. Must be a file path (str) or bytes.")


    client = OpenAI()
    transcription = transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file
    )
    return transcription.text