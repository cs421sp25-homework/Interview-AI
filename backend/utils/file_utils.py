# util function for processing files, including downloading pdf, extract text from pdf etc.
from io import BytesIO
from PyPDF2 import PdfReader
import requests
from tempfile import NamedTemporaryFile
from langchain_community.document_loaders import PyPDFLoader

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

def extract_text_from_pdf_url(pdf_file_path: str) -> str:
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

def extract_text_from_pdf(file):
    """
    Extracts text from a PDF file-like object.

    Args:
        file: A file-like object representing the PDF.

    Returns:
        str: Extracted text from the PDF.
    """
    # Read the file into a BytesIO object
    file_bytes = file.read()
    file.seek(0)  # Reset file pointer after reading

    # Use PyPDF2 to extract text
    pdf_reader = PdfReader(BytesIO(file_bytes))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()

    if not text:
        raise ValueError("No text could be extracted from the PDF.")

    return text