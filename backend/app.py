from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
from dotenv import load_dotenv
import os
from services.profile_service import ProfileService
from services.resume_service import ResumeService
from services.storage_service import StorageService
from utils.error_handlers import handle_bad_request
from utils.validation_utils import validate_file
from services.chat_service import ChatService
from models.profile_model import Profile
from models.resume_model import ResumeData
from llm.llm_graph import LLMGraph
from langchain.schema.messages import HumanMessage
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
llm_graph = LLMGraph()


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
        print("signup")
        if 'resume' not in request.files:
            return jsonify({"error": "Resume is required", "message": "Please upload a resume file"}), 400
        
        data = request.form.to_dict()
        resume_file = request.files['resume']

        # Validate file
        validate_file(resume_file, allowed_types=['application/pdf'])

        # Upload resume
        file_path = f"{data['email']}/{resume_file.filename}"
        storage_service.upload_file('resumes', file_path, resume_file.read(), resume_file.content_type)
        file_url = storage_service.get_public_url('resumes', file_path)

        # Process resume
        resume_file.seek(0)
        extraction_result = resume_service.process_resume(resume_file)

        # Prepare profile data
        profile_data = {
            **data,
            "resume_url": file_url,
            "education_history": extraction_result.education_history,
            "resume_experience": extraction_result.experience,
            "resume": extraction_result.model_dump()
        }

        # Create profile
        result = profile_service.create_profile(profile_data)

        return jsonify({
            "message": "Signup successful",
            "data": result
        }), 200
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({"error": "Signup failed", "message": str(e)}), 500


@app.route('/api/profile/<email>', methods=['GET'])
def get_profile(email):
    """
    Retrieves a user's profile by email.
    """
    try:
        profile = profile_service.get_profile(email)

        

        if not profile:
            return jsonify({"error": "User not found"}), 404
        # print(f"model dumped profile: {profile.model_dump()}")

        print(f"profile get")
        return jsonify({
            "message": "Profile retrieved successfully",
            "data": profile.model_dump()
        }), 200
    

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 401
    except Exception as e:
        print(f"Error in get_profile route: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to get profile", "message": str(e)}), 500


@app.route('/api/profile/<email>', methods=['PUT'])
def update_profile(email):
    try:
        data = request.json
        print("Received data:")

        # Call the service to update the profile
        updated_profile = profile_service.update_profile(email, data)
        if not updated_profile:
            return jsonify({"error": "User not found or failed to update"}), 404
        
        print(f"updated_profile: {updated_profile}")

        formatted_response = {
            "name": f"{updated_profile.get('first_name', '')} {updated_profile.get('last_name', '')}".strip(),
            "title": updated_profile.get('job_title', ''),
            "email": updated_profile.get('email', ''),
            "phone": updated_profile.get('phone', ''),
            "skills": updated_profile.get('key_skills', '').split(',') if updated_profile.get('key_skills') else [],
            "about": updated_profile.get('about', ''),
            "linkedin": updated_profile.get('linkedin_url', ''),
            "github": updated_profile.get('github_url', ''),
            "portfolio": updated_profile.get('portfolio_url', ''),
            "photoUrl": updated_profile.get('photo_url', ''),
            "education_history": updated_profile.get('education_history', []),
            "experience": updated_profile.get('resume_experience', [])
        }

        print(f"formatted_response: {formatted_response}")

        return jsonify({
            "message": "Profile updated successfully",
            "data": formatted_response
        }), 200

    except Exception as e:
        print("Error updating profile:", str(e))
        return jsonify({
            "error": "Failed to update profile",
            "message": str(e)
        }), 500


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
        email = request.form.get('email', 'default_user')

        print(f"Uploading image for email: {email}")

        # Validate file
        validate_file(image_file, allowed_types=['image/jpeg', 'image/png', 'image/gif'])

        print(f"Image validated")

        # Upload image
        file_path = f"{email}/{image_file.filename}"
        storage_service.upload_file('profile_pics', file_path, image_file.read(), image_file.content_type)

        print(f"File path: {file_path}")

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



# @app.route('/api/oauth/<provider>', methods=['GET'])
# def oauth_login(provider):
#     allowed_providers = ['google', 'github']
#     if provider not in allowed_providers:
#         return jsonify({"error": "Invalid provider"}), 400

#     callback_url = f"{os.getenv('BACKEND_URL')}/api/oauth/callback/{provider}"

#     # Build PKCE-based OAuth URL (server-side flow)
#     # with Google-specific query params if you want offline access (refresh token).
#     from urllib.parse import urlencode

#     base_url = f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
#     query = {
#         "provider": provider,
#         "response_type": "code",       # ensure we get a 'code'
#         "type": "pkce",                # PKCE flow
#         "redirect_to": callback_url,   # must match one in your Supabase redirect list
#         "scopes": "openid email"
#     }

#     # If you want a Google refresh token:
#     if provider == 'google':
#         query["access_type"] = "offline"
#         query["prompt"] = "consent"

#     auth_url = f"{base_url}?{urlencode(query)}"
#     print("Redirecting to:", auth_url)
#     return redirect(auth_url)



# @app.route('/api/oauth/callback/<provider>', methods=['GET'])
# def oauth_callback(provider):
#     code = request.args.get('code')
#     if not code:
#         # Possibly user arrived with an existing session (no code).
#         print("No 'code' param - checking for existing session...")

#         # If your 'authorization_service' checks cookies or session for an existing user:
#         user_data = authorization_service.get_current_user()
#         if user_data:
#             # Return user’s profile info
#             return jsonify({
#                 "message": "User already has a session",
#                 "user": {
#                     "email": user_data.email,
#                     # ...any other fields
#                 }
#             }), 200
#         else:
#             # No code, no existing session => redirect or error
#             return redirect(f"{os.getenv('FRONTEND_URL')}/login?error=no_code_no_session")
    
#     # Otherwise handle the normal code-exchange flow...
#     try:
#         # Exchange code for tokens
#         # ...
#         return redirect(f"{os.getenv('FRONTEND_URL')}/dashboard")
#     except Exception as exc:
#         return redirect(f"{os.getenv('FRONTEND_URL')}/login?error=callback_failed")




# Chat API
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data["message"]
    thread_id = data.get("thread_id", "default_thread")

    input_message = HumanMessage(content=user_input)

    output = llm_graph.invoke(input_message, thread_id=thread_id)

    if output.get("messages"):
        ai_response = output["messages"][-1].content
        return jsonify({"response": ai_response})
    else:
        return jsonify({"error": "No response from AI"}), 500



@app.route('/api/oauth/email', methods=['GET'])
def get_oauth_email():
    try:
        # Get session ID from query params if available
        session_id = request.args.get('session_id')
        
        user = None
        
        # If session_id is provided, use it to get the user
        if session_id:
            # Get user from session
            user = authorization_service.get_user_from_session(session_id)
        else:
            # Try to get user from cookies or other auth methods
            user = authorization_service.get_current_user()
        
        if not user:
            # For testing/development, return a dummy email
            if app.debug:
                return jsonify({"email": "test@example.com"}), 200
            return jsonify({"error": "No authenticated user found"}), 401
            
        return jsonify({"email": user.email}), 200
        
    except Exception as e:
        print(f"Error getting OAuth email: {str(e)}")
        # For testing/development, return a dummy email
        if app.debug:
            return jsonify({"email": "test@example.com"}), 200
        return jsonify({"error": "Failed to get OAuth email"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)