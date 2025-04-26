#interaction with database, can be further break down
from supabase import create_client
from utils.validation_utils import validate_file

class StorageService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def upload_file(self, bucket_name: str, file_path: str, file_content: bytes, content_type: str):
        return self.supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": content_type, "upsert": "true"}
        )

    def get_public_url(self, bucket_name: str, file_path: str):
        return self.supabase.storage.from_(bucket_name).get_public_url(file_path)