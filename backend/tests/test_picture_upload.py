import unittest
import os
import requests

class TestPictureUpload(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_upload_picture(self):
        """
        Test uploading a picture with a valid image file.
        """
        picture_path = os.path.join(os.path.dirname(__file__), "sample_picture.jpg")
        self.assertTrue(os.path.exists(picture_path), "Sample picture file not found.")
        
        with open(picture_path, "rb") as picture_file:
            files = {
                "picture": ("sample_picture.jpg", picture_file, "image/jpeg")
            }
            response = requests.post(f"{self.BASE_URL}/upload-picture", files=files)
        
        self.assertEqual(response.status_code, 200, "Picture upload failed.")
        response_data = response.json()
        self.assertIn("message", response_data, "Response missing 'message' field.")
        self.assertEqual(response_data["message"], "Picture uploaded successfully", "Unexpected upload message.")
        self.assertIn("picture_url", response_data, "Response missing 'picture_url' field.")

    def test_upload_picture_without_file(self):
        """
        Test uploading a picture without providing a file.
        """
        response = requests.post(f"{self.BASE_URL}/upload-picture")
        self.assertEqual(response.status_code, 400, "Expected 400 for missing picture file.")
        response_data = response.json()
        self.assertIn("error", response_data, "Response missing 'error' field.")
        self.assertEqual(response_data["error"], "Picture file is required", "Unexpected error message.")

if __name__ == '__main__':
    unittest.main()
