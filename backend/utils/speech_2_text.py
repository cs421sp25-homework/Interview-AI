import speech_recognition as sr

def speech_to_text(audio_file_path: str) -> str:
    """
    Convert speech in an audio file to text using the SpeechRecognition library and the Google Speech API.

    Args:
        audio_file_path (str): The path to the audio file (e.g., WAV file).

    Returns:
        str: The transcribed text.

    Raises:
        Exception: If the transcription fails.
    """
    recognizer = sr.Recognizer()

    # Open the audio file using the SpeechRecognition AudioFile class.
    with sr.AudioFile(audio_file_path) as source:
        audio_data = recognizer.record(source)

    # Use Google Speech API to transcribe the audio.
    transcript = recognizer.recognize_google(audio_data)
    return transcript

# Example usage:
if __name__ == '__main__':
    audio_path = "input.wav"  # Replace with the path to your audio file
    try:
        result = speech_to_text(audio_path)
        print("Transcript:", result)
    except Exception as e:
        print("An error occurred during speech-to-text processing:", e)
