from supabase import create_client

class AuthorizationService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def check_user_exists(self, username: str):
        result = self.supabase.table('profiles').select('*').eq('username', username).execute()
        return len(result.data) > 0
    
    def check_email_exists(self, email: str):
        result = self.supabase.table('profiles').select('*').eq('email', email).execute()
        return len(result.data) > 0
    
    def check_user_login(self, email: str, password: str):
        if not self.check_email_exists(email):
            return False
        
        print(f"email: {email}, password: {password}")
        response = self.supabase.table('profiles').select('*').eq('email', email).eq('password', password).execute()
        print(f"response: {response}")
        return response is not None