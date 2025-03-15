from pydub import AudioSegment
import io

def convert_to_wav(audio_bytes: bytes, input_format: str = "webm") -> io.BytesIO:
    """
    Convert audio bytes in the specified format to WAV.
    
    Args:
        audio_bytes (bytes): The raw audio data.
        input_format (str): The format of the input audio (e.g., "webm", "ogg").
    
    Returns:
        io.BytesIO: A BytesIO object containing the WAV data.
    """
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=input_format)
    wav_io = io.BytesIO()
    audio.export(wav_io, format="wav")
    wav_io.seek(0)
    return wav_io
