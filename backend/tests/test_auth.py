import unittest
from app import app

class TestAuthentication(unittest.TestCase):
    def setUp(self):
        # Create a test client for the Flask app
        self.client = app.test_client()
        self.base_url = '/api'
    
    def test_login_success(self):
        """
        Test regular login with valid credentials.
        """
        payload = {
            "email": "validuser@example.com",
            "password": "validpassword"
        }
        response = self.client.post(f"{self.base_url}/login", json=payload)
        self.assertEqual(response.status_code, 200, "Login should succeed with valid credentials.")
        data = response.get_json()
        self.assertIn("token", data, "Response should include a token on successful login.")

    def test_login_failure(self):
        """
        Test login failure with invalid credentials.
        """
        payload = {
            "email": "validuser@example.com",
            "password": "wrongpassword"
        }
        response = self.client.post(f"{self.base_url}/login", json=payload)
        self.assertEqual(response.status_code, 401, "Login should fail with invalid credentials.")
        data = response.get_json()
        self.assertIn("error", data, "Response should include an error message on failed login.")

    def test_logout_success(self):
        """
        Test that a logged-in user can log out successfully.
        """
        # First, log in to obtain a token.
        login_payload = {
            "email": "validuser@example.com",
            "password": "validpassword"
        }
        login_response = self.client.post(f"{self.base_url}/login", json=login_payload)
        self.assertEqual(login_response.status_code, 200, "Login should succeed for logout test.")
        token = login_response.get_json().get("token")
        self.assertIsNotNone(token, "Login response should include a token.")

        # Now, use the token to log out.
        response = self.client.post(f"{self.base_url}/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(response.status_code, 200, "Logout should succeed with valid token.")
        data = response.get_json()
        self.assertIn("message", data, "Logout response should include a confirmation message.")

    def test_google_oauth_success(self):
        """
        Test successful authentication via Google OAuth.
        """
        payload = {
            "token": "valid_google_oauth_token"
        }
        response = self.client.post(f"{self.base_url}/auth/google", json=payload)
        self.assertEqual(response.status_code, 200, "Google OAuth should succeed with a valid token.")
        data = response.get_json()
        self.assertIn("token", data, "Google OAuth response should include a token on success.")

    def test_google_oauth_failure(self):
        """
        Test Google OAuth failure with an invalid token.
        """
        payload = {
            "token": "invalid_google_oauth_token"
        }
        response = self.client.post(f"{self.base_url}/auth/google", json=payload)
        self.assertEqual(response.status_code, 401, "Google OAuth should fail with an invalid token.")
        data = response.get_json()
        self.assertIn("error", data, "Google OAuth response should include an error message on failure.")

if __name__ == '__main__':
    unittest.main()
