from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import os
from backend.utils.pdf_clean import process_resume  # Add this import at the top with other imports

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
        file_options={"content-type": resume_file.content_type, "upsert": "true"}
        )

        
        file_url = supabase.storage.from_('resumes').get_public_url(file_path)
        
        # Process the resume
        extraction_result = process_resume(file_url)

        # Insert all data into Supabase at once
        result = supabase.table('profiles').insert({
            'username': data.get('username'),
            'password': data.get('password'),
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
            'github_url': data.get('githubUrl'),
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


@app.route('/api/profile/<username>', methods=['GET'])
def get_profile(username):
    try:
        result = supabase.table('profiles').select('*').eq('username', username).execute()
        if not result.data:
            return jsonify({"error": "User not found"}), 404

        user_data = result.data[0]
        return jsonify({
            "message": "Profile retrieved successfully",
            "data": user_data
        }), 200


    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        return jsonify({
            "error": "Failed to get profile",
            "message": str(e)
        }), 500


@app.route('/api/profile/<username>', methods=['PUT'])
def update_profile(username):
    try:
        data = request.json
        print("Received data:", data)
        
        # First check if user exists and get current data
        check_result = supabase.table("profiles").select("*").eq('username', username).execute()
        if not check_result.data:
            return jsonify({"error": "User not found"}), 404

        # Get the complete current profile
        current_data = check_result.data[0]
        
        # Create update dict with all original fields
        update_dict = {
            "id": current_data.get("id"),  # Important: Include the primary key
            "username": username,
            "password": current_data.get("password", ""),
            "first_name": data.get("firstName", current_data.get("first_name", "")),
            "last_name": data.get("lastName", current_data.get("last_name", "")),
            "email": data.get("email", current_data.get("email", "")),
            "phone": data.get("phone", current_data.get("phone", "")),
            "job_title": data.get("jobTitle", current_data.get("job_title", "")),
            "experience": current_data.get("experience", ""),
            "industry": current_data.get("industry", ""),
            "career_level": current_data.get("career_level", ""),
            "interview_type": current_data.get("interview_type", ""),
            "preferred_language": current_data.get("preferred_language", ""),
            "specialization": current_data.get("specialization", ""),
            "resume_url": current_data.get("resume_url", ""),
            "key_skills": data.get("keySkills", current_data.get("key_skills", "")),
            "about": data.get("about", current_data.get("about", "")),
            "linkedin_url": data.get("linkedinUrl", current_data.get("linkedin_url", "")),
            "github_url": data.get("githubUrl", current_data.get("github_url", "")),
            "portfolio_url": data.get("portfolioUrl", current_data.get("portfolio_url", "")),
            "photo_url": data.get("photoUrl", current_data.get("photo_url", "")),
            "preferred_role": current_data.get("preferred_role", ""),
            "expectations": current_data.get("expectations", ""),
            "resume_summary": current_data.get("resume_summary", ""),
            "education_history": data.get("education_history", current_data.get("education_history", [])),
            "resume_experience": data.get("resume_experience", current_data.get("resume_experience", []))
        }

        print("Update dict:", update_dict)

        try:
            # Use upsert to update the record
            result = supabase.table("profiles") \
                .upsert(update_dict) \
                .execute()
            
            print("Upsert result:", result)

            if not result.data:
                return jsonify({"error": "Failed to update record"}), 500

            # Get the latest data after update
            updated_result = supabase.table("profiles").select("*").eq('username', username).execute()
            if not updated_result.data:
                return jsonify({"error": "Failed to retrieve updated data"}), 500

            updated_data = updated_result.data[0]
            formatted_response = {
                "name": f"{updated_data.get('first_name', '')} {updated_data.get('last_name', '')}".strip(),
                "title": updated_data.get('job_title', ''),
                "email": updated_data.get('email', ''),
                "phone": updated_data.get('phone', ''),
                "skills": updated_data.get('key_skills', '').split(',') if updated_data.get('key_skills') else [],
                "about": updated_data.get('about', ''),
                "linkedin": updated_data.get('linkedin_url', ''),
                "github": updated_data.get('github_url', ''),
                "portfolio": updated_data.get('portfolio_url', ''),
                "photoUrl": updated_data.get('photo_url', ''),
                "education_history": updated_data.get('education_history', []),
                "experience": updated_data.get('resume_experience', [])
            }

            return jsonify({
                "message": "Profile updated successfully",
                "data": formatted_response
            }), 200

        except Exception as supabase_error:
            print("Supabase error:", str(supabase_error))
            return jsonify({
                "error": "Database update failed",
                "message": str(supabase_error)
            }), 500

    except Exception as e:
        print("Error updating profile:", str(e))
        print("Error type:", type(e))
        print("Error args:", e.args)
        return jsonify({
            "error": "Failed to update profile",
            "message": str(e)
        }), 500


@app.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "Resume is required", "message": "Please upload a resume file"}), 400

        resume_file = request.files['resume']

        # Validate file size (5MB)
        file_bytes = resume_file.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            return jsonify({"error": "File too large", "message": "Resume file must be less than 5MB"}), 400
        resume_file.seek(0)

        # Validate file type (PDF only)
        if resume_file.content_type != "application/pdf":
            return jsonify({"error": "Invalid file type", "message": "Please upload a PDF file"}), 400

        # Generate file storage path
        username = request.form.get('username', 'temp_user')  # Default if username is not sent
        file_path = f"{username}/{resume_file.filename}"

        # Upload file to Supabase
        supabase.storage.from_('resumes').upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf", "upsert":"true"}
        )

        # Get public URL
        file_url = supabase.storage.from_('resumes').get_public_url(file_path)

        # Process the resume using the public URL
        extraction_result = process_resume(file_url)

        return jsonify({
            "resume_url": file_url,
            "education_history": extraction_result.get("education_history", []),
            "experience": extraction_result.get("experience", [])
        }), 200

    except Exception as e:
        print(f"Error parsing resume: {str(e)}")
        return jsonify({
            "error": "Failed to parse resume",
            "message": str(e)
        }), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'file' not in request.files or request.files['file'].filename == '':
            return jsonify({"message": "No image uploaded", "url": None}), 200

        image_file = request.files['file']
        username = request.form.get('username', 'default_user')

        if len(image_file.read()) > 5 * 1024 * 1024:
            return jsonify({
                "error": "File too large",
                "message": "Image file must be less than 5MB"
            }), 400
        image_file.seek(0)

        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if image_file.content_type not in allowed_types:
            return jsonify({
                "error": "Invalid file type",
                "message": "Please upload a JPEG, PNG, or GIF file"
            }), 400

        file_content = image_file.read()
        file_path = f"{username}/{image_file.filename}"

        supabase.storage.from_('profile_pics').upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": image_file.content_type, "upsert": "true"}
        )

        file_url = supabase.storage.from_('profile_pics').get_public_url(file_path)

        return jsonify({
            "message": "Image uploaded successfully",
            "url": file_url
        }), 200

    except Exception as e:
        print("Error uploading image:", str(e))
        return jsonify({
            "error": "Failed to upload image",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)