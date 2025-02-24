import traceback
from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import os
from pdf_clean import process_resume  # Add this import at the top with other imports

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

@app.route('/api/profile', methods=['GET'])
def profile():
    data = {
        "name": "John Doe",
        "about": "A full stack developer who loves Python and JavaScript"
    }
    return jsonify(data)

from flask import Flask, request, jsonify
from supabase import create_client, Client
import os

app = Flask(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
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

        user_id = auth_response.user.id  # Correct way to access user ID

        # Resume file validation
        if "resume" not in request.files:
            return jsonify({"error": "Resume is required"}), 400

        resume_file = request.files["resume"]

        # Validate file size (Max: 5MB)
        resume_file.seek(0, os.SEEK_END)
        file_size = resume_file.tell()
        resume_file.seek(0)  # Reset file pointer for reading
        if file_size > 5 * 1024 * 1024:
            return jsonify({"error": "File too large", "message": "Resume must be under 5MB"}), 400

        # Validate file type
        allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if resume_file.content_type not in allowed_types:
            return jsonify({"error": "Invalid file type", "message": "Upload a PDF or DOCX file"}), 400

        # Convert file to bytes and upload
        file_path = f"{email}/{resume_file.filename}"
        file_bytes = resume_file.read()  # Read file content as bytes
        supabase.storage.from_("resumes").upload(file_path, file_bytes)

        resume_url = supabase.storage.from_("resumes").get_public_url(file_path)

        # Extract information from resume (assuming a function exists)
        resume_data = process_resume(resume_url)

        # Insert user profile into Supabase DB
        profile_data = {
            "id": user_id,  # Linking profile to Supabase Auth user
            "first_name": data.get("firstName"),
            "last_name": data.get("lastName"),
            "email": email,
            "resume_url": resume_url,
            "resume_summary": resume_data.get("summary", ""),
            "education_history": resume_data.get("education_history", []),
            "resume_experience": resume_data.get("experience", [])
        }

        db_response = supabase.table("profiles").insert(profile_data).execute()

        if "error" in db_response:
            return jsonify({"error": "Database insertion failed"}), 500

        return jsonify({"message": "Signup successful", "data": db_response.data}), 201

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Signup failed", "message": str(e)}), 500


@app.route('/api/resume-summary/<email>', methods=['GET'])
def get_resume_summary(email):
    try:
        # Get user profile from Supabase
        result = supabase.table('profiles').select('*').eq('email', email).execute()
        
        if not result.data:
            return jsonify({"error": "User not found"}), 404
            
        user_profile = result.data[0]
        resume_url = user_profile.get('resume_url')
        
        if not resume_url:
            return jsonify({"error": "No resume found for this user"}), 404

        # Process the resume and get the summary
        extraction_result = process_resume(resume_url)
        
        # Update the profile with the resume summary
        supabase.table('profiles').update({
            'resume_summary': extraction_result
        }).eq('email', email).execute()
        
        return jsonify({
            "message": "Resume processed successfully",
            "data": extraction_result
        }), 200

    except Exception as e:
        print(f"Error processing resume: {str(e)}")
        return jsonify({
            "error": "Failed to process resume",
            "message": str(e)
        }), 500

@app.route('/api/profile/<email>', methods=['GET'])
def get_profile(email):
    try:
        # Get the access token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No authorization token provided"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify the token
        try:
            supabase.auth.get_user(token)
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401

        # Get user profile from Supabase
        result = supabase.table('profiles').select('*').eq('email', email).execute()
        
        if not result.data:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "message": "Profile retrieved successfully",
            "data": result.data[0]
        }), 200

    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        return jsonify({
            "error": "Failed to get profile",
            "message": str(e)
        }), 500

@app.route('/api/profile/<email>', methods=['PUT'])
def update_profile(email):
    try:
        data = request.json
        
        # Update profile in Supabase
        result = supabase.table('profiles').update(data).eq('email', email).execute()
        
        return jsonify({
            "message": "Profile updated successfully",
            "data": result.data[0]
        }), 200

    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return jsonify({
            "error": "Failed to update profile",
            "message": str(e)
        }), 500
    
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

# @app.route('/api/upload-image', methods=['POST'])
# def upload_image():
#     try:
#         if 'file' not in request.files or request.files['file'].filename == '':
#             return jsonify({"message": "No image uploaded", "url": None}), 200

# Email/Password Login 
# @app.route('/api/auth/login', methods=['POST'])
# def email_login():
#     try:
#         data = request.json
#         email = data.get('email')
#         password = data.get('password')

#         if not email or not password:
#             return jsonify({"error": "Email and password are required"}), 400

#         response = supabase.auth.sign_in_with_password({"email": email, "password": password})

#         if "error" in response:
#             return jsonify({"error": "Invalid email or password"}), 401

#         user = response.user
#         user_id = user.id

#         existing_user = supabase.table('profiles').select('*').eq('email', email).execute()

#         if not existing_user.data:
#             supabase.table('profiles').insert({
#                 "id": user_id, 
#                 "email": email,
#                 "first_name": user.user_metadata.get("first_name", ""),
#                 "last_name": user.user_metadata.get("last_name", ""),
#                 "auth_provider": "email"
#             }).execute()

#         return jsonify({
#             "message": "Login successful",
#             "user": {
#                 "id": user_id,
#                 "email": email,
#                 "token": response.session.access_token
#             }
#         }), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
    
# OAuth Login 
@app.route('/api/oauth/<provider>', methods=['GET'])
def oauth_login(provider):
    try:
        # Validate provider
        allowed_providers = ['google', 'github', 'linkedin']
        if provider not in allowed_providers:
            return jsonify({
                "error": "Invalid provider",
                "message": f"Provider must be one of: {', '.join(allowed_providers)}"
            }), 400
        
        auth_url = (
            f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
            f"?provider={provider}"
            f"&access_type=offline"
            f"&prompt=consent"
            f"&redirect_to={os.getenv('FRONTEND_URL')}/auth/callback"
        )
        
        # Add provider-specific configurations
        if provider == "github":
            auth_url = (
                f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
                f"?provider=github"
                f"&access_type=offline"
                f"&prompt=consent"
                f"&redirect_to={os.getenv('FRONTEND_URL')}/auth/callback"
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

        # Get user data from token
        user = supabase.auth.get_user(access_token)

        if not user or not user.user:
            return jsonify({"error": "Invalid token"}), 401

        user_data = user.user
        user_email = user_data.email
        user_id = user_data.id
        provider = user_data.app_metadata.get("provider")

        existing_user = supabase.table('profiles').select('*').eq('email', user_email).execute()

        if not existing_user.data:
            supabase.table('profiles').insert({
                "id": user_id, 
                "email": user_email,
                "first_name": user_data.user_metadata.get("full_name", "").split()[0] if user_data.user_metadata.get("full_name") else "",
                "last_name": " ".join(user_data.user_metadata.get("full_name", "").split()[1:]) if user_data.user_metadata.get("full_name") else "",
                "auth_provider": provider
            }).execute()

        return jsonify({
            "message": "OAuth login successful",
            "user": {
                "id": user_id,
                "email": user_email,
                "provider": provider
            }
        }), 200

    except Exception as e:
        print(f"Error in auth callback: {str(e)}")
        traceback.print_exc()
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