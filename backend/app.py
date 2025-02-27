from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from services.profile_service import ProfileService
from services.resume_service import ResumeService
from services.storage_service import StorageService
from utils.error_handlers import handle_bad_request
from utils.validation_utils import validate_file
from models.profile_model import Profile
from models.resume_model import ResumeData
from services.authorization_service import AuthorizationService


# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_error_handler(400, handle_bad_request)

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
profile_service = ProfileService(supabase_url, supabase_key)
resume_service = ResumeService()
storage_service = StorageService(supabase_url, supabase_key)
authorization_service = AuthorizationService(supabase_url, supabase_key)

@app.route('/api/profile', methods=['GET'])
def profile():
    """
    Returns a static profile for demonstration purposes.
    """
    data = {
        "name": "John Doe",
        "about": "A full stack developer who loves Python and JavaScript"
    }
    return jsonify(data)



@app.route('/api/signup', methods=['POST'])
def signup():
    """
    Handles user signup, including resume upload and profile creation.
    """
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "Resume is required", "message": "Please upload a resume file"}), 400
        data = request.form.to_dict()
        resume_file = request.files['resume']
        

        # Validate file
        validate_file(resume_file, allowed_types=['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

        # Upload resume
        file_path = f"{data['email']}/{resume_file.filename}"
        storage_service.upload_file('resumes', file_path, resume_file.read(), resume_file.content_type)
        file_url = storage_service.get_public_url('resumes', file_path)

        # Process resume
        resume_file.seek(0)
        extraction_result = resume_service.process_resume(resume_file)

        # Insert profile data
        profile_data = {
            **data,
            "resume_url": file_url,
            "resume": extraction_result
        }
        
        print(f"profile_data: {profile_data}")

        # No need to create a Profile object here, let the service handle it
        profile_service.create_profile(profile_data)

        return jsonify({"message": "Signup successful"}), 200
    except Exception as e:
        return jsonify({"error": "Signup failed", "message": str(e)}), 500


@app.route('/api/profile/<username>', methods=['GET'])
def get_profile(username):
    """
    Retrieves a user's profile by username.
    """
    try:
        profile = profile_service.get_profile(username)
        if not profile:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "message": "Profile retrieved successfully",
            "data": profile.model_dump()
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to get profile", "message": str(e)}), 500


@app.route('/api/profile/<username>', methods=['PUT'])
def update_profile(username):
    """
    Updates a user's profile.
    """
    try:
        data = request.json

        # Fetch current profile
        current_profile = profile_service.get_profile(username)
        if not current_profile:
            return jsonify({"error": "User not found"}), 404

        # Update profile
        updated_profile = current_profile.model_copy(update=data)
        result = profile_service.update_profile(username, updated_profile.model_dump())

        return jsonify({
            "message": "Profile updated successfully",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to update profile", "message": str(e)}), 500


@app.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    """
    Parses a resume file and returns the extracted information.
    """
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "Resume is required", "message": "Please upload a resume file"}), 400

        resume_file = request.files['resume']
        print("Received resume file:", resume_file.filename)
        print("File content type:", resume_file.content_type)

        # Validate file
        validate_file(resume_file, allowed_types=['application/pdf'])

        # Process resume
        extraction_result = resume_service.process_resume(resume_file)
        extraction_dict = extraction_result.model_dump()

        return jsonify({
            "resume": extraction_dict
        }), 200
    
    except Exception as e:
        return jsonify({"error": "Failed to parse resume", "message": str(e)}), 500


@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """
    Uploads a profile image and returns the file URL.
    """
    try:
        if 'file' not in request.files or request.files['file'].filename == '':
            return jsonify({"message": "No image uploaded", "url": None}), 200

        image_file = request.files['file']
        username = request.form.get('username', 'default_user')

        # Validate file
        validate_file(image_file, allowed_types=['image/jpeg', 'image/png', 'image/gif'])

        # Upload image
        file_path = f"{username}/{image_file.filename}"
        storage_service.upload_file('profile_pics', file_path, image_file.read(), image_file.content_type)
        file_url = storage_service.get_public_url('profile_pics', file_path)

        return jsonify({
            "message": "Image uploaded successfully",
            "url": file_url
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to upload image", "message": str(e)}), 500



@app.route('/api/auth/login', methods=['POST'])
def email_login():
    try:
        data = request.json
        print(f"data: {data}")
        email = data.get('email')
        password = data.get('password')

        if not authorization_service.check_email_exists(email):
            return jsonify({"error": "You don't have an account with this email"}), 400
        
        result = authorization_service.check_user_login(email, password)

        if not result:
            return jsonify({"error": "Invalid password"}), 401
        
        return jsonify({"message": "Login successful"}), 200
    except Exception as e:
        print(f"error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500




if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)