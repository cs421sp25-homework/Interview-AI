from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from supabase import create_client
from services.profile_service import ProfileService
from services.resume_service import ResumeService
from services.storage_service import StorageService
from utils.error_handlers import handle_bad_request
from utils.validation_utils import validate_file
from models.profile_model import Profile
from models.resume_model import ResumeData

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_error_handler(400, handle_bad_request)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
profile_service = ProfileService(supabase_url, supabase_key)
resume_service = ResumeService()
storage_service = StorageService(supabase_url, supabase_key)


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

        # Ensure required fields
        required_fields = ["email", "password", "firstName", "lastName"]
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({"error": f"{field} is required"}), 400

        email = data["email"]
        password = data["password"]

        # Sign up user using Supabase Authentication
        auth_response = supabase.auth.sign_up({"email": email, "password": password})

        if auth_response.user is None or auth_response.user.id is None:
            return jsonify({"error": "Failed to create account"}), 401
        
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
        result = profile_service.update_profile(data['username'], profile_data)

        return jsonify({"message": "Signup successful", "data": result}), 200
    except Exception as e:
        return jsonify({"error": "Signup failed", "message": str(e)}), 500


# Profile via username
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

# Email/Password Login 
@app.route('/api/auth/login', methods=['POST'])
def email_login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        response = supabase.auth.sign_in_with_password({"email": email, "password": password})

        if "error" in response:
            return jsonify({"error": "Invalid email or password"}), 401

        user = response.user
        user_id = user.id

        existing_user = supabase.table('profiles').select('*').eq('email', email).execute()

        if not existing_user.data:
            # HOW TO ADD USERNAME?
            supabase.table('profiles').insert({
                "id": user_id, 
                "email": email,
                "first_name": user.user_metadata.get("first_name", ""),
                "last_name": user.user_metadata.get("last_name", ""),
                "auth_provider": "email"
            }).execute()

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user_id,
                "email": email,
                "token": response.session.access_token
            }
        }), 200
    
    except Exception as e:
        print(f"Error in email login: {str(e)}")
        return jsonify({"error": str(e)}), 500

# OAuth Login
@app.route('/api/oauth/<provider>', methods=['GET'])
def oauth_login(provider):
    try:
        # Validate provider
        allowed_providers = ['google', 'github']
        if provider not in allowed_providers:
            return jsonify({
                "error": "Invalid provider",
                "message": f"Provider must be one of: {', '.join(allowed_providers)}"
            }), 400
      
        auth_url = (
            f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
            f"?provider={provider}"
            f"&access_token={os.getenv('SUPABASE_ANON_KEY')}"
            f"&redirect_to={os.getenv('FRONTEND_URL')}/login"
        #    f"&access_type=offline"
        #    f"&prompt=consent"
        #    f"&redirect_to={os.getenv('FRONTEND_URL')}/auth/callback"
        )
      
        # Add provider-specific configurations
        if provider == "github":
            auth_url = (
                f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
                f"?provider=github"
                # f"&access_type=offline"
                # f"&prompt=consent"
                f"&redirect_to={os.getenv('FRONTEND_URL')}/auth/callback"
            )

        if provider == "google":
            auth_url = (
                f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
                f"?provider=google"
                f"&redirect_to={os.getenv('FRONTEND_URL')}/auth/callback"
            )
        else:    
            # Build the Supabase OAuth URL with access token
            auth_url = (
                f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
                f"?provider={provider}"
                f"&access_token={os.getenv('SUPABASE_ANON_KEY')}"
                f"&redirect_to={os.getenv('FRONTEND_URL')}/login"
            )

        print("auth url", auth_url)
        return redirect(auth_url)

    except Exception as e:
        print(f"Error in {provider} OAuth: {str(e)}")
        return jsonify({
            "error": "OAuth failed",
            "message": str(e)
        }), 500


@app.route('/api/auth/callback', methods=['GET'])
def auth_callback():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
           return jsonify({"error": "No authorization token provided"}), 401
      
        access_token = auth_header.split(' ')[1]
        if not access_token:
           return jsonify({"error": "Access token missing"}), 400

        user = supabase.auth.get_user(access_token)

        if not user or not user.user:
           return jsonify({"error": "Invalid token"}), 401

        user_data = user.user
        user_email = user_data.email
        user_id = user_data.id
        provider = user_data.app_metadata.get("provider")

        # Extract base username from email
        base_username = user_email.split('@')[0]
        username = base_username

        # # Check if the username already exists but for a different email
        # existing_username = supabase.table('profiles').select('email').eq('username', username).execute()

        # if existing_username.data:
        #     if existing_username.data[0]['email'] != user_email:
        #         counter = 1
        #         while True:
        #             new_username = f"{base_username}{counter}"
        #             check_existing = supabase.table('profiles').select('email').eq('username', new_username).execute()
        #             if not check_existing.data:  # Username is available
        #                 username = new_username
        #                 break
        #             counter += 1

        # Check if user already exists in the database
        existing_user = supabase.table('profiles').select('*').eq('email', user_email).execute()

        if not existing_user.data:
            # Insert new user with the unique username
            supabase.table('profiles').insert({
                "id": user_id,
                "email": user_email,
                "username": username,
                "first_name": user_data.user_metadata.get("full_name", "").split()[0] if user_data.user_metadata.get("full_name") else "",
                "last_name": " ".join(user_data.user_metadata.get("full_name", "").split()[1:]) if user_data.user_metadata.get("full_name") else "",
                "auth_provider": provider
            }).execute()

        return jsonify({
            "message": "OAuth login successful",
            "user": {
                "id": user_id,
                "email": user_email,
                "username": username,
                "provider": provider
            }
        }), 200

    except Exception as e:
        print(f"Error in auth callback: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        # Get the access token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No authorization token provided"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Sign out the user from Supabase
        supabase.auth.sign_out()
        
        return jsonify({
            "message": "Logged out successfully"
        }), 200
        
    except Exception as e:
        print(f"Error in logout: {str(e)}")
        return jsonify({
            "error": "Logout failed",
            "message": str(e)
        }), 500



if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)