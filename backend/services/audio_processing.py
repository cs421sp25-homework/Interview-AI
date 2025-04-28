from io import BytesIO
from pydub import AudioSegment

class AudioProcessingService:
    """Service for processing audio files, including format conversion"""
    
    def __init__(self):
        """Initialize audio processing service"""
        pass
        
    def convert_to_wav(self, audio_file, source_format):
        """
        Convert audio file to WAV format
        
        Args:
            audio_file: BytesIO object containing audio data
            source_format: Source audio format (e.g., 'mp3', 'ogg')
            
        Returns:
            BytesIO: WAV format audio data
        """
        # Reset file position
        audio_file.seek(0)
        
        # Load audio file with pydub
        audio_segment = AudioSegment.from_file(audio_file, format=source_format)
        
        # Create output buffer
        output = BytesIO()
        
        # Export as WAV
        audio_segment.export(output, format="wav")
        
        # Reset position for reading
        output.seek(0)
        
        return output 