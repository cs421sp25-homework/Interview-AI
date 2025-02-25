from pydantic import BaseModel
from typing import List, Optional

class EducationHistory(BaseModel):
    institution: str
    degree: str
    dates: str
    location: str
    description: str

class Experience(BaseModel):
    title: str
    organization: str
    dates: str
    location: str
    description: str

class ResumeData(BaseModel):
    education_history: List[EducationHistory]
    experience: List[Experience]