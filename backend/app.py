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
        
        # Handle file upload if present
        if 'resume' in request.files:
            resume_file = request.files['resume']
            file_content = resume_file.read()
            file_path = f"{data['email']}/{resume_file.filename}"  # Simplified path
            
            # Upload to the 'resumes' bucket
            supabase.storage.from_('resumes').upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": resume_file.content_type}
            )
            
            file_url = supabase.storage.from_('resumes').get_public_url(file_path)
            data['resume_url'] = file_url

        # Insert data into Supabase
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
            'resume_url': data.get('resume_url'),
            'portfolio_url': data.get('portfolioUrl'),
            'linkedin_url': data.get('linkedinUrl'),
            'key_skills': data.get('keySkills'),
            'preferred_role': data.get('preferredRole'),
            'expectations': data.get('expectations')
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

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
