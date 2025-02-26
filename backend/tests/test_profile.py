import unittest
import requests

class TestProfileOperations(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_get_profile(self):
        """
        Test retrieving the user profile.
        """
        response = requests.get(f"{self.BASE_URL}/profile")
        self.assertEqual(response.status_code, 200, "Failed to retrieve profile.")
        
        response_data = response.json()
        self.assertIn("username", response_data, "Profile data missing 'username'.")
        self.assertIn("email", response_data, "Profile data missing 'email'.")

    def test_update_profile(self):
        """
        Test updating the user profile.
        """
        update_data = {
            "username": "updateduser",
            "email": "updateduser@example.com",
            "bio": "This is an updated bio."
        }
        response = requests.put(f"{self.BASE_URL}/profile", json=update_data)
        self.assertEqual(response.status_code, 200, "Profile update failed.")
        
        response_data = response.json()
        self.assertIn("message", response_data, "Response missing 'message' field.")
        self.assertEqual(response_data["message"], "Profile updated successfully", "Unexpected update message.")
        
        # Optionally, re-fetch the profile to ensure updates are applied
        profile_response = requests.get(f"{self.BASE_URL}/profile")
        profile = profile_response.json()
        self.assertEqual(profile.get("username"), update_data["username"], "Username did not update.")
        self.assertEqual(profile.get("email"), update_data["email"], "Email did not update.")
        self.assertEqual(profile.get("bio", ""), update_data["bio"], "Bio did not update.")

if __name__ == '__main__':
    unittest.main()
