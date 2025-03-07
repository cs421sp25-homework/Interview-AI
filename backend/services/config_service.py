# config_service.py

from supabase import create_client

class ConfigService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def get_single_config(self, name: str, email: str):
        """
        Fetch a config row by matching both name and email.
        Returns:
            dict: The config row if it exists, otherwise None.
        """
        result = (
            self.supabase
            .table("interview_config")
            .select("*")
            .eq("name", name)
            .eq("email", email)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]


# TODO: not checked
    def create_config(self, name: str, email: str, config_data: dict):
        """
        Create a new config row (if it doesn't exist) or upsert (replace) if one exists.
        This ensures only one config row per (name, email) pair.
        
        Args:
            name (str): The config name (e.g., 'my_config').
            email (str): The user email.
            config_data (dict): Any arbitrary configuration data.
        
        Returns:
            dict: The newly created or updated config row.
        """
        # We’ll use an upsert that matches on (name, email) to avoid duplicates.
        update_dict = {
            "name": name,
            "email": email,
            "config_value": config_data
        }
        result = (
            self.supabase
            .table("configs")
            .upsert(update_dict, on_conflict="name,email")
            .execute()
        )
        if not result.data:
            return None  # Failed to create/upsert
        
        # Return the newly upserted row
        return result.data[0]

#TODO might need update and delete operations