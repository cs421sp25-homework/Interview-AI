# model for resume, including Education and Experience
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

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert nested models to dictionaries
        data['education_history'] = [edu.model_dump() for edu in self.education_history]
        data['experience'] = [exp.model_dump() for exp in self.experience]
        return data