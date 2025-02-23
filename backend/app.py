from flask import Flask, jsonify, request
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


# @app.route('/api/resume-summary/<email>', methods=['GET'])
# def get_resume_summary(email):
#     try:
#         # Get user profile from Supabase
#         result = supabase.table('profiles').select('*').eq('email', email).execute()
#
#         if not result.data:
#             return jsonify({"error": "User not found"}), 404
#
#         user_profile = result.data[0]
#         resume_url = user_profile.get('resume_url')
#
#         if not resume_url:
#             return jsonify({"error": "No resume found for this user"}), 404
#
#         # Process the resume and get the summary
#         extraction_result = process_resume(resume_url)
#
#         # Update the profile with the resume summary
#         supabase.table('profiles').update({
#             'resume_summary': extraction_result
#         }).eq('email', email).execute()
#
#         return jsonify({
#             "message": "Resume processed successfully",
#             "data": extraction_result
#         }), 200
#
#     except Exception as e:
#         print(f"Error processing resume: {str(e)}")
#         return jsonify({
#             "error": "Failed to process resume",
#             "message": str(e)
#         }), 500

# @app.route('/api/profile/<username>', methods=['GET'])
# def get_profile(username):
#     try:
#         mock_data = {
#             "name": "Sarah Johnson",
#             "title": "Full Stack Developer",
#             "email": "213@qq.com",
#             "username": username,
#             "phone": "123-456-7890",
#             "skills": "React, Node.js, Python",
#             "about": "I am a passionate developer with 5 years of experience...",
#             "linkedin": "https://www.linkedin.com/in/sarah-johnson",
#             "github": "https://github.com/sarah-johnson",
#             "portfolio": "https://sarah-portfolio.example.com",
#             "photoUrl": "https://cdn.example.com/photos/sarah.jpg",
#
#             "education_history": [
#                 {
#                     "institution": "Johns Hopkins University | Whiting School of Engineering",
#                     "degree": "B.S. in Computer Science; B.S. in Applied Mathematics and Statistics",
#                     "dates": "Sept. 2022 – May 2026",
#                     "location": "Baltimore, MD",
#                     "description": "Relevant Courses: Machine Learning, Deep Learning, Algorithm, Data Structure, OOP, Fullstack JS, Data Science, Prob & Stats"
#                 }
#             ],
#             "experience": [
#                 {
#                     "title": "Software Engineer, Internship",
#                     "organization": "Zilliz (Vector Database)",
#                     "dates": "Oct. 2024 – Present",
#                     "location": "Redwood City, CA",
#                     "description": "Co-developed DeepSearcher, integrating LLMs (DeepSeek, OpenAI) with vector databases (Milvus) for semantic search, evaluation, and reasoning on private data, providing detailed reports for enterprise knowledge management and intelligent Q&A systems. "
#                 },
#                 {
#                     "title": "Machine Learning Engineer, Internship",
#                     "organization": "Pinduoduo (E-Commerce)",
#                     "dates": "May. 2024 – Aug. 2024",
#                     "location": "Shanghai, China",
#                     "description": "Enhanced the pretrained mContriever embedding model for an AI shopping assistant through Supervised Fine-Tuning. Improved model testing accuracy from 0.79 to 0.91, with a 27% gain in recall @ 5 and a 21% improvement in F1-score. "
#                 },
#                 {
#                     "title": "Back-End Developer, Part Time",
#                     "organization": "Capybara-AI (AI Financial)",
#                     "dates": "Oct. 2023 – Feb. 2024",
#                     "location": "Manhattan, New York",
#                     "description": "Developed a multithreaded news collection system with asynchronous summarization to deliver real-time news updates to users. Engineered a weekly industry keyword and summary system using BERT and hierarchical clustering with integrated sentiment scoring"
#                 },
#                 {
#                     "title": "Multimodal Machine Learning, Internship",
#                     "organization": "Vipshop Holdings Limited (E-Commerce)",
#                     "dates": "May 2023 – Aug. 2023",
#                     "location": "Shanghai, China",
#                     "description": "Enhanced VisualGLM for multimodal shopping recommendations by fine-tuning its Q-Former with attention masking for Image-Text Contrastive (ITC) and Image-Grounded Text Generation (IGTG), increasing model accuracy by 6.79%."
#                 }
#             ]
#         }
#
#         return jsonify({
#             "message": "Profile retrieved successfully",
#             "data": mock_data
#         }), 200
#
#     except Exception as e:
#         print(f"Error getting profile: {str(e)}")
#         return jsonify({
#             "error": "Failed to get profile",
#             "message": str(e)
#         }), 500


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


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
