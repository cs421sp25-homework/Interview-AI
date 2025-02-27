# The mode for profile data, including basic user info and a ResumeData
from pydantic import BaseModel
from typing import List, Optional
from models.resume_model import ResumeData

class Profile(BaseModel):
    username: str 
    password: str
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    job_title: str | None = None
    experience: str | None = None
    industry: str | None = None
    career_level: str | None = None
    interview_type: str | None = None
    preferred_language: str | None = None
    specialization: str | None = None
    resume_url: str | None = None
    portfolio_url: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    key_skills: str | None = None
    preferred_role: str | None = None
    expectations: str | None = None
    resume: ResumeData | None = None
    education_history: List[dict] | None = None
    resume_experience: List[dict] | None = None

def fix_profile_model():
    # Add this debug code to check if the model is correctly handling the fields
    from models.profile_model import Profile
    
    # Create a test profile with education_history and resume_experience
    test_profile = Profile(
        username="test",
        password="test",
        first_name="Test",
        last_name="User",
        email="test@example.com",
        education_history=[{"institution": "Test University", "degree": "Test Degree", "dates": "2020-2022", "location": "Test Location", "description": "Test Description"}],
        resume_experience=[{"title": "Test Job", "organization": "Test Company", "dates": "2020-2022", "location": "Test Location", "description": "Test Description"}]
    )
    
    # Print the model dump
    print("Test profile dump:", test_profile.model_dump())