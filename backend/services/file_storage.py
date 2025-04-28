import os
from io import BytesIO
import uuid

class FileStorageService:
    """Service for handling file storage operations"""
    
    def __init__(self, storage_dir):
        """
        Initialize file storage service
        
        Args:
            storage_dir: Directory path for storing files
        """
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
    
    def save_file(self, file_data, file_extension):
        """
        Save a file to the storage directory
        
        Args:
            file_data: BytesIO object containing file data
            file_extension: File extension (e.g., 'wav', 'mp3')
            
        Returns:
            str: Unique file identifier/path
        """
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{file_extension}"
        filepath = os.path.join(self.storage_dir, filename)
        
        # Reset file position
        file_data.seek(0)
        
        # Write file to disk
        with open(filepath, "wb") as f:
            f.write(file_data.read())
        
        return filename
    
    def get_file(self, file_id):
        """
        Retrieve a file from storage
        
        Args:
            file_id: Unique file identifier/path
            
        Returns:
            BytesIO: File data
        """
        filepath = os.path.join(self.storage_dir, file_id)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File {file_id} not found")
        
        with open(filepath, "rb") as f:
            file_data = BytesIO(f.read())
        
        return file_data
    
    def delete_file(self, file_id):
        """
        Delete a file from storage
        
        Args:
            file_id: Unique file identifier/path
            
        Returns:
            bool: True if successful, False otherwise
        """
        filepath = os.path.join(self.storage_dir, file_id)
        
        if not os.path.exists(filepath):
            return False
        
        try:
            os.remove(filepath)
            return True
        except Exception:
            return False 