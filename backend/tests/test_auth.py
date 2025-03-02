import unittest
import requests

class TestAuthentication(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_email_login_success(self):
        """
        Test that email login succeeds with valid credentials.
        (Assumes that 'test@example.com' exists and the correct password is 'correctpassword'.)
        """
        payload = {
            "email": "test@example.com",
            "password": "correctpassword"
        }
        response = requests.post(f"{self.BASE_URL}/auth/login", json=payload)
        self.assertEqual(response.status_code, 200, "Login should succeed with valid credentials.")
        data = response.json()
        self.assertIn("message", data, "Response should include a success message.")
        self.assertEqual(data["message"], "Login successful", "Unexpected success message.")

    def test_email_login_invalid_password(self):
        """
        Test that email login fails with an invalid password.
        """
        payload = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{self.BASE_URL}/auth/login", json=payload)
        self.assertEqual(response.status_code, 401, "Login should fail with an invalid password.")
        data = response.json()
        self.assertIn("error", data, "Response should include an error message.")
        self.assertEqual(data["error"], "Invalid password", "Unexpected error message for invalid password.")

    def test_email_login_no_account(self):
        """
        Test that email login fails when the email does not exist.
        """
        payload = {
            "email": "nonexistent@example.com",
            "password": "any_password"
        }
        response = requests.post(f"{self.BASE_URL}/auth/login", json=payload)
        self.assertEqual(response.status_code, 400, "Login should fail if the email does not exist.")
        data = response.json()
        self.assertIn("error", data, "Response should include an error message.")
        self.assertEqual(data["error"], "You don't have an account with this email", "Unexpected error message for non-existent email.")

    def test_google_oauth_initiation(self):
        """
        Test initiating Google OAuth. This endpoint should return a redirect.
        """
        # In this test we disable automatic redirects.
        response = requests.get(f"{self.BASE_URL}/oauth/google", allow_redirects=False)
        # Expect a redirect (HTTP 302 or 303)
        self.assertIn(response.status_code, (302, 303), "OAuth initiation should return a redirect status.")
        self.assertIn("Location", response.headers, "Redirect response missing Location header.")

if __name__ == '__main__':
    unittest.main()
