import unittest
from io import BytesIO
import requests

class TestPictureUpload(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5001/api"

    def test_upload_picture_success(self):
        """
        Test uploading a picture with a valid image file.
        """
        data = {
            "email": "test@example.com"
        }
        files = {
            "file": ("test_image.jpg", BytesIO(b"fake image data"), "image/jpeg")
        }
        response = requests.post(f"{self.BASE_URL}/upload-image", data=data, files=files)
        self.assertEqual(response.status_code, 200, "Picture upload failed.")
        json_data = response.json()
        self.assertIn("message", json_data, "Response missing 'message' field.")
        self.assertEqual(json_data["message"], "Image uploaded successfully", "Unexpected upload message.")
        self.assertIn("url", json_data, "Response missing 'url' field.")
        self.assertIsNotNone(json_data["url"], "URL should not be None for successful upload.")

    def test_upload_picture_without_file(self):
        """
        Test uploading a picture without providing a file.
        """
        data = {
            "email": "test@example.com"
        }
        response = requests.post(f"{self.BASE_URL}/upload-image", data=data)
        self.assertEqual(response.status_code, 200, "Request should succeed even if no file is uploaded.")
        json_data = response.json()
        self.assertIn("message", json_data, "Response missing 'message' field.")
        self.assertEqual(json_data["message"], "No image uploaded", "Unexpected message for missing image.")
        self.assertIn("url", json_data, "Response missing 'url' field.")
        self.assertIsNone(json_data["url"], "URL should be None when no image is uploaded.")

if __name__ == '__main__':
    unittest.main()
