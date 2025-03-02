import unittest
from app import app

class TestProfileOperations(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.base_url = '/api'
    
    def test_static_get_profile(self):
        """
        Test retrieving the static profile.
        """
        response = self.client.get(f"{self.base_url}/profile")
        self.assertEqual(response.status_code, 200, "Failed to retrieve static profile.")
        data = response.get_json()
        self.assertIn("name", data, "Static profile missing 'name'.")
        self.assertIn("about", data, "Static profile missing 'about'.")
    
    def test_get_profile_by_username(self):
        """
        Test retrieving a user's profile by username.
        """
        username = "john_doe"
        response = self.client.get(f"{self.base_url}/profile/{username}")
        # The API may return 404 if the user doesn't exist
        if response.status_code == 404:
            data = response.get_json()
            self.assertIn("error", data, "Expected error message when user not found.")
        else:
            self.assertEqual(response.status_code, 200, "Failed to retrieve profile by username.")
            data = response.get_json()
            self.assertIn("message", data, "Response missing 'message' field.")
            self.assertIn("data", data, "Response missing 'data' field.")
    
    def test_update_profile(self):
        """
        Test updating a user's profile.
        """
        username = "john_doe"
        update_data = {
            "name": "Updated John Doe",
            "about": "Updated bio for John Doe"
        }
        response = self.client.put(f"{self.base_url}/profile/{username}", json=update_data)
        self.assertEqual(response.status_code, 200, "Profile update failed.")
        data = response.get_json()
        self.assertIn("message", data, "Response missing 'message' field.")
        self.assertEqual(data["message"], "Profile updated successfully", "Unexpected update message.")
        
        # Verify the profile was updated by fetching it
        get_response = self.client.get(f"{self.base_url}/profile/{username}")
        if get_response.status_code == 200:
            profile_data = get_response.get_json().get("data", {})
            self.assertEqual(profile_data.get("name"), update_data["name"], "Name did not update.")
            self.assertEqual(profile_data.get("about"), update_data["about"], "About did not update.")

if __name__ == '__main__':
    unittest.main()
