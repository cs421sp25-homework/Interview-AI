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