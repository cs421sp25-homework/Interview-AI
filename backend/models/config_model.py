from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class Interview(BaseModel):
    id: int
    created_at: datetime
    email: str
    job_description: str
    question_type: Literal["behavioral", "technical"]
    company_name: str
    interview_type: Literal["voice", "text"]
    name: str
