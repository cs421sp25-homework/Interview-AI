from supabase import create_client

from backend.models.config_model import Interview

class ConfigService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)


    def get_config(self, email: str):
        """
        Retrieves all configuration entries associated with the given email.
        """
        result = self.supabase.table('interview_config').select('*').eq('email', email).execute()
        print(f"get_config result: {result.data}")

        if not result.data:
            return None
        return result.data



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

    def get_all_configs(self):
        """
        Fetch all config rows.
        """
        result = self.supabase.table('interview_config').select('*').execute()
        if not result.data:
            return []
        return result.data

# TODO: not checked
    def create_or_update_config(self, name: str, email: str, config_data: dict):
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
        interview = Interview(**config_data)
        result = (
            self.supabase
            .table('interview_config')
            .upsert(interview.dict(), on_conflict=['name', 'email'])
            .execute()
        )
        if not result.data:
            return None  # Failed to create/upsert
        
        # Return the newly upserted row
        return result.data[0]

#TODO might need update and delete operations
    def update_config(self, name: str, email: str, updated_data: dict):
        """
        Update an existing config row identified by name and email.
        """
        result = (
            self.supabase
            .table('interview_config')
            .update(updated_data)
            .eq('name', name)
            .eq('email', email)
            .execute()
        )
        if not result.data:
            return None 
        
        return result.data[0]

    def delete_config(self, name: str, email: str):
        """
        Delete a config row identified by name and email.
        """
        result = (
            self.supabase
            .table('interview_config')
            .delete()
            .eq('name', name)
            .eq('email', email)
            .execute()
        )
        # Returns True if deletion was successful
        return bool(result.data)
