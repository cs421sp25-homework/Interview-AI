from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise ValueError("Missing OPENAI_API_KEY in .env file.")

    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY