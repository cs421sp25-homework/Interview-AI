# The model for profile data, including basic user info and a ResumeData
from pydantic import BaseModel
from typing import List, Optional
from models.resume_model import ResumeData, EducationHistory, Experience

class Profile(BaseModel):
    username: str 
    password: str
    first_name: str | None = None
    last_name: str | None = None
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
    education_history: List[dict] | None = None
    resume_experience: List[dict] | None = None
    resume: ResumeData | None = None
    photo_url: str | None = None

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        if self.resume:
            resume_data = self.resume.model_dump()
            if not data.get('education_history'):
                data['education_history'] = resume_data.get('education_history', [])
            if not data.get('resume_experience'):
                data['resume_experience'] = resume_data.get('experience', [])
        return data
