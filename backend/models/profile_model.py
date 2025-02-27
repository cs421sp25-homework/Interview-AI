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