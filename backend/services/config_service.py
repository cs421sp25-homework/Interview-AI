from supabase import create_client

from models.config_model import Interview

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
             .eq("interview_name", name)
             .eq("email", email)
             .execute()
         )
         print(f"get_single_config result: {result.data[0]}")
         if not result.data:
             return None
         return result.data[0]

    def get_configs(self, email: str):
        """
        Retrieves all configuration entries associated with the given email.
        """
        result = self.supabase.table('interview_config').select('*').eq('email', email).execute()
        print(f"get_config result: {result.data}")

        if not result.data:
            return None
        return result.data

    def create_config(self, config_data: dict):
        """
        Create a new config row. Does not update if a config with the same (name, email) already exists.
        """
        try:
            config_data.pop('id', None)
            result = (
                self.supabase
                .table('interview_config')
                .insert(config_data)
                .execute()
            )

            if not result.data:
                return None  # Failed to create

            # Return the newly created row ID
            return result.data[0]['id']
    
        except Exception as e:
            print(f"Error creating config: {e}")
            return None

    def update_config(self, id: int, updated_data: dict):
        """
        Update an existing config row identified by id.
        """
        result = (
            self.supabase
            .table('interview_config')
            .update(updated_data)
            .eq('id', id)
            .execute()
        )
        if not result.data:
            return None 
        
        return result.data[0]

    def delete_config(self, id: int):
        """
        Delete a config row identified by id.
        """
        result = (
            self.supabase
            .table('interview_config')
            .delete()
            .eq('id', id)
            .execute()
        )
        # Returns True if deletion was successful
        return bool(result.data)
