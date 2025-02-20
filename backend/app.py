from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import os

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
            # Read the file content
            file_content = resume_file.read()
            file_path = f"resumes/{data['email']}/{resume_file.filename}"
            
            # Upload the file content to Supabase storage
            supabase.storage.from_('resumes').upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": resume_file.content_type}
            )
            
            # Get the public URL
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

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
