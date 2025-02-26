import unittest
import requests

class TestAuthentication(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_login_success(self):
        """
        Test that a valid email/password combination returns a success response with a token.
        """
        data = {
            "email": "validuser@example.com",
            "password": "validpassword"
        }
        response = requests.post(f"{self.BASE_URL}/login", json=data)
        self.assertEqual(response.status_code, 200, "Login failed with valid credentials.")
        response_data = response.json()
        self.assertIn("token", response_data, "Response missing token for valid login.")

    def test_login_invalid(self):
        """
        Test that an invalid email/password combination returns an unauthorized error.
        """
        data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{self.BASE_URL}/login", json=data)
        self.assertEqual(response.status_code, 401, "Expected 401 for invalid login.")
        response_data = response.json()
        self.assertIn("error", response_data, "Response missing error message for invalid login.")
        self.assertEqual(response_data["error"], "Invalid credentials", "Unexpected error message for invalid login.")

    def test_logout_success(self):
        """
        Test that a logged-in user can log out successfully.
        """
        # First, log in to obtain a token.
        login_data = {
            "email": "validuser@example.com",
            "password": "validpassword"
        }
        login_response = requests.post(f"{self.BASE_URL}/login", json=login_data)
        self.assertEqual(login_response.status_code, 200, "Login failed before logout test.")
        token = login_response.json().get("token")
        self.assertIsNotNone(token, "Token not returned on login.")

        headers = {"Authorization": f"Bearer {token}"}
        logout_response = requests.post(f"{self.BASE_URL}/logout", headers=headers)
        self.assertEqual(logout_response.status_code, 200, "Logout failed.")
        logout_data = logout_response.json()
        self.assertIn("message", logout_data, "Logout response missing message.")
        self.assertEqual(logout_data["message"], "Logged out successfully", "Unexpected logout message.")

    def test_google_auth_success(self):
        """
        Test successful Google authentication.
        """
        data = {
            "token": "valid_google_oauth_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/google", json=data)
        self.assertEqual(response.status_code, 200, "Google authentication failed with valid token.")
        response_data = response.json()
        self.assertIn("token", response_data, "Google auth response missing token.")

    def test_google_auth_failure(self):
        """
        Test Google authentication failure with an invalid token.
        """
        data = {
            "token": "invalid_google_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/google", json=data)
        self.assertEqual(response.status_code, 401, "Expected 401 for invalid Google token.")
        response_data = response.json()
        self.assertIn("error", response_data, "Google auth response missing error message.")
        self.assertEqual(response_data["error"], "Invalid Google token", "Unexpected error message for Google auth failure.")

    def test_github_auth_success(self):
        """
        Test successful GitHub authentication.
        """
        data = {
            "token": "valid_github_oauth_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/github", json=data)
        self.assertEqual(response.status_code, 200, "GitHub authentication failed with valid token.")
        response_data = response.json()
        self.assertIn("token", response_data, "GitHub auth response missing token.")

    def test_github_auth_failure(self):
        """
        Test GitHub authentication failure with an invalid token.
        """
        data = {
            "token": "invalid_github_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/github", json=data)
        self.assertEqual(response.status_code, 401, "Expected 401 for invalid GitHub token.")
        response_data = response.json()
        self.assertIn("error", response_data, "GitHub auth response missing error message.")
        self.assertEqual(response_data["error"], "Invalid GitHub token", "Unexpected error message for GitHub auth failure.")

    def test_linkedin_auth_success(self):
        """
        Test successful LinkedIn authentication.
        """
        data = {
            "token": "valid_linkedin_oauth_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/linkedin", json=data)
        self.assertEqual(response.status_code, 200, "LinkedIn authentication failed with valid token.")
        response_data = response.json()
        self.assertIn("token", response_data, "LinkedIn auth response missing token.")

    def test_linkedin_auth_failure(self):
        """
        Test LinkedIn authentication failure with an invalid token.
        """
        data = {
            "token": "invalid_linkedin_token"
        }
        response = requests.post(f"{self.BASE_URL}/auth/linkedin", json=data)
        self.assertEqual(response.status_code, 401, "Expected 401 for invalid LinkedIn token.")
        response_data = response.json()
        self.assertIn("error", response_data, "LinkedIn auth response missing error message.")
        self.assertEqual(response_data["error"], "Invalid LinkedIn token", "Unexpected error message for LinkedIn auth failure.")

if __name__ == '__main__':
    unittest.main()
