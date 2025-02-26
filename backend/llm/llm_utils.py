import re
import json

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