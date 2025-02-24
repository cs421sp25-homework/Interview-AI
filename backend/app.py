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

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.form.to_dict()
        
        # Check if resume is provided
        if 'resume' not in request.files:
            return jsonify({
                "error": "Resume is required",
                "message": "Please upload a resume file"
            }), 400

        resume_file = request.files['resume']
        
        # Validate file size (5MB)
        if len(resume_file.read()) > 5 * 1024 * 1024:
            return jsonify({
                "error": "File too large",
                "message": "Resume file must be less than 5MB"
            }), 400
        resume_file.seek(0)  # Reset file pointer after reading
        
        # Validate file type
        allowed_types = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if resume_file.content_type not in allowed_types:
            return jsonify({
                "error": "Invalid file type",
                "message": "Please upload a PDF or DOCX file"
            }), 400

        file_content = resume_file.read()
        file_path = f"{data['email']}/{resume_file.filename}"
        
        # Upload to the 'resumes' bucket
        supabase.storage.from_('resumes').upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": resume_file.content_type}
        )
        
        file_url = supabase.storage.from_('resumes').get_public_url(file_path)
        
        # Process the resume
        extraction_result = process_resume(file_url)

        # Insert all data into Supabase at once
        result = supabase.table('profiles').insert({
            'first_name': data.get('firstName'),
            'last_name': data.get('lastName'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'job_title': data.get('jobTitle'),
            'experience': data.get('experience'),
            'industry': data.get('industry'),
            'career_level': data.get('careerLevel'),
            'interview_type': data.get('interviewType'),
            'preferred_language': data.get('preferredLanguage'),
            'specialization': data.get('specialization'),
            'resume_url': file_url,
            'portfolio_url': data.get('portfolioUrl'),
            'linkedin_url': data.get('linkedinUrl'),
            'key_skills': data.get('keySkills'),
            'preferred_role': data.get('preferredRole'),
            'expectations': data.get('expectations'),
            'resume_summary': extraction_result,
            'education_history': extraction_result.get('education_history', []),
            'resume_experience': extraction_result.get('experience', [])
        }).execute()

        return jsonify({
            "message": "Signup successful",
            "data": result.data
        }), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "error": "Signup failed",
            "message": str(e)
        }), 500


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
            f"&access_token={os.getenv('SUPABASE_ANON_KEY')}"
            f"&redirect_to={os.getenv('FRONTEND_URL')}/login"
        )
        
        if provider == "google":
            auth_url = (
                f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
                f"?provider=google"
                f"&redirect_to={os.getenv('FRONTEND_URL')}/login"
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
        # Return a redirect response
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
        print("auth callback")
        access_token = request.args.get("access_token")
        if not access_token:
            return jsonify({"error": "Access token missing"}), 400

        supabase.auth.session = {"access_token": access_token}
        user = supabase.auth.get_user()

        if "error" in user:
            return jsonify({"error": "Invalid token"}), 401

        user_data = user["user"]
        user_email = user_data["email"]
        user_id = user_data["id"]
        provider = user_data["app_metadata"]["provider"]

        existing_user = supabase.table('profiles').select('*').eq('email', user_email).execute()

        if not existing_user.data:
            supabase.table('profiles').insert({
                "id": user_id, 
                "email": user_email,
                "first_name": user_data.get("user_metadata", {}).get("first_name", ""),
                "last_name": user_data.get("user_metadata", {}).get("last_name", ""),
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
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)