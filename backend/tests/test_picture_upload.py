import unittest
from io import BytesIO
from app import app

class TestPictureUpload(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.base_url = '/api'
    
    def test_upload_picture_success(self):
        """
        Test uploading a picture with a valid image file.
        """
        # Simulate an image file using BytesIO
        data = {
            'username': 'testuser',
            'file': (BytesIO(b"fake image data"), 'test_image.jpg')
        }
        response = self.client.post(
            f"{self.base_url}/upload-image", 
            data=data, 
            content_type='multipart/form-data'
        )
        self.assertEqual(response.status_code, 200, "Picture upload failed.")
        json_data = response.get_json()
        self.assertIn("message", json_data, "Response missing 'message' field.")
        self.assertEqual(
            json_data["message"], 
            "Image uploaded successfully", 
            "Unexpected upload message."
        )
        self.assertIn("url", json_data, "Response missing 'url' field.")
        self.assertIsNotNone(json_data["url"], "URL should not be None for successful upload.")

    def test_upload_picture_without_file(self):
        """
        Test uploading a picture without providing a file.
        """
        # Send a POST request without a file
        data = {
            'username': 'testuser'
        }
        response = self.client.post(
            f"{self.base_url}/upload-image", 
            data=data, 
            content_type='multipart/form-data'
        )
        self.assertEqual(response.status_code, 200, "Request should succeed even if no file is uploaded.")
        json_data = response.get_json()
        self.assertIn("message", json_data, "Response missing 'message' field.")
        self.assertEqual(
            json_data["message"], 
            "No image uploaded", 
            "Unexpected message for missing image."
        )
        self.assertIn("url", json_data, "Response missing 'url' field.")
        self.assertIsNone(json_data["url"], "URL should be None when no image is uploaded.")

if __name__ == '__main__':
    unittest.main()
