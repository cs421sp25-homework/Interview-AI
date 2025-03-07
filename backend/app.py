import uuid
from characters.interviewer import Interviewer
from llm.interview_agent import LLMInterviewAgent
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
from dotenv import load_dotenv
import os
import secrets
import hashlib
import base64
from services.profile_service import ProfileService
from services.resume_service import ResumeService
from services.storage_service import StorageService
from services.config_service import ConfigService
from utils.error_handlers import handle_bad_request
from utils.validation_utils import validate_file
from services.chat_service import ChatService
from models.profile_model import Profile
from models.resume_model import ResumeData
from llm.llm_graph import LLMGraph
from langchain.schema.messages import HumanMessage
from services.authorization_service import AuthorizationService
from supabase import create_client

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
config_service = ConfigService(supabase_url, supabase_key)
authorization_service = AuthorizationService(supabase_url, supabase_key)
llm_graph = LLMGraph()
supabase = create_client(supabase_url, supabase_key)

active_interviews = {}

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
    


@app.route('/api/oauth/signup', methods=['POST'])
def oauth_signup():
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
        result = profile_service.create_oauth_profile(profile_data)

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


@app.route('/api/oauth/<provider>', methods=['GET'])
def oauth_login(provider):
    try:
        # Generate a code verifier - this should be a random string
        code_verifier = secrets.token_urlsafe(64)
        
        # Create code_challenge from code_verifier
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip('=')
        
        # Set the redirect to our backend callback endpoint
        callback_url = f"{request.host_url.rstrip('/')}/api/auth/callback"
        print(f"Initiating sign in with {provider}, callback URL: {callback_url}")
        print(f"Code verifier: {code_verifier}")
        print(f"Code challenge: {code_challenge}")
        
        # First get the response
        response = supabase.auth.sign_in_with_oauth(
            {
                "provider": "google",
                "options": {
                    "redirect_to": callback_url,
                    "scopes": "email profile",
                    "code_challenge": code_challenge,
                    "code_challenge_method": "S256"
                }
            }
        )
        return redirect(response.url)

    except Exception as e:
        print(f"Error in {provider} OAuth: {str(e)}")
        return jsonify({
            "error": "OAuth failed",
            "message": str(e)
        }), 500


@app.route('/api/auth/callback', methods=['GET'])
def auth_callback():
    try:
        print(f"Request received at callback endpoint")
        
        # Get the code from the request URL
        code = request.args.get('code')
        print(f"Code from query params: {code}")

        try:
            result = supabase.auth.exchange_code_for_session({
                "auth_code": code
            })
            
            print(f"Exchange result: {result}")
            
            if not result or not result.session:
                return jsonify({"error": "Failed to exchange code for session"}), 400
            
            # Get user info and redirect to frontend
            user = result.user
            email = user.email
            is_new_user = True
            if authorization_service.check_email_exists(email):
                is_new_user = False

            print(f"email: {email}")
            return redirect(f"{os.getenv('FRONTEND_URL')}/#/auth/callback?email={email}&is_new_user={is_new_user}")



        except Exception as exchange_error:
            print(f"Exchange error: {str(exchange_error)}")
            # Redirect to frontend for client-side handling
            return redirect(f"{os.getenv('FRONTEND_URL')}/auth/callback?code={code}")
        
    except Exception as e:
        print(f"Auth callback error: {str(e)}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/auth/callback?error={str(e)}")

@app.route("/api/new_chat", methods=["POST"])
def new_chat():
    """
    1) Fetch config row from the DB by name & email
    2) Create and initialize an InterviewAgent
    3) Return the AI's greeting plus a thread_id
    """
    data = request.get_json()
    email = data.get("email")
    name = data.get("name")

    if not email or not name:
        return jsonify({"error": "Missing 'email' or 'name' in request."}), 400

    # 1) Get config from DB
    config_row = config_service.get_single_config(name=name, email=email)
    if not config_row:
        return jsonify({"error": "No config found for given name and email."}), 404

    # Suppose your configs table has columns:
    #   name, email, config_value, ...
    # We'll assume config_value is a dict that might contain job_description, etc.
    config_value = config_row.get("config_value", {})

    #TODO fetch resume and put it into interviewer

    # 2) Build an Interviewer object from config
    interviewer = Interviewer(
        # name=config_value.get("interviewer_name", ""), 
        # personality=config_value.get("interviewer_personality", ""),
        age=config_value.get("interviewer_age", ""),
        language=config_value.get("interviewer_language", "English"),
        job_description=config_value.get("job_description", ""),
        company_name=config_value.get("company_name", ""),
        # interviewee_resume=config_value.get("interviewee_resume", "")
    )

    thread_id = str(uuid.uuid4())
    # 3) Create and initialize the LLMInterviewAgent
    agent = LLMInterviewAgent(llm_graph=llm_graph, question_threshold=5, thread_id=thread_id)  
    agent.initialize(interviewer)

    # 4) Agent greet
    greeting = agent.greet()

    # Store this agent in our active_interviews
    active_interviews[thread_id] = agent

    # 5) Return greeting + thread_id
    return jsonify({
        "thread_id": thread_id,
        "response": greeting
    })

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    1) Receives thread_id and user response
    2) Retrieves the existing agent from memory
    3) Calls next_question on the agent
    4) If the interview ended, return wrap up message
       Otherwise, return the next question
    """
    data = request.get_json()
    thread_id = data.get("thread_id")
    user_input = data.get("message", "")

    if not thread_id:
        return jsonify({"error": "Missing 'thread_id' in request."}), 400

    if thread_id not in active_interviews:
        return jsonify({"error": "Invalid thread_id or session expired."}), 404
    agent = active_interviews[thread_id]
    # Next question from the agent
    next_ai_response = agent.next_question(user_input)
    # Check if interview is ended
    if agent.is_end(next_ai_response):
        # We can optionally remove the agent from active_interviews
        # or keep it if you want to retrieve the conversation later
        wrap_up_message = agent.end_interview()
        return jsonify({"response": wrap_up_message, "ended": True})
    else:
        return jsonify({"response": next_ai_response, "ended": False})


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
    import os
    port = int(os.environ.get("PORT", 5001)) 
    app.run(debug=True, host='0.0.0.0', port=port)