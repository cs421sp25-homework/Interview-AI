import unittest
import requests

class TestProfileOperations(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_static_get_profile(self):
        """
        Test retrieving the static profile.
        """
        response = requests.get(f"{self.BASE_URL}/profile")
        self.assertEqual(response.status_code, 200, "Failed to retrieve static profile.")
        data = response.json()
        self.assertIn("name", data, "Static profile missing 'name'.")
        self.assertIn("about", data, "Static profile missing 'about'.")

    def test_get_profile_by_email_not_found(self):
        """
        Test retrieving a profile by email when the user does not exist.
        """
        email = "nonexistent@example.com"
        response = requests.get(f"{self.BASE_URL}/profile/{email}")
        self.assertEqual(response.status_code, 404, "Expected 404 for non-existent user.")
        data = response.json()
        self.assertIn("error", data, "Response should include an error message when user is not found.")

    def test_update_profile(self):
        """
        Test updating a user's profile.
        (Assumes that a profile with email 'test@example.com' exists.)
        """
        email = "test@example.com"
        update_data = {
            "first_name": "UpdatedFirst",
            "last_name": "UpdatedLast",
            "job_title": "Senior Developer",
            "email": email,
            "phone": "123-456-7890",
            "key_skills": "Python,Flask,SQL",
            "about": "Updated about section.",
            "linkedin_url": "https://linkedin.com/in/updated",
            "github_url": "https://github.com/updated",
            "portfolio_url": "https://updatedportfolio.com",
            "photo_url": "https://example.com/photo.jpg",
            "education_history": [{"degree": "BS Computer Science", "year": 2020}],
            "resume_experience": [{"company": "TechCorp", "position": "Developer"}]
        }
        response = requests.put(f"{self.BASE_URL}/profile/{email}", json=update_data)
        self.assertEqual(response.status_code, 200, "Profile update failed.")
        data = response.json()
        self.assertIn("message", data, "Response missing 'message' field.")
        self.assertEqual(data["message"], "Profile updated successfully", "Unexpected update message.")
        
        # Verify returned formatted data includes updated values.
        formatted = data.get("data", {})
        expected_name = f"{update_data.get('first_name', '')} {update_data.get('last_name', '')}".strip()
        self.assertEqual(formatted.get("name"), expected_name, "Name did not update correctly.")
        self.assertEqual(formatted.get("about"), update_data.get("about"), "About did not update correctly.")
        self.assertEqual(formatted.get("title"), update_data.get("job_title"), "Job title did not update correctly.")

if __name__ == '__main__':
    unittest.main()
