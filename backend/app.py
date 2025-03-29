import uuid
from models.config_model import Interview
from characters.interviewer import Interviewer
from llm.interview_agent import LLMInterviewAgent
from flask import Flask, request, jsonify, redirect, send_file
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
from services.chat_history_service import ChatHistoryService
from utils.error_handlers import handle_bad_request
from utils.validation_utils import validate_file
from services.chat_service import ChatService
from models.profile_model import Profile
from models.resume_model import ResumeData
from llm.llm_graph import LLMGraph
from langchain.schema.messages import HumanMessage
from services.authorization_service import AuthorizationService
from supabase import create_client
from services.config_service import ConfigService
from utils.text_2_speech import text_to_speech
from utils.speech_2_text import speech_to_text
from utils.audio_conversion import convert_to_wav
from llm.llm_interface import LLMInterface


# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv('FRONTEND_URL', 'http://localhost:5173')}})

app.register_error_handler(400, handle_bad_request)

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
profile_service = ProfileService(supabase_url, supabase_key)
config_service = ConfigService(supabase_url, supabase_key)
resume_service = ResumeService()
storage_service = StorageService(supabase_url, supabase_key)
config_service = ConfigService(supabase_url, supabase_key)
authorization_service = AuthorizationService(supabase_url, supabase_key)
chat_history_service = ChatHistoryService(supabase_url, supabase_key)
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

        # result 已经是可序列化的字典
        return jsonify({
            "message": "Signup successful",
            "profile": result.get("data", {})
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
        
        # result 已经是可序列化的字典
        return jsonify({
            "message": "Signup successful",
            "profile": result.get("data", {})
        }), 200
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({"error": "Signup failed", "message": str(e)}), 500




@app.route('/api/config/<email>', methods=['GET'])
def get_config(email):
    """
    Retrieves a user's configurations by email.
    """
    try:
        print(f"email: {email}")
        configs = config_service.get_configs(email)  # Now returns a list
        print(f"configs: {configs}")

        if not configs:
            return jsonify({"error": "No configurations found"}), 404

        print("Configurations retrieved:", configs)
        return jsonify({
            "message": "Configurations retrieved successfully",
            "data": configs
        }), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 401
    except Exception as e:
        print(f"Error in get_config route: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to get configurations", "message": str(e)}), 500


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
    data = request.get_json()
    email = data.get("email")
    name = data.get("name")
    
    if not email or not name:
        return jsonify({"error": "Missing 'email' or 'name' in request."}), 400
    
    config_row = config_service.get_single_config(name=name, email=email)
    if not config_row:
        return jsonify({"error": "No config found for given name and email."}), 404

    print(f"get_single_config result: {config_row}")
    
    config_id = config_row.get("id")
    company_name = config_row.get("company_name", "our company")
    interview_name = config_row.get("interview_name", name)
    question_type = config_row.get("question_type", "")
    job_description = config_row.get("job_description", "")
    
    # Extract user profile information from request
    user_profile = data.get("userProfile", {})
    
    # Format resume information from user profile
    resume_text = ""
    if user_profile:
        # Format personal information
        full_name = f"{user_profile.get('first_name', '')} {user_profile.get('last_name', '')}".strip()
        if full_name:
            resume_text += f"Name: {full_name}\n"
        
        # Format job title
        job_title = user_profile.get('job_title', '')
        if job_title:
            resume_text += f"Current Title: {job_title}\n"
        
        # Format skills
        skills = user_profile.get('key_skills', [])
        if skills:
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split(',')]
            resume_text += f"Skills: {', '.join(skills)}\n"
        
        # Format education history
        education = user_profile.get('education_history', [])
        if education:
            resume_text += "\nEducation:\n"
            for edu in education:
                if isinstance(edu, dict):
                    institution = edu.get('institution', '')
                    degree = edu.get('degree', '')
                    dates = edu.get('dates', '')
                    if institution or degree:
                        resume_text += f"- {institution}, {degree} {dates}\n"
        
        # Format work experience
        experience = user_profile.get('resume_experience', [])
        if experience:
            resume_text += "\nWork Experience:\n"
            for exp in experience:
                if isinstance(exp, dict):
                    company = exp.get('company', '')
                    position = exp.get('position', '')
                    dates = exp.get('dates', '')
                    description = exp.get('description', '')
                    if company or position:
                        resume_text += f"- {position} at {company} {dates}\n"
                        if description:
                            resume_text += f"  {description}\n"
    
    interviewer = Interviewer(
        age=config_row.get("interviewer_age", ""),
        language=config_row.get("interviewer_language", "English"),
        job_description=job_description,
        company_name=company_name,
        interviewee_resume=resume_text,  # Pass formatted resume to interviewer
    )

    thread_id = str(uuid.uuid4())
    
    agent = LLMInterviewAgent(llm_graph=llm_graph, question_threshold=5, thread_id=thread_id)  
    agent.initialize(interviewer)

    welcome_message = ""
    if question_type == "behavioral":
        welcome_message = f"Welcome to your behavioral interview for {interview_name} at {company_name}. I'll be asking questions about how you've handled various situations in your past experiences. Let's start by having you introduce yourself briefly."
        # Inform LLM this is a behavioral interview
        agent.llm_graph.invoke(HumanMessage(content=f"This is a BEHAVIORAL interview. Focus on asking behavioral questions following the STAR format."), thread_id=thread_id)
    elif question_type == "technical":
        welcome_message = f"Welcome to your technical interview for {interview_name} at {company_name}. I'll be focusing on your technical expertise based on your background and experience. Let's begin with a brief introduction about yourself."
        
        # Create experience-focused prompt
        tech_skills_prompt = """TECHNICAL INTERVIEW GUIDELINES:

CORE APPROACH - TWO-PHASE QUESTIONING:
1. ANALYSIS PHASE - First analyze the candidate's response:
   - Identify key technical concepts, technologies, and methodologies mentioned
   - Note experience level and depth of understanding shown in their explanation
   - Find areas that need deeper exploration or clarification
   
2. FOLLOW-UP PHASE - Then formulate targeted follow-up questions:
   - Ask for specific implementation details ("How exactly did you implement that authentication system?")
   - Request explanations of technical decisions ("Why did you choose PostgreSQL over MongoDB for this use case?")
   - Challenge them to compare approaches ("What tradeoffs did you consider between these architectures?")
   - Probe for deeper technical knowledge ("What would happen if this system needed to scale 10x?")

INTERVIEW STRATEGY:
- Build questions directly from the candidate's resume experiences
- Focus on technologies they've actually used, not theoretical knowledge
- Ask them to solve problems similar to what they've solved before, but with new challenges
- Follow threads of conversation rather than jumping between unrelated topics
- Gradually increase technical depth to assess their expertise level

CONVERSATIONAL TECHNIQUES:
- Acknowledge their answers: "That's a good point about scalability..."
- Bridge to follow-ups: "Based on your implementation of X, how would you approach..."
- Create scenarios from their experience: "Imagine your Redis cache suddenly fails in production..."
- Ask for comparisons: "You've worked with both React and Angular - how would you compare their state management?"

The candidate's resume contains these experiences:"""
        
        # Add formatted work experience for reference
        if user_profile and user_profile.get('resume_experience'):
            experiences = user_profile.get('resume_experience', [])
            if experiences:
                for i, exp in enumerate(experiences):
                    if isinstance(exp, dict):
                        company = exp.get('company', '')
                        position = exp.get('position', '')
                        dates = exp.get('dates', '')
                        description = exp.get('description', '')
                        
                        tech_skills_prompt += f"\n\nExperience {i+1}:"
                        if company:
                            tech_skills_prompt += f"\nCompany: {company}"
                        if position:
                            tech_skills_prompt += f"\nPosition: {position}"
                        if dates:
                            tech_skills_prompt += f"\nDates: {dates}"
                        if description:
                            tech_skills_prompt += f"\nDetails: {description}"
        
        tech_skills_prompt += """

EXAMPLE QUESTION FLOW:

Based on resume: "Built a microservice architecture using Node.js and Docker"

Initial question:
"I see you implemented microservices with Node.js at ABC Company. Could you walk me through the architecture and how services communicated with each other?"

After their response:
[ANALYSIS: Candidate mentioned using REST APIs but didn't explain service discovery]

Follow-up questions:
"You mentioned REST APIs for service communication. How did you handle service discovery in this architecture?"
"If one of your microservices failed, what recovery mechanisms did you implement?"
"Given that you used Docker, what was your approach to orchestration and scaling?"

Remember: Each question should show you've carefully listened to their previous answer. Structure the interview as a deep technical conversation, not an interrogation."""
        
        # Inform LLM this is a technical interview with specific focus areas
        agent.llm_graph.invoke(HumanMessage(content=tech_skills_prompt), thread_id=thread_id)
    else:
        welcome_message = f"Welcome to your interview for {interview_name} at {company_name}. I'm excited to learn more about your skills and experience. Could you please start by telling me a bit about yourself and your background?"

    active_interviews[thread_id] = agent

    return jsonify({
        "thread_id": thread_id,
        "response": welcome_message
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
    user_email = data.get("email", "")
    config_name = data.get("config_name", "Interview Session")
    config_id = data.get("config_id")

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


# @app.route("/api/chat_history", methods=["POST"])
# def save_chat_history():
#     data = request.get_json()
#     thread_id = data.get("thread_id")
#     user_email = data.get("email")
#     messages = data.get("messages")
#     config_name = data.get("config_name", "Interview Session")
#     config_id = data.get("config_id")
    
#     if not thread_id or not user_email or not messages:
#         return jsonify({"error": "Missing required parameters"}), 400
    
#     # Check if there's only a welcome message, if so skip saving
#     if len(messages) == 1 and messages[0].get('sender') == 'ai':
#         print(f"Skipping save for thread {thread_id} - only contains welcome message")
#         return jsonify({"success": True, "skipped": True, "reason": "only_welcome_message"})
    
#     # Check existing record's message count
#     try:
#         existing_log = None
#         result = supabase.table('interview_logs').select('*').eq('thread_id', thread_id).execute()
        
#         if result.data and len(result.data) > 0:
#             existing_log = result.data[0]
#             config_name = existing_log.get('config_name', config_name)
#             if not config_id and 'config_id' in existing_log:
#                 config_id = existing_log.get('config_id')
                
#             # Check if existing record has more messages
#             existing_messages = existing_log.get('log')
#             if existing_messages:
#                 if isinstance(existing_messages, str):
#                     import json
#                     existing_messages = json.loads(existing_messages)
                    
#                 if len(existing_messages) > len(messages):
#                     print(f"Skipping save for thread {thread_id} - existing log has more messages")
#                     return jsonify({"success": True, "skipped": True, "reason": "existing_log_longer"})
#     except Exception as e:
#         print(f"Error checking existing log: {e}")
    
#     chat_history_result = chat_history_service.save_chat_history(thread_id, user_email, messages, config_name, config_id)
    
    
#     if not chat_history_result.get('success'):
#         return jsonify({"error": "Failed to save chat history"}), 500
    
#     interview_id = chat_history_result.get('interview_id')
#     if not interview_id:
#         return jsonify({"error": "Failed to get interview ID"}), 500
    
#     analysis_result = chat_history_service.save_analysis(interview_id, user_email, messages, config_name, config_id)
    
#     if not analysis_result.get('success'):
#         print(f"Warning: Failed to save analysis for interview {interview_id}: {analysis_result.get('error', 'Unknown error')}")
#         # Continue anyway, don't fail the whole request
    
#     try:
#         result = supabase.table('interview_logs').select('*').eq('thread_id', thread_id).execute()
#         if result.data and len(result.data) > 0:
#             return jsonify({"success": True, "data": result.data[0]}), 200
#     except Exception as e:
#         print(f"Error getting updated log: {e}")
    
#     return jsonify({"success": True})

@app.route("/api/chat_history", methods=["POST"])
def save_chat_history():
    data = request.get_json()
    thread_id = data.get("thread_id")
    user_email = data.get("email")
    messages = data.get("messages")
    config_name = data.get("config_name", "Interview Session")
    config_id = data.get("config_id")
    
    if not thread_id or not user_email or not messages:
        return jsonify({"error": "Missing required parameters"}), 400
    
    # Check if there's only a welcome message, if so skip saving
    if len(messages) == 1 and messages[0].get('sender') == 'ai':
        print(f"Skipping save for thread {thread_id} - only contains welcome message")
        return jsonify({"success": True, "skipped": True, "reason": "only_welcome_message"})
    
    # Check existing record's message count
    try:
        existing_log = None
        result = supabase.table('interview_logs').select('*').eq('thread_id', thread_id).execute()
        
        if result.data and len(result.data) > 0:
            existing_log = result.data[0]
            config_name = existing_log.get('config_name', config_name)
            if not config_id and 'config_id' in existing_log:
                config_id = existing_log.get('config_id')
                
            # Check if existing record has more messages
            existing_messages = existing_log.get('log')
            if existing_messages:
                if isinstance(existing_messages, str):
                    import json
                    existing_messages = json.loads(existing_messages)
                    
                if len(existing_messages) > len(messages):
                    print(f"Skipping save for thread {thread_id} - existing log has more messages")
                    return jsonify({"success": True, "skipped": True, "reason": "existing_log_longer"})
    except Exception as e:
        print(f"Error checking existing log: {e}")
    
    chat_history_result = chat_history_service.save_chat_history(thread_id, user_email, messages, config_name, config_id)
    
    
    if not chat_history_result.get('success'):
        return jsonify({"error": "Failed to save chat history"}), 500
    
    interview_id = chat_history_result.get('interview_id')
    if not interview_id:
        return jsonify({"error": "Failed to get interview ID"}), 500
    
    analysis_result = chat_history_service.save_analysis(interview_id, user_email, messages, config_name, config_id)
    
    if not analysis_result.get('success'):
        print(f"Warning: Failed to save analysis for interview {interview_id}: {analysis_result.get('error', 'Unknown error')}")
        # Continue anyway, don't fail the whole request
    
    try:
        result = supabase.table('interview_logs').select('*').eq('thread_id', thread_id).execute()
        if result.data and len(result.data) > 0:
            return jsonify({"success": True, "data": result.data[0]}), 200
    except Exception as e:
        print(f"Error getting updated log: {e}")
    
    return jsonify({"success": True})

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
    

@app.route('/api/get_interview_configs/<email>', methods=['GET'])
def get_interview_config(email):
    try:
        result = config_service.get_configs(email)
        if result:
            return jsonify(result), 200
        else:
            return jsonify({'message': 'Configuration not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 400


@app.route('/api/create_interview_config', methods=['POST'])
def create_interview_config():
    try:
        data = request.json
        config_id = config_service.create_config(data) 
        if config_id:
            return jsonify({'message': 'Interview configuration saved successfully!', 'id': config_id}), 201
        else:
            return jsonify({'message': 'Failed to save interview configuration.'}), 500
    except Exception as e:
        return jsonify({'message': str(e)}), 400

    
@app.route('/api/update_interview_config/<id>', methods=['PUT'])
def update_interview_config(id):
    try:
        data = request.json
        print(data)

        result = config_service.update_config(id, data)
        if result:
            return jsonify({'message': 'Interview configuration updated successfully!', 'data': result}), 200
        else:
            return jsonify({'message': 'Configuration not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 400


@app.route('/api/delete_interview_config/<id>', methods=['DELETE'])
def delete_interview_config(id):
    try:
        success = config_service.delete_config(id)
        if success:
            return jsonify({'message': 'Interview configuration deleted successfully!'}), 200
        else:
            return jsonify({'message': 'Configuration not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 400


@app.route('/api/interview_logs/<email>', methods=['GET'])
def get_interview_logs(email):
    """
    Retrieves all interview logs for a specific user by email.
    """
    try:
        if not email:
            return jsonify({"error": "Email is required"}), 400
            
        result = supabase.table('interview_logs').select('*').eq('email', email).order('created_at', desc=True).execute()
        
        if not result.data:
            return jsonify({"data": []}), 200
        
        enhanced_logs = []
        for log in result.data:
            config_id = log.get('config_id')
            if config_id:
                config_result = supabase.table('interview_config').select('*').eq('id', config_id).execute()
                if config_result.data and len(config_result.data) > 0:
                    config = config_result.data[0]
                    log['question_type'] = config.get('question_type', 'Unknown')
                    log['job_description'] = config.get('job_description', '')
                    log['config_company_name'] = config.get('company_name', 'Unknown')
                    log['interview_type'] = config.get('interview_type', 'Unknown')
                    log['interview_name'] = config.get('interview_name', 'Unknown')
            enhanced_logs.append(log)
            
        return jsonify({"data": enhanced_logs}), 200
    except Exception as e:
        print(f"Error fetching interview logs: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to fetch interview logs", "message": str(e)}), 500


@app.route('/api/chat_history/<id>', methods=['DELETE'])
def delete_chat_history_by_id(id):
    """
    Deletes an interview log and its associated chat history by interview log ID.
    """
    try:
        if not id:
            return jsonify({"error": "Interview log ID is required"}), 400

        # Retrieve the interview log to get the thread_id
        result = supabase.table('interview_logs').select('thread_id').eq('id', id).execute()
        if not result.data or len(result.data) == 0:
            return jsonify({"error": "Interview log not found"}), 404

        thread_id = result.data[0].get('thread_id')

        # Delete the interview log record
        supabase.table('interview_logs').delete().eq('id', id).execute()

        # Also delete associated chat history if available
        if thread_id:
            chat_history_service.delete_chat_history(thread_id)

        return jsonify({"success": True, "message": "Interview log and chat history deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting interview log: {str(e)}")
        return jsonify({"error": "Failed to delete interview log", "message": str(e)}), 500

# @app.route('/api/text2speech', methods=['POST'])
# def api_text2speech():
#     """
#     Convert text to speech, upload the resulting MP3 file to Supabase storage,
#     and return its public URL.
#     """
#     try:
#         data = request.get_json()
#         text = data.get('text', '')
#         if not text:
#             return jsonify({"error": "Text is required", "message": "Please provide text to convert."}), 400

#         # Generate the audio file.
#         audio_file_path = text_to_speech(text)

#         # Create a unique filename for storage.
#         unique_filename = f"{uuid.uuid4()}.mp3"
#         # Set the bucket name to "audios" as it exists in your Supabase project.
#         bucket_name = "audios"
#         # Use the unique filename directly as the storage path.
#         storage_path = unique_filename

#         app.logger.info(f"Uploading to bucket: {bucket_name}, storage_path: {storage_path}")

#         # Read the generated audio file.
#         with open(audio_file_path, "rb") as audio_file:
#             audio_data = audio_file.read()

#         # Upload the audio file with the correct MIME type.
#         storage_service.upload_file(bucket_name, storage_path, audio_data, 'audio/mpeg')

#         # Retrieve the public URL.
#         audio_url = storage_service.get_public_url(bucket_name, storage_path)

#         # Clean up the temporary file.
#         os.remove(audio_file_path)

#         return jsonify({"audioUrl": audio_url}), 200

#     except Exception as e:
#         app.logger.error(f"Failed to convert text to speech: {e}")
#         return jsonify({"error": "Failed to convert text to speech", "message": str(e)}), 500

@app.route('/api/text2speech', methods=['POST'])
def api_text2speech():
    """
    Convert text to speech using OpenAI's TTS API and return the generated audio data.
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "Text is required", "message": "Please provide text to convert."}), 400

        # Generate the audio using our OpenAI TTS utility.
        audio_io = text_to_speech(text)
        # Optionally, generate a unique filename for the response.
        filename = f"{uuid.uuid4()}.mp3"

        # Return the audio file directly.
        return send_file(
            audio_io,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name=filename
        )

    except Exception as e:
        app.logger.error(f"Failed to convert text to speech: {e}")
        return jsonify({"error": "Failed to convert text to speech", "message": str(e)}), 500


@app.route('/api/speech2text', methods=['POST'])
def api_speech2text():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "Audio file is required", "message": "Please upload an audio file."}), 400

        audio_file = request.files['audio']
        transcript = speech_to_text(audio_file.read())
        return jsonify({"transcript": transcript}), 200

    except Exception as e:
        app.logger.error(f"Speech-to-text error: {e}")
        return jsonify({"error": "Speech-to-text failed", "message": str(e)}), 500
    





@app.route('/api/generate_good_response', methods=['POST'])
def generate_good_response():
    data = request.get_json()
    user_message = data.get('message', '')
    if not user_message:
         return jsonify({"error": "Missing message"}), 400

    # Build a prompt instructing the LLM to improve the candidate's answer.
    prompt = f"Please provide an improved version of the following interview answer:\n\n{user_message}"

    # Initialize the LLM interface and call the model.
    llm_interface = LLMInterface()
    messages = [HumanMessage(content=prompt)]
    response = llm_interface.invoke(messages)

    # Retrieve the last message's content as the enhanced response.
    good_response = response[-1].content

    return jsonify({"response": good_response})


# service that returns the scores of the interview
# mock the scores for now
@app.route('/api/overall_scores/<id>', methods=['GET'])
@app.route('/api/overall_scores/email/<email>', methods=['GET'])
def get_overall_scores(id=None, email=None):
    print(f"Getting overall scores for id: {id}, email: {email}")
    # return the scores of the interview in a json such as
    # {
    #     "scores": {
    #          "confidence": 0.95,
    #          "communication": 0.95,
    #          "technical": 0.90,
    #          "problem_solving": 0.85,
    #          "resume strength": 0.90,
    #          "leadership": 0.90,
    #     }
    # }
    try:
        # In a real implementation, you would look up scores by id or email
        return jsonify({"scores": {
            "confidence": 0.95,
            "communication": 0.95,
            "technical": 0.90,
            "problem_solving": 0.85,
            "resume strength": 0.90,
            "leadership": 0.90,
        }})
    except Exception as e:
        return jsonify({"error": "Failed to get overall scores", "message": str(e)}), 500


@app.route('/api/interview_scores/<interview_id>', methods=['GET'])
def get_interview_scores(interview_id: int):                 
    print(f"Getting interview scores for id: {interview_id}")
    # get the scores of the interview from the database
    try:
        result = supabase.table('interview_performance').select('*').eq('interview_id', interview_id).execute()
        if not result.data:
            return jsonify({"error": "Interview scores not found"}), 404
        return jsonify({"scores": {
            "confidence": result.data[0].get('confidence_score'),
            "communication": result.data[0].get('communication_score'),
            "technical": result.data[0].get('technical_accuracy_score'),
            "problem_solving": result.data[0].get('problem_solving_score'),
            "resume strength": result.data[0].get('resume_strength_score'),
            "leadership": result.data[0].get('leadership_score'),
        }}), 200
    except Exception as e:
        return jsonify({"error": "Failed to get interview scores", "message": str(e)}), 500



@app.route('/api/interview_feedback_strengths/<interview_id>', methods=['GET'])
def get_interview_feedback_strengths(interview_id: int):
    print(f"Getting interview feedback strengths for id: {interview_id}")
    try:
        result = supabase.table('interview_performance').select('*').eq('interview_id', interview_id).execute()
        if not result.data:
            return jsonify({"error": "Interview feedback not found"}), 404
        return jsonify({"strengths": result.data[0].get('strengths')}), 200
    except Exception as e:
        return jsonify({"error": "Failed to get interview feedback strengths", "message": str(e)}), 500


@app.route('/api/interview_feedback_improvement_areas/<interview_id>', methods=['GET'])
def get_interview_feedback_improvement_areas(interview_id: int):
    print(f"Getting interview feedback improvement areas for id: {interview_id}")
    try:
        result = supabase.table('interview_performance').select('*').eq('interview_id', interview_id).execute()
        if not result.data:
            return jsonify({"error": "Interview feedback not found"}), 404
        return jsonify({"improvement_areas": result.data[0].get('areas_for_improvement')}), 200
    except Exception as e:
        return jsonify({"error": "Failed to get interview feedback improvement areas", "message": str(e)}), 500

@app.route('/api/interview_feedback_specific_feedback/<interview_id>', methods=['GET'])
def get_interview_feedback_specific_feedback(interview_id: int):
    print(f"Getting interview feedback specific feedback for id: {interview_id}")
    try:
        result = supabase.table('interview_performance').select('*').eq('interview_id', interview_id).execute()
        if not result.data:
            return jsonify({"error": "Interview feedback not found"}), 404
        return jsonify({"specific_feedback": result.data[0].get('specific_feedback')}), 200
    except Exception as e:
        return jsonify({"error": "Failed to get interview feedback specific feedback", "message": str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5001)) 
    app.run(debug=True, host='0.0.0.0', port=port)
