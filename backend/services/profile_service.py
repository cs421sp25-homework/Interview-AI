# CURD operation for profiles
from supabase import create_client
from models.profile_model import Profile
from utils.validation_utils import validate_file



class ProfileService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

    def get_profile(self, username: str):
        result = self.supabase.table('profiles').select('*').eq('username', username).execute()
        print(f"test")
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
            education_history=profile_data.get('education_history') or None,
            resume_experience=profile_data.get('resume_experience') or None
        )
