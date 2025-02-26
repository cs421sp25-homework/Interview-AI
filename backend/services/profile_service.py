# CURD operation for profiles
from supabase import create_client
from models.profile_model import Profile
from utils.validation_utils import validate_file

class ProfileService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def get_profile(self, username: str):
        result = self.supabase.table('profiles').select('*').eq('username', username).execute()
        if not result.data:
            return None
        return Profile(**result.data[0])

    def update_profile(self, username: str, data: dict):
        # Fetch current profile
        current_profile = self.get_profile(username)
        if not current_profile:
            return None

        # Update fields
        updated_profile = current_profile.copy(update=data)
        result = self.supabase.table('profiles').upsert(updated_profile.dict()).execute()
        return result.data[0] if result.data else None
    
    def create_profile(self, data: dict):
        # Check if a profile already exists for the username
        if self.get_profile(data.get("username")):
            raise Exception(f"Profile already exists for username: {data.get('username')}")
        
        # Create a new Profile instance using the provided data
        new_profile = Profile(**data)
        result = self.supabase.table('profiles').insert(new_profile.dict()).execute()
        
        if not result.data:
            raise Exception("Failed to create profile")
        
        return Profile(**result.data[0])