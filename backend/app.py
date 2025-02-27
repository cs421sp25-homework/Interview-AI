from flask import Flask, request, jsonify
from flask_cors import CORS
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
        print(f"model dumped profile: {profile.model_dump()}")
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
        print("hahaReceived data:", data)

        # Call the service to update the profile
        updated_profile = profile_service.update_profile(email, data)
        if not updated_profile:
            return jsonify({"error": "User not found or failed to update"}), 404

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

        # Validate file
        validate_file(image_file, allowed_types=['image/jpeg', 'image/png', 'image/gif'])

        # Upload image
        file_path = f"{email}/{image_file.filename}"
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


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)