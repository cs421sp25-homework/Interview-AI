# CURD operation for profiles
from supabase import create_client
from models.profile_model import Profile
from utils.validation_utils import validate_file



class ProfileService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def get_profile(self, email: str):
        result = self.supabase.table('profiles').select('*').eq('email', email).execute()
        if not result.data:
            return None
        return Profile(**result.data[0])

    def update_profile(self, email: str, data: dict):
        # First check if user exists and get current data
        check_result = self.supabase.table("profiles").select("*").eq('email', email).execute()
        if not check_result.data:
            return None  # User not found

        # Get the complete current profile
        current_data = check_result.data[0]

        print(f"current_data: {current_data}")

        # Create update dict with all original fields
        update_dict = {
            "id": current_data.get("id"),  # Important: Include the primary key
            "email": email,  # Use email
            "password": current_data.get("password", ""),
            "first_name": data.get("firstName", current_data.get("first_name", "")),
            "last_name": data.get("lastName", current_data.get("last_name", "")),
            "phone": data.get("phone", current_data.get("phone", "")),
            "job_title": data.get("jobTitle", current_data.get("job_title", "")),
            "experience": current_data.get("experience", ""),
            "industry": current_data.get("industry", ""),
            "career_level": current_data.get("career_level", ""),
            "interview_type": current_data.get("interview_type", ""),
            "preferred_language": current_data.get("preferred_language", ""),
            "specialization": current_data.get("specialization", ""),
            "resume_url": current_data.get("resume_url", ""),
            "key_skills": data.get("keySkills", current_data.get("key_skills", "")),
            "about": data.get("about", current_data.get("about", "")),
            "linkedin_url": data.get("linkedinUrl", current_data.get("linkedin_url", "")),
            "github_url": data.get("githubUrl", current_data.get("github_url", "")),
            "portfolio_url": data.get("portfolioUrl", current_data.get("portfolio_url", "")),
            "photo_url": data.get("photo_url", current_data.get("photo_url", "")),
            "preferred_role": current_data.get("preferred_role", ""),
            "expectations": current_data.get("expectations", ""),
            "resume_summary": current_data.get("resume_summary", ""),
            "education_history": data.get("education_history", current_data.get("education_history", [])),
            "resume_experience": data.get("resume_experience", current_data.get("resume_experience", []))
        }

        # Use upsert to update the record
        result = self.supabase.table("profiles").upsert(update_dict).execute()
        if not result.data:
            return None  # Failed to update record

        # Get the latest data after update
        updated_result = self.supabase.table("profiles").select("*").eq('email', email).execute()
        if not updated_result.data:
            return None  # Failed to retrieve updated data
        
        print(f"updated_result: {updated_result.data[0]}")

        return updated_result.data[0]  # Return updated profile data
    
    def create_profile(self, profile_data: dict) -> dict:
        """
        Creates a new user profile in the database.
        """
        try:
            # Convert resume data to ResumeData object if it exists
            if 'resume' in profile_data and isinstance(profile_data['resume'], dict):
                from models.resume_model import ResumeData
                profile_data['resume'] = ResumeData(**profile_data['resume'])
            
            # Create Profile object

            profile = self.map_profile_data(profile_data)
            # Insert into database
            result = self.supabase.table('profiles').insert(profile.model_dump()).execute()
            signUpResult = self.supabase.auth.sign_up({"email": profile.email, "password":profile.password})
            
            return
        except Exception as e:
            print(f"Error creating profile: {str(e)}")
            raise

    def map_profile_data(self, profile_data: dict) -> Profile:
        """
        Maps the input profile_data dictionary with camelCase keys to a Profile instance with snake_case fields.
        """
        # Directly retrieve the resume field; assuming it's already a ResumeData object if provided.
        resume = profile_data.get('resume')
        
        return Profile(
            username=profile_data['username'],
            password=profile_data['password'],
            firstName=profile_data['firstName'],
            lastName=profile_data['lastName'],
            first_name=profile_data['firstName'],
            last_name=profile_data['lastName'],
            email=profile_data['email'],
            phone=profile_data.get('phone') or None,
            job_title=profile_data.get('jobTitle') or None,
            experience=profile_data.get('experience') or None,
            industry=profile_data.get('industry') or None,
            career_level=profile_data.get('careerLevel') or None,
            interview_type=profile_data.get('interviewType') or None,
            preferred_language=profile_data.get('preferredLanguage') or None,
            specialization=profile_data.get('specialization') or None,
            resume_url=profile_data.get('resume_url') or None,
            portfolio_url=profile_data.get('portfolioUrl') or None,
            linkedin_url=profile_data.get('linkedinUrl') or None,
            github_url=profile_data.get('githubUrl') or None,
            key_skills=profile_data.get('keySkills') or None,
            preferred_role=profile_data.get('preferredRole') or None,
            expectations=profile_data.get('expectations') or None,
            resume=resume,
        )
