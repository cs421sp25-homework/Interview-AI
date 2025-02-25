import unittest
import os
import requests

class TestResumeProcessing(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api/parse-resume"

    def test_parse_resume(self):
        """
        Test the resume parsing endpoint with a valid resume file.
        """
        # Path to a sample resume file
        resume_path = os.path.join(os.path.dirname(__file__), "sample_resume.pdf")

        # Ensure the sample resume file exists
        self.assertTrue(os.path.exists(resume_path), "Sample resume file not found.")

        with open(resume_path, "rb") as resume_file:
            files = {
                "resume": ("sample_resume.pdf", resume_file, "application/pdf")
            }
            # Send POST request
            response = requests.post(self.BASE_URL, files=files)

        # Check response status code
        self.assertEqual(response.status_code, 200, "Resume parsing failed.")

        # Check response data
        response_data = response.json()
        self.assertIn("resume", response_data, "Response missing 'resume_url' field.")

    def test_parse_resume_without_file(self):
        """
        Test the resume parsing endpoint without a resume file.
        """
        # Send POST request without a file
        response = requests.post(self.BASE_URL)

        # Check response status code
        self.assertEqual(response.status_code, 400, "Expected 400 for missing resume.")

        # Check error message
        response_data = response.json()
        self.assertIn("error", response_data, "Response missing 'error' field.")
        self.assertEqual(response_data["error"], "Resume is required", "Unexpected error message.")

if __name__ == '__main__':
    unittest.main()