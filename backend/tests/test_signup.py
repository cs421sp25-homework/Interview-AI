import unittest
import os
import requests

class TestSignup(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api/signup"

    def test_signup_with_resume(self):
        """
        Test the signup endpoint with a resume file.
        """
        # Path to a sample resume file
        resume_path = os.path.join(os.path.dirname(__file__), "sample_resume.pdf")

        # Ensure the sample resume file exists
        self.assertTrue(os.path.exists(resume_path), "Sample resume file not found.")

        # Prepare form data
        data = {
            "id": "bf5beae6-6ab7-4d51-a144-6113514055d2",
            "created_at": "2023-10-05T12:34:56Z",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-123-4567",
            "job_title": "Software Engineer",
            "experience": "5 years",
            "industry": "Technology",
            "career_level": "Mid-level",
            "interview_type": "In-person",
            "preferred_language": "English",
            "specialization": "Machine Learning",
            "resume_url": "https://example.com/johndoe/resume.pdf",
            "portfolio_url": "https://example.com/johndoe",
            "linkedin_url": "https://www.linkedin.com/in/johndoe",
            "key_skills": "Python, Machine Learning, Docker, AWS",
            "preferred_role": "Machine Learning Engineer",
            "expectations": {
                "salary_range": "90k - 110k USD",
                "work_environment": "Hybrid",
                "relocation": False
            },
            "username": "johndoee",
            "password": "hashed_password_here",
            "github_url": "https://github.com/johndoe",
            "about": "Passionate about developing AI-driven solutions for healthcare.",
            "photo_url": "https://example.com/johndoe/photo.jpg",
            "auth_provider": "local"
        }

        with open(resume_path, "rb") as resume_file:
            files = {
                "resume": ("sample_resume.pdf", resume_file, "application/pdf")
            }

            # Send POST request
            response = requests.post(self.BASE_URL, data=data, files=files)

        # # Check response status code
        # self.assertEqual(response.status_code, 200, "Signup failed.")

        # Check response data
        response_data = response.json()
        self.assertIn("message", response_data, "Response missing 'message' field.")
        self.assertEqual(response_data["message"], "Signup successful", "Unexpected message.")

    def test_signup_without_resume(self):
        """
        Test the signup endpoint without a resume file.
        """
        # Prepare form data without a resume
        data = {
            "username": "testuser",
            "email": "testuser@example.com"
        }

        # Send POST request
        response = requests.post(self.BASE_URL, data=data)

        # Check response status code
        self.assertEqual(response.status_code, 400, "Expected 400 for missing resume.")

        # Check error message
        response_data = response.json()
        self.assertIn("error", response_data, "Response missing 'error' field.")
        self.assertEqual(response_data["error"], "Resume is required", "Unexpected error message.")

if __name__ == '__main__':
    unittest.main()