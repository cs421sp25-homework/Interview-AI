import io
import speech_recognition as sr

def speech_to_text(audio_input) -> str:
    """
    Convert speech from an audio input to text using the SpeechRecognition library 
    and the Google Speech API.

    The audio_input parameter can be either a file path (str) or raw audio data (bytes).

    Args:
        audio_input (str or bytes): The path to the audio file (e.g., WAV file) or raw audio bytes.

    Returns:
        str: The transcribed text, or an empty string if no speech is detected.

    Raises:
        ValueError: If the provided audio_input type is unsupported.
        Exception: If transcription fails.
    """
    recognizer = sr.Recognizer()

    if isinstance(audio_input, bytes):
        # Wrap raw bytes in a BytesIO object.
        audio_file = io.BytesIO(audio_input)
    elif isinstance(audio_input, str):
        audio_file = audio_input
    else:
        raise ValueError("Unsupported audio input type. Must be a file path (str) or bytes.")

    with sr.AudioFile(audio_file) as source:
        audio_data = recognizer.record(source)

    try:
        transcript = recognizer.recognize_google(audio_data)
        return transcript
    except sr.UnknownValueError:
        # If the recognizer couldn't understand the audio, return an empty string.
        return ""
    except Exception as e:
        # For other exceptions, re-raise the error or handle as needed.
        raise e
