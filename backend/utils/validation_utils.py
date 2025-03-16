from werkzeug.exceptions import BadRequest

def validate_file(file, allowed_types=None, max_size=5 * 1024 * 1024):
    """
    Validates a file based on type and size.

    Args:
        file: The file object to validate.
        allowed_types (list): List of allowed MIME types.
        max_size (int): Maximum file size in bytes.

    Raises:
        ValueError: If the file is invalid.
    """
    if allowed_types and file.content_type not in allowed_types:
        raise ValueError(f"Invalid file type. Allowed types: {allowed_types}")

    file.seek(0, 2)  # Move to the end of the file
    file_size = file.tell()
    file.seek(0)  # Reset file pointer

    if file_size > max_size:
        raise ValueError(f"File too large. Maximum size: {max_size} bytes")

def validate_audio_format(mime_type):
    """
    Validate that the audio format is supported
    
    Args:
        mime_type: MIME type of the audio file
        
    Returns:
        bool: True if the format is valid
        
    Raises:
        BadRequest: If the format is not supported
    """
    valid_formats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/x-wav']
    
    if mime_type not in valid_formats:
        raise BadRequest(f"Unsupported audio format: {mime_type}. Supported formats are: {', '.join(valid_formats)}")
    
    return True

def validate_text_input(text):
    """
    Validate that the text input is valid
    
    Args:
        text: Text to validate
        
    Returns:
        bool: True if the text is valid
        
    Raises:
        BadRequest: If the text is invalid
    """
    if not text:
        raise BadRequest("Empty text provided")
    
    if len(text) > 1000:
        raise BadRequest("Text is too long. Maximum length is 1000 characters")
    
    return True