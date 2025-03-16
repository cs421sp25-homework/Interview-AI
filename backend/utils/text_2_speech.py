import os
import uuid
import tempfile
from gtts import gTTS

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

if __name__ == "__main__":
    sample_text = "Hello, this is a test of text to speech conversion."
    audio_file = text_to_speech(sample_text)
    print(f"Audio file saved as: {audio_file}")