from supabase import create_client

class ConfigService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def get_config(self, config_id: int):
        """
        Retrieves a configuration entry by ID.
        """
        result = self.supabase.table('config').select('*').eq('id', config_id).execute()
        if not result.data:
            return None
        return result.data[0]  

    def update_config(self, config_id: int, data: dict):
        """
        Updates a configuration entry while keeping existing fields intact.
        """
        # Fetch the current config entry
        check_result = self.supabase.table("config").select("*").eq('id', config_id).execute()
        if not check_result.data:
            return None 

        current_data = check_result.data[0]

        print(f"current_data: {current_data}")

        
        update_dict = {
            "id": config_id,  
            "created_at": current_data.get("created_at"), 
            "email": data.get("email", current_data.get("email")),
            "job_description": data.get("job_description", current_data.get("job_description")),
            "question_type": data.get("question_type", current_data.get("question_type")),
            "company_name": data.get("company_name", current_data.get("company_name")),
            "interview_type": data.get("interview_type", current_data.get("interview_type")),
            "name": data.get("name", current_data.get("name")),
        }

        
        result = self.supabase.table("config").upsert(update_dict).execute()
        if not result.data:
            return None  # Failed update

        
        updated_result = self.supabase.table("config").select("*").eq('id', config_id).execute()
        if not updated_result.data:
            return None

        print(f"updated_result: {updated_result.data[0]}")

        return updated_result.data[0]  # Return updated config data

    def create_config(self, config_data: dict):
        """
        Creates a new configuration entry in the database.
        """
        try:
            # Prepare the config data
            config_entry = self.map_config_data(config_data)

            # Insert into the database
            result = self.supabase.table('config').insert(config_entry).execute()

            if not result.data:
                return None  # Failed insert

            return result.data[0]  # Return created config entry
        except Exception as e:
            print(f"Error creating config entry: {str(e)}")
            raise

    def map_config_data(self, config_data: dict) -> dict:
        """
        Maps incoming configuration data to match the database column names.
        """
        return {
            "email": config_data.get("email"),
            "job_description": config_data.get("job_description"),
            "question_type": config_data.get("question_type"),
            "company_name": config_data.get("company_name"),
            "interview_type": config_data.get("interview_type"),
            "name": config_data.get("name"),
        }
