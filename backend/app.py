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
        print("Querying username:", username)
        data = request.json
        result = supabase.table("profiles").select("*").eq('username', username).execute()
        print("[DEBUG] Before update:", result.data)

        full_name = data.get("name", "").strip()
        parts = full_name.split(" ", 1)
        first_name = parts[0] if len(parts) > 0 else ""
        last_name = parts[1] if len(parts) > 1 else ""

        update_dict = {
            "first_name": first_name,
            "last_name": last_name,

            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "job_title": data.get("title", ""),

            "key_skills": data.get("skills", ""),
            "about": data.get("about", ""),

            "linkedin_url": data.get("linkedin", ""),
            "github_url": data.get("github", ""),
            "portfolio_url": data.get("portfolio", ""),

            "education_history": data.get("education_history", []),
            "resume_experience": data.get("experience", [])
        }
        print("[DEBUG] Looking for username:", username)
        result = supabase.table("profiles") \
            .update(update_dict) \
            .filter("username", "eq", username.strip()) \
            .execute()

        print("[DEBUG] Query result:", result.data)

        if not result.data:
            print("[DEBUG] User not found in database.")
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "message": "Profile updated successfully",
            "data": result.data[0]
        }), 200

    except Exception as e:
        print("Error updating profile:", str(e))
        return jsonify({
            "error": "Failed to update profile",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
