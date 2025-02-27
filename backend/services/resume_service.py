# resume processing
import os
from llm.llm_interface import LLMInterface
from utils.file_utils import extract_text_from_pdf
from llm.llm_utils import generate_prompt, extract_json_from_response
from models.resume_model import ResumeData, EducationHistory, Experience
from langchain_core.messages import HumanMessage

class ResumeService:
    def __init__(self):
        self.llm_interface = LLMInterface()

    def process_resume(self, resume_file) -> ResumeData:
        """
        Processes a resume file and returns the extracted information.

        Args:
            resume_file: A file-like object representing the uploaded resume.

        Returns:
            ResumeData: Extracted information in JSON format.
        """
        try:
            # Extract text from the PDF file
            pdf_text = extract_text_from_pdf(resume_file)
            prompt = generate_prompt(pdf_text)
            response = self.llm_interface.invoke([HumanMessage(content=prompt)])
            extraction_result = extract_json_from_response(response[0].content)
            
            # Ensure the extracted data matches the ResumeData model
            if isinstance(extraction_result, dict):
                # Convert the raw dictionaries to proper model instances
                education_history = [
                    EducationHistory(**edu) for edu in extraction_result.get('education_history', [])
                ]
                experience = [
                    Experience(**exp) for exp in extraction_result.get('experience', [])
                ]
                
                return ResumeData(
                    education_history=education_history,
                    experience=experience
                )
            else:
                raise ValueError("Invalid extraction result format")
        except Exception as e:
            print(f"Error processing resume: {str(e)}")
            raise