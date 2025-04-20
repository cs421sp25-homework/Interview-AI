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

# from __future__ import annotations

# import logging
# from typing import Any

# from supabase import create_client, Client
# from supabase.lib.exceptions import SupabaseException

# logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)


# class AuthorizationServiceError(Exception):
#     """
#     Raised on any auth‑related failure.

#     Attributes
#     ----------
#     message : str           – human‑friendly error (safe to show outside).
#     status_code : int       – suggested HTTP status code for Flask handlers.
#     detail : str | None     – low‑level diagnostic (only logged in prod).
#     """

#     def __init__(self, message: str, *, status_code: int = 500, detail: str | None = None):
#         super().__init__(message)
#         self.message = message
#         self.status_code = status_code
#         self.detail = detail


# class AuthorizationService:
#     """
#     Lightweight helper around Supabase auth & profile checks.
#     """

#     def __init__(self, supabase_url: str, supabase_key: str) -> None:
#         try:
#             self.supabase: Client = create_client(supabase_url, supabase_key)
#         except Exception as exc:
#             raise AuthorizationServiceError(
#                 "Cannot initialise authorization service.",
#                 detail=str(exc),
#             ) from exc

#     # ------------------------------------------------------------------ #
#     # Simple existence checks
#     # ------------------------------------------------------------------ #
#     def check_user_exists(self, username: str) -> bool:
#         try:
#             rsp = self.supabase.table("profiles").select("*").eq("username", username).execute()
#             exists = bool(rsp.data)
#             logger.info("check_user_exists(%s) → %s", username, exists)
#             return exists
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error while checking username.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError("Unexpected error checking username.", detail=str(exc)) from exc

#     def check_email_exists(self, email: str) -> bool:
#         try:
#             rsp = self.supabase.table("profiles").select("*").eq("email", email).execute()
#             exists = bool(rsp.data)
#             logger.info("check_email_exists(%s) → %s", email, exists)
#             return exists
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error while checking email.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError("Unexpected error checking email.", detail=str(exc)) from exc

#     # ------------------------------------------------------------------ #
#     # Login verification
#     # ------------------------------------------------------------------ #
#     def check_user_login(self, email: str, password: str) -> bool:
#         """
#         Verify (email, password) against the `profiles` table.
#         Returns **True** if credentials match, **False** otherwise.
#         """
#         try:
#             if not self.check_email_exists(email):
#                 return False

#             rsp = (
#                 self.supabase.table("profiles")
#                 .select("*")
#                 .eq("email", email)
#                 .eq("password", password)
#                 .execute()
#             )
#             ok = bool(rsp.data)
#             logger.info("check_user_login(%s) → %s", email, ok)
#             return ok
#         except AuthorizationServiceError:
#             raise  # bubbled from check_email_exists
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error while verifying credentials.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError("Unexpected error during login.", detail=str(exc)) from exc

#     # ------------------------------------------------------------------ #
#     # Session / token helpers
#     # ------------------------------------------------------------------ #
#     def get_user_from_session(self, session_id: str) -> Any | None:
#         """
#         Resolve a Supabase session‑ID to a user object, or None if unknown.
#         """
#         try:
#             rsp = self.supabase.auth.get_user(session_id)
#             return rsp.user if rsp else None
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error while retrieving user from session.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError(
#                 "Unexpected error retrieving user from session.", detail=str(exc)
#             ) from exc

#     def get_current_user(self) -> Any | None:
#         """
#         Return the currently authenticated user, or None if no active session.
#         """
#         try:
#             sess_rsp = self.supabase.auth.get_session()
#             if not sess_rsp.session:
#                 logger.info("get_current_user → no active session")
#                 return None

#             user_rsp = self.supabase.auth.get_user(sess_rsp.session.access_token)
#             user = user_rsp.user if user_rsp and hasattr(user_rsp, "user") else None
#             logger.info("get_current_user → %s", bool(user))
#             return user
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error retrieving current user.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError("Unexpected error retrieving current user.", detail=str(exc)) from exc

#     def get_user_from_token(self, access_token: str) -> Any | None:
#         """
#         Return user info for an OAuth / access‑token, or None if invalid.
#         """
#         try:
#             user_rsp = self.supabase.auth.get_user(access_token)
#             return user_rsp.user if user_rsp else None
#         except SupabaseException as exc:
#             raise AuthorizationServiceError(
#                 "Database error retrieving user from token.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise AuthorizationServiceError("Unexpected error retrieving user from token.", detail=str(exc)) from exc
