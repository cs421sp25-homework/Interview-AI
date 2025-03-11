from gtts import gTTS

def text_to_audio(text, output_file='output.mp3', lang='en'):
    """
    Convert text to speech and save as an audio file.
    
    Parameters:
    - text (str): The text to convert.
    - output_file (str): The path where the audio file will be saved.
    - lang (str): The language for the TTS conversion (default is English).
    
    Returns:
    - output_file (str): The path of the saved audio file.
    """
    # Create a gTTS object
    tts = gTTS(text=text, lang=lang)
    
    # Save the speech to an MP3 file
    tts.save(output_file)
    
    return output_file

# Example usage:
if __name__ == "__main__":
    sample_text = "Hello, this is a test of text to speech conversion."
    audio_file = text_to_audio(sample_text, output_file='output.mp3')
    print(f"Audio file saved as: {audio_file}")



