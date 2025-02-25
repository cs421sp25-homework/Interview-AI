import os
import json
import re
import requests
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Load environment variables
load_dotenv()

# Constants
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env file.")

os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY


def download_pdf(pdf_url: str) -> str:
    """
    Downloads a PDF from a given URL and saves it as a temporary file.

    Args:
        pdf_url (str): URL of the PDF file to download.

    Returns:
        str: Path to the downloaded temporary PDF file.
    """
    response = requests.get(pdf_url, stream=True)
    if response.status_code != 200:
        raise ValueError(f"Error: Unable to download the PDF. Status Code: {response.status_code}")

    temp_pdf = NamedTemporaryFile(delete=False, suffix=".pdf")
    with open(temp_pdf.name, "wb") as f:
        f.write(response.content)

    return temp_pdf.name


def extract_text_from_pdf(pdf_file_path: str) -> str:
    """
    Extracts text from a PDF file using PyPDFLoader.

    Args:
        pdf_file_path (str): Path to the PDF file.

    Returns:
        str: Extracted text from the PDF.
    """
    loader = PyPDFLoader(pdf_file_path)
    pages = list(loader.lazy_load())

    if len(pages) != 1:
        raise ValueError(f"Error: The provided PDF contains {len(pages)} pages. Please upload a single-page resume.")

    return pages[0].page_content


def generate_prompt(pdf_text: str) -> str:
    """
    Generates a prompt for the LLM to extract structured data from the resume text.

    Args:
        pdf_text (str): Text extracted from the PDF.

    Returns:
        str: Prompt for the LLM.
    """
    return f"""
    You are an expert resume parser. Given the following text extracted from a PDF resume, extract the candidate's education history and activities/internship experiences.

    For each education entry, extract:
      - institution
      - degree or field of study
      - dates (start-end)
      - location
      - description (any relevant details)

    For each activity or internship, extract:
      - title
      - organization
      - dates (start-end)
      - location
      - description

    Return the result as a **strictly valid JSON** object with the following structure and nothing else:
    {{
      "education_history": [
        {{
          "institution": "...",
          "degree": "...",
          "dates": "...",
          "location": "...",
          "description": "..."
        }}
      ],
      "experience": [
        {{
          "title": "...",
          "organization": "...",
          "dates": "...",
          "location": "...",
          "description": "..."
        }}
      ]
    }}

    If some details are missing, use null or an empty string for their values.

    Here is the extracted text:

    {pdf_text}
    """


def extract_json_from_response(response_content: str) -> dict:
    """
    Extracts JSON from the LLM's response.

    Args:
        response_content (str): Response content from the LLM.

    Returns:
        dict: Extracted JSON data.
    """
    match = re.search(r'(\{.*\})', response_content, re.DOTALL)
    if not match:
        raise ValueError("Could not extract JSON from the LLM's response.")

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        raise ValueError("Failed to parse JSON from the model's response.")


def process_resume(pdf_url: str) -> dict:
    """
    Processes a resume PDF and returns the extracted information.

    Args:
        pdf_url (str): URL of the PDF file to process.

    Returns:
        dict: Extracted information in JSON format.
    """
    # Download the PDF
    pdf_file_path = download_pdf(pdf_url)

    try:
        # Extract text from the PDF
        pdf_text = extract_text_from_pdf(pdf_file_path)

        # Generate the prompt for the LLM
        prompt = generate_prompt(pdf_text)

        # Call the LLM to extract structured data
        llm = ChatOpenAI(model_name="gpt-4", temperature=0.7)
        message = HumanMessage(content=prompt)
        response = llm.invoke([message])

        # Extract JSON from the response
        extraction_result = extract_json_from_response(response.content)

        return extraction_result

    finally:
        # Clean up the temporary file
        if os.path.exists(pdf_file_path):
            os.remove(pdf_file_path)


if __name__ == '__main__':
    # Example usage
    pdf_url = "https://example.com/resume.pdf"  # Replace with a valid URL
    result = process_resume(pdf_url)
    print(json.dumps(result, indent=2))