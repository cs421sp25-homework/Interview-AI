import os
from llm.llm_interface import LLMInterface
from utils.file_utils import extract_text_from_pdf
from llm.llm_utils import generate_prompt, extract_json_from_response
from models.resume_model import ResumeData
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
            return ResumeData(**extraction_result)
        except Exception as e:
            print(f"Error processing resume: {str(e)}")
            raise