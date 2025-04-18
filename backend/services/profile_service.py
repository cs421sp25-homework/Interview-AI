# # CURD operation for profiles
# from supabase import create_client
# from models.profile_model import Profile
# from utils.validation_utils import validate_file



# class ProfileService:
#     def __init__(self, supabase_url, supabase_key):
#         self.supabase = create_client(supabase_url, supabase_key)

#     def get_profile(self, email: str):
#         result = self.supabase.table('profiles').select('*').eq('email', email).execute()
#         if not result.data:
#             return None
#         return Profile(**result.data[0])

#     def update_profile(self, email: str, data: dict):
#         # First check if user exists and get current data
#         check_result = self.supabase.table("profiles").select("*").eq('email', email).execute()
#         if not check_result.data:
#             return None  # User not found

#         # Get the complete current profile
#         current_data = check_result.data[0]

#         # Create update dict with all original fields
#         update_dict = {
#             "id": current_data.get("id"),  # Important: Include the primary key
#             "email": email,  # Use email
#             "password": current_data.get("password", ""),
#             "first_name": data.get("firstName", current_data.get("first_name", "")),
#             "last_name": data.get("lastName", current_data.get("last_name", "")),
#             "phone": data.get("phone", current_data.get("phone", "")),
#             "job_title": data.get("jobTitle", current_data.get("job_title", "")),
#             "experience": current_data.get("experience", ""),
#             "industry": current_data.get("industry", ""),
#             "career_level": current_data.get("career_level", ""),
#             "interview_type": current_data.get("interview_type", ""),
#             "preferred_language": current_data.get("preferred_language", ""),
#             "specialization": current_data.get("specialization", ""),
#             "resume_url": current_data.get("resume_url", ""),
#             "key_skills": data.get("keySkills", current_data.get("key_skills", "")),
#             "about": data.get("about", current_data.get("about", "")),
#             "linkedin_url": data.get("linkedinUrl", current_data.get("linkedin_url", "")),
#             "github_url": data.get("githubUrl", current_data.get("github_url", "")),
#             "portfolio_url": data.get("portfolioUrl", current_data.get("portfolio_url", "")),
#             "photo_url": data.get("photo_url", current_data.get("photo_url", "")),
#             "preferred_role": current_data.get("preferred_role", ""),
#             "expectations": current_data.get("expectations", ""),
#             "resume_summary": current_data.get("resume_summary", ""),
#             "education_history": data.get("education_history", current_data.get("education_history", [])),
#             "resume_experience": data.get("resume_experience", current_data.get("resume_experience", []))
#         }

#         # Use upsert to update the record
#         result = self.supabase.table("profiles").upsert(update_dict).execute()
#         if not result.data:
#             return None  # Failed to update record

#         # Get the latest data after update
#         updated_result = self.supabase.table("profiles").select("*").eq('email', email).execute()
#         if not updated_result.data:
#             return None  # Failed to retrieve updated data
        

#         return updated_result.data[0]  # Return updated profile data
    
#     def create_profile(self, profile_data: dict) -> dict:
#         """
#         Creates a new user profile in the database.
#         """
#         try:
#             # Convert resume data to ResumeData object if it exists
#             if 'resume' in profile_data and isinstance(profile_data['resume'], dict):
#                 from models.resume_model import ResumeData
#                 profile_data['resume'] = ResumeData(**profile_data['resume'])
            
#             # Create Profile object
#             profile = self.map_profile_data(profile_data)
            
#             # Insert into database
#             result = self.supabase.table('profiles').insert(profile.model_dump()).execute()
            
#             try:
#                 auth_data = {"email": profile.email, "password": profile.password}
#                 sign_up_result = self.supabase.auth.sign_up(auth_data)
#             except Exception as auth_error:
#                 print(f"Supabase Auth sign up error: {str(auth_error)}")
            
#             if result and result.data:
#                 return {"success": True, "data": result.data[0] if result.data else {}}
            
#             return {"success": True, "message": "Profile created"}
#         except Exception as e:
#             raise


#     def create_oauth_profile(self, profile_data: dict) -> dict:
#         """
#         Creates a new user profile in the database.
#         """
#         try:
#             # Convert resume data to ResumeData object if it exists
#             if 'resume' in profile_data and isinstance(profile_data['resume'], dict):
#                 from models.resume_model import ResumeData
#                 profile_data['resume'] = ResumeData(**profile_data['resume'])
            
#             # Create Profile object
#             profile = self.map_profile_data(profile_data)
            
#             print(f"OAuth: Attempting to insert profile into database for email: {profile.email}")
#             # Insert into database
#             result = self.supabase.table('profiles').insert(profile.model_dump()).execute()
#             print(f"OAuth: Database insertion result: {result}")
            
#             if result and result.data:
#                 return {"success": True, "data": result.data[0] if result.data else {}}
            
#             return {"success": True, "message": "Profile created"}
#         except Exception as e:
#             import traceback
#             print(f"Traceback: {traceback.format_exc()}")
#             raise

#     def map_profile_data(self, profile_data: dict) -> Profile:
#         """
#         Maps the input profile_data dictionary with camelCase keys to a Profile instance with snake_case fields.
#         """
#         try:
#             # Directly retrieve the resume field; assuming it's already a ResumeData object if provided.
#             resume = profile_data.get('resume')
            
#             from datetime import datetime
            

#             if not profile_data.get('username'):
#                 username = profile_data.get('email', 'default_user').split('@')[0]
#             else:
#                 username = profile_data['username']
                
#             if not profile_data.get('password'):
#                 import secrets
#                 password = secrets.token_urlsafe(16)  
#             else:
#                 password = profile_data['password']
                
#             first_name = profile_data.get('firstName', profile_data.get('first_name', ''))
#             last_name = profile_data.get('lastName', profile_data.get('last_name', ''))
            
#             if not first_name and not last_name:
#                 first_name = username 
                
#             return Profile(
#                 created_at=profile_data.get('created_at') or datetime.now().isoformat(),
#                 username=username,
#                 password=password,
#                 firstName=first_name,
#                 lastName=last_name,
#                 first_name=first_name,
#                 last_name=last_name,
#                 email=profile_data['email'],
#                 phone=profile_data.get('phone') or None,
#                 job_title=profile_data.get('jobTitle') or None,
#                 experience=profile_data.get('experience') or None,
#                 industry=profile_data.get('industry') or None,
#                 career_level=profile_data.get('careerLevel') or None,
#                 interview_type=profile_data.get('interviewType') or None,
#                 preferred_language=profile_data.get('preferredLanguage') or None,
#                 specialization=profile_data.get('specialization') or None,
#                 resume_url=profile_data.get('resume_url') or None,
#                 portfolio_url=profile_data.get('portfolioUrl') or None,
#                 linkedin_url=profile_data.get('linkedinUrl') or None,
#                 github_url=profile_data.get('githubUrl') or None,
#                 key_skills=profile_data.get('keySkills') or None,
#                 preferred_role=profile_data.get('preferredRole') or None,
#                 expectations=profile_data.get('expectations') or None,
#                 resume=resume,
#             )
#         except Exception as e:
#             import traceback
#             print(f"Traceback: {traceback.format_exc()}")
#             raise


from __future__ import annotations

import logging
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from supabase import create_client, Client
from supabase.lib.exceptions import SupabaseException

from models.profile_model import Profile
from utils.validation_utils import validate_file  # noqa: F401  (import kept: might be called elsewhere)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ProfileServiceError(Exception):
    """
    Raised on any failure inside ProfileService.

    Attributes
    ----------
    message : str
        Human‑readable error (safe to show to callers / REST clients).
    status_code : int
        Suitable HTTP status code for Flask handlers.
    detail : str | None
        Low‑level diagnostics (only log in production).
    """

    def __init__(self, message: str, *, status_code: int = 500, detail: str | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail


class ProfileService:
    """
    CRUD helper for the `profiles` table.  All catastrophic failures raise
    `ProfileServiceError`; caller code can trap it or rely on a global error‑handler.
    """

    def __init__(self, supabase_url: str, supabase_key: str) -> None:
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        except Exception as exc:
            raise ProfileServiceError(
                "Failed to connect to the user profile database.",
                detail=str(exc),
            ) from exc

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _first(rowset: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        return rowset[0] if rowset else None

    # ------------------------------------------------------------------ #
    # Read
    # ------------------------------------------------------------------ #
    def get_profile(self, email: str) -> Optional[Profile]:
        """
        Return a `Profile` for `email` or `None` if not found.
        """
        try:
            rsp = self.supabase.table("profiles").select("*").eq("email", email).execute()
            row = self._first(rsp.data)
            logger.info("get_profile(%s) → %s", email, bool(row))
            return Profile(**row) if row else None
        except SupabaseException as exc:
            raise ProfileServiceError(
                "Database error while retrieving profile.",
                status_code=502,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            raise ProfileServiceError("Unexpected error retrieving profile.", detail=str(exc)) from exc

    # ------------------------------------------------------------------ #
    # Update
    # ------------------------------------------------------------------ #
    def update_profile(self, email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge `payload` into the existing profile row identified by `email`.
        Returns the **updated row** as a dict.

        Raises
        ------
        ProfileServiceError
            • 404 if profile does not exist  
            • 400 on validation errors  
            • 5xx on unexpected/db failures
        """
        try:
            current_rsp = self.supabase.table("profiles").select("*").eq("email", email).execute()
            current = self._first(current_rsp.data)
            if not current:
                raise ProfileServiceError(f"Profile for {email} not found.", status_code=404)

            # Build the upsert payload (retain original values if not present in `payload`)
            updated: Dict[str, Any] = {
                "id": current["id"],
                "email": email,
                "password": current.get("password", ""),
                "first_name": payload.get("firstName", current.get("first_name", "")),
                "last_name": payload.get("lastName", current.get("last_name", "")),
                "phone": payload.get("phone", current.get("phone", "")),
                "job_title": payload.get("jobTitle", current.get("job_title", "")),
                "experience": current.get("experience", ""),
                "industry": current.get("industry", ""),
                "career_level": current.get("career_level", ""),
                "interview_type": current.get("interview_type", ""),
                "preferred_language": current.get("preferred_language", ""),
                "specialization": current.get("specialization", ""),
                "resume_url": current.get("resume_url", ""),
                "key_skills": payload.get("keySkills", current.get("key_skills", "")),
                "about": payload.get("about", current.get("about", "")),
                "linkedin_url": payload.get("linkedinUrl", current.get("linkedin_url", "")),
                "github_url": payload.get("githubUrl", current.get("github_url", "")),
                "portfolio_url": payload.get("portfolioUrl", current.get("portfolio_url", "")),
                "photo_url": payload.get("photo_url", current.get("photo_url", "")),
                "preferred_role": current.get("preferred_role", ""),
                "expectations": current.get("expectations", ""),
                "resume_summary": current.get("resume_summary", ""),
                "education_history": payload.get(
                    "education_history", current.get("education_history", [])
                ),
                "resume_experience": payload.get(
                    "resume_experience", current.get("resume_experience", [])
                ),
            }

            upsert_rsp = self.supabase.table("profiles").upsert(updated).execute()
            if not upsert_rsp.data:
                raise ProfileServiceError("Failed to update profile.", status_code=500)

            latest = self._first(
                self.supabase.table("profiles").select("*").eq("email", email).execute().data
            )
            logger.info("update_profile(%s) successful", email)
            return latest
        except ProfileServiceError:
            raise  # already perfect
        except SupabaseException as exc:
            raise ProfileServiceError(
                "Database error while updating profile.", status_code=502, detail=str(exc)
            ) from exc
        except Exception as exc:
            raise ProfileServiceError("Unexpected error updating profile.", detail=str(exc)) from exc

    # ------------------------------------------------------------------ #
    # Create
    # ------------------------------------------------------------------ #
    def create_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a brand‑new profile **and** create a Supabase Auth user.

        Returns `{"success": True, "data": <row-dict>}` on success.
        """
        try:
            prepared = self._map_profile_data(profile_data)
            insert_rsp = self.supabase.table("profiles").insert(prepared.model_dump()).execute()

            # Sign‑up to Supabase Auth (best‑effort; failures reported but profile row is kept)
            try:
                self.supabase.auth.sign_up({"email": prepared.email, "password": prepared.password})
            except Exception as auth_err:  # noqa: BLE001
                logger.warning("Supabase Auth sign‑up error for %s → %s", prepared.email, auth_err)

            row = self._first(insert_rsp.data)
            if not row:
                raise ProfileServiceError("Profile insert returned no data.", status_code=500)

            logger.info("create_profile(%s) OK", prepared.email)
            return {"success": True, "data": row}
        except ProfileServiceError:
            raise
        except SupabaseException as exc:
            raise ProfileServiceError(
                "Database error while creating profile.",
                status_code=502,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            raise ProfileServiceError("Unexpected error creating profile.", detail=str(exc)) from exc

    def create_oauth_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Same as `create_profile` but skips Supabase Auth sign‑up (handled by OAuth flow).
        """
        try:
            prepared = self._map_profile_data(profile_data)
            logger.info("OAuth create_profile for %s", prepared.email)
            insert_rsp = self.supabase.table("profiles").insert(prepared.model_dump()).execute()
            row = self._first(insert_rsp.data)
            if not row:
                raise ProfileServiceError("Profile insert returned no data.", status_code=500)
            return {"success": True, "data": row}
        except ProfileServiceError:
            raise
        except SupabaseException as exc:
            raise ProfileServiceError(
                "Database error while creating OAuth profile.",
                status_code=502,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            raise ProfileServiceError("Unexpected error creating OAuth profile.", detail=str(exc)) from exc

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _map_profile_data(self, data: Dict[str, Any]) -> Profile:
        """
        Convert camelCase dict into a validated `Profile` model
        (snake_case fields + sensible defaults).
        """
        try:
            # Convert nested resume dict (if present) to the pydantic model that Profile expects.
            if isinstance(data.get("resume"), dict):
                from models.resume_model import ResumeData  # local import avoids circular deps
                data["resume"] = ResumeData(**data["resume"])

            username = data.get("username") or data.get("email", "user").split("@")[0]
            password = data.get("password") or secrets.token_urlsafe(16)
            first_name = data.get("firstName") or data.get("first_name") or username
            last_name = data.get("lastName") or data.get("last_name") or ""

            profile = Profile(
                created_at=data.get("created_at") or datetime.utcnow().isoformat(),
                username=username,
                password=password,
                firstName=first_name,
                lastName=last_name,
                first_name=first_name,
                last_name=last_name,
                email=data["email"],
                phone=data.get("phone"),
                job_title=data.get("jobTitle"),
                experience=data.get("experience"),
                industry=data.get("industry"),
                career_level=data.get("careerLevel"),
                interview_type=data.get("interviewType"),
                preferred_language=data.get("preferredLanguage"),
                specialization=data.get("specialization"),
                resume_url=data.get("resume_url"),
                portfolio_url=data.get("portfolioUrl"),
                linkedin_url=data.get("linkedinUrl"),
                github_url=data.get("githubUrl"),
                key_skills=data.get("keySkills"),
                preferred_role=data.get("preferredRole"),
                expectations=data.get("expectations"),
                resume=data.get("resume"),
            )
            return profile
        except Exception as exc:
            raise ProfileServiceError("Invalid profile data provided.", status_code=400, detail=str(exc)) from exc
