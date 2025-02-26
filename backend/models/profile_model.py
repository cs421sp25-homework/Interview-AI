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
    phone: str
    job_title: str
    experience: str
    industry: str
    career_level: str
    interview_type: str
    preferred_language: str
    specialization: str
    resume_url: str
    portfolio_url: str
    linkedin_url: str
    github_url: str
    key_skills: str
    preferred_role: str
    expectations: str
    resume: ResumeData