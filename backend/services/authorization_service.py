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
        return len(response.data) > 0

    def get_user_from_session(self, session_id):
        """Get user information from a session ID"""
        try:
            # Use Supabase to get user from session
            result = self.supabase.auth.get_user(session_id)
            return result.user if result else None
        except Exception as e:
            print(f"Error getting user from session: {str(e)}")
            return None

    def get_current_user(self):
        """Get the current authenticated user"""
        try:
            # Get the current session first
            session_response = self.supabase.auth.get_session()
            
            # Check if we have a valid session
            if session_response.session is None:
                print("No active session found")
                return None
            
            # Get user from the session
            user_response = self.supabase.auth.get_user(session_response.session.access_token)
            
            if user_response and hasattr(user_response, 'user'):
                return user_response.user
            return None
        except Exception as e:
            print(f"Error getting current user: {str(e)}")
            return None

    def get_user_from_token(self, access_token):
        """Get user information from an access token"""
        try:
            # Use the token to get user info
            user_response = self.supabase.auth.get_user(access_token)
            return user_response.user if user_response else None
        except Exception as e:
            print(f"Error getting user from token: {str(e)}")
            return None