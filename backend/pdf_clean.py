import os
import json
import re
import requests
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env file.")

os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

def download_pdf(pdf_url):
    """Downloads a PDF from a given URL and saves it as a temporary file."""
    response = requests.get(pdf_url, stream=True)

    if response.status_code != 200:
        raise ValueError(f"Error: Unable to download the PDF. Status Code: {response.status_code}")

    temp_pdf = NamedTemporaryFile(delete=False, suffix=".pdf")
    with open(temp_pdf.name, "wb") as f:
        f.write(response.content)

    return temp_pdf.name


pdf_url = "filepath"

# Download the PDF
pdf_file_path = download_pdf(pdf_url)

loader = PyPDFLoader(pdf_file_path)
pages = list(loader.lazy_load())

if len(pages) != 1:
    raise ValueError(f"Error: The provided PDF contains {len(pages)} pages. Please upload a single-page resume.")

pdf_text = pages[0].page_content



prompt_template = f"""
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
  "activities": [
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


from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.7)
message = HumanMessage(content=prompt_template)
response = llm.invoke([message])


print("Raw LLM response:")
print(response.content)

def extract_json(text: str):
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
    return None

json_str = extract_json(response.content)
if not json_str:
    raise ValueError("Could not extract JSON from the LLM's response.")

try:
    extraction_result = json.loads(json_str)
except json.JSONDecodeError:
    extraction_result = {"error": "Failed to parse JSON from the model's response."}

print(json.dumps(extraction_result, indent=2))
