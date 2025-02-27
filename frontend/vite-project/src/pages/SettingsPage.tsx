import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bot, User, Save, ArrowLeft, PlusCircle, Trash } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { useAuth } from '../context/AuthContext';


interface EducationItem {
  institution: string;
  degree: string;
  dates: string;
  location: string;
  description: string;
}


interface ExperienceItem {
  title: string;
  organization: string;
  dates: string;
  location: string;
  description: string;
}


interface UserProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  skills: string[];
  about: string;
  linkedin: string;
  github: string;
  portfolio: string;
  photoUrl: string | null | undefined;
  education_history: EducationItem[];
  experience: ExperienceItem[];
}


const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);




  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    title: '',
    email: '',
    phone: '',
    skills: [],
    about: '',
    linkedin: '',
    github: '',
    portfolio: '',
    photoUrl: null,
    education_history: [],
    experience: [],
  });


  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: ''
  });


  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
 



  useEffect(() => {
    const fetchProfile = async () => {
      try {

        console.log("Fetching profile for email:", userEmail);
        const email = userEmail || 'test@example.com';
        const response = await axios.get(`http://localhost:5001/api/profile/${email}`);
        if (response.data?.data) {
          const userData = response.data.data;
          const profileData: UserProfile = {
            name: `${userData.first_name} ${userData.last_name}`,
            title: userData.job_title || '',
            email: userData.email || '',
            phone: userData.phone || '',
            skills: Array.isArray(userData.key_skills)
              ? userData.key_skills
              : typeof userData.key_skills === 'string'
                ? userData.key_skills.split(',').map((s: string) => s.trim())
                : [],
            about: '',
            linkedin: userData.linkedin_url || '',
            github: userData.github_url || '',
            portfolio: userData.portfolio_url || '',
            photoUrl: userData.photo_url || null,
            education_history: Array.isArray(userData.resume?.education_history) 
              ? userData.resume?.education_history
              : [],
            experience: Array.isArray(userData.resume?.experience) 
              ? userData.resume?.experience
              : []
          };


          setProfile(profileData);
          setPhotoPreview(userData.photo_url || null);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();


  }, [userEmail]);
  const autoExpand = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = textarea.scrollHeight + 'px'; // Expand to fit content
  };




  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateURL = (url: string) => !url || /^https?:\/\//.test(url);
  const validateName = (name: string) => name.trim().length >= 2;
  const validatePhone = (phone: string) => /^\+?\d{10,15}$/.test(phone);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return null;


    const formData = new FormData();
    formData.append('file', photoFile);
    formData.append('email', userEmail || "test@example.com");
    console.log("Uploading image for email:", userEmail);


    try {
      const response = await axios.post('http://localhost:5001/api/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = response.data.url;


      setProfile({ ...profile, photoUrl: imageUrl });
      console.log('Image uploaded successfully:', imageUrl);


      return imageUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };



  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    // Ensure it's a PDF file
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }
 
    setResumeFile(file);
    setResumeName(file.name);
    setUploading(true);
 
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("email", userEmail || "test@example.com");
 
    try {
      const response = await axios.post('http://localhost:5001/api/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
 
      if (response.status === 200) {
        const data = response.data;
        setProfile((prev) => ({
          ...prev,
          education_history: data.education_history || prev.education_history,
          experience: data.experience || prev.experience
        }));
        console.log("Resume parsed and profile updated:", data);
      }
    } catch (error) {
      console.error("Error parsing resume:", error);
      alert("Failed to parse resume. Please try again.");
    } finally {
      setUploading(false);
    }
  };
 






  const handleSave = async () => {
    try {
      const newErrors = {
        name: validateName(profile.name) ? '' : 'Name must be at least 2 characters',
        email: validateEmail(profile.email) ? '' : 'Invalid email address',
        phone: validatePhone(profile.phone) ? '' : 'Invalid phone number',
        linkedin: validateURL(profile.linkedin) ? '' : 'Invalid URL',
        github: validateURL(profile.github) ? '' : 'Invalid URL',
        portfolio: validateURL(profile.portfolio) ? '' : 'Invalid URL'
      };


      setErrors(newErrors);


      if (Object.values(newErrors).some((error) => error !== '')) {
        return;
      }
      let imageUrl = profile.photoUrl;
      if (photoFile) {
        imageUrl = await handlePhotoUpload();
        console.log("Image URL:", imageUrl);
      }
      // Split the name into first and last name
      const [firstName = "", lastName = ""] = profile.name.split(" ", 2);


      const updatedProfile = {
        firstName: firstName,
        lastName: lastName,
        jobTitle: profile.title,
        email: profile.email,
        phone: profile.phone,
        keySkills: Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills,
        about: profile.about,
        linkedinUrl: profile.linkedin,
        githubUrl: profile.github,
        portfolioUrl: profile.portfolio,
        photoUrl: imageUrl || profile.photoUrl || null,
        education_history: profile.education_history || [],
        resume_experience: profile.experience || []
      };


      console.log("Sending profile update:", updatedProfile);


      const email = userEmail || "test@example.com";
      const response = await axios.put(
        `http://localhost:5001/api/profile/${email}`,
        updatedProfile,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      console.log("Update response:", response.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving profile:', err);
      if (axios.isAxiosError(err)) {
        console.error('Response data:', err.response?.data);
        setError(err.response?.data?.message || 'Failed to save profile changes');
      } else {
        setError('Failed to save profile changes');
      }
    }
  };


  const handleEducationChange = (index: number, key: keyof EducationItem, value: string) => {
    const updatedEdus = [...profile.education_history];
    updatedEdus[index] = { ...updatedEdus[index], [key]: value };
    setProfile({ ...profile, education_history: updatedEdus });
  };


  const addEducation = () => {
    setProfile({
      ...profile,
      education_history: [...profile.education_history, { institution: '', degree: '', dates: '', location: '', description: '' }],
    });
  };


  const deleteEducation = (index: number) => {
    const updatedEdus = [...profile.education_history];
    updatedEdus.splice(index, 1);
    setProfile({ ...profile, education_history: updatedEdus });
  };


  const handleExperienceChange = (index: number, key: keyof ExperienceItem, value: string) => {
    const updatedExps = [...profile.experience];
    updatedExps[index] = { ...updatedExps[index], [key]: value };
    setProfile({ ...profile, experience: updatedExps });
  };


  const addExperience = () => {
    setProfile({
      ...profile,
      experience: [...profile.experience, { title: '', organization: '', dates: '', location: '', description: '' }],
    });
  };


  const deleteExperience = (index: number) => {
    const updatedExps = [...profile.experience];
    updatedExps.splice(index, 1);
    setProfile({ ...profile, experience: updatedExps });
  };


  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;


  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Bot size={32} color="#ec4899" />
            <span>InterviewAI</span>
          </div>
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={12} />
            Back to Dashboard
          </button>
        </div>
      </nav>


      {/* Main */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Profile Setting</h1>
          <p>Manage Your Profile Information</p>
        </div>


        {/* Two-Column Grid */}
<div className={styles.grid}>
  {/* Column 1: Basic Info + Education */}
  <div className={styles.column}>
    <h3>Basic Info</h3>


    {/* Avatar Section */}
<div className={styles.avatarSection}>
  {/* Avatar Image or Default Icon */}
  <div className={styles.avatar}>
    {(photoPreview || profile.photoUrl) ? (
      <img 
        src={photoPreview || profile.photoUrl || ''} 
        alt="Profile" 
        className={styles.avatarImage}
      />
    ) : (
      <User size={48} color="#ec4899" />
    )}
  </div>


  <input
    type="file"
    accept="image/*"
    onChange={handlePhotoChange}
    style={{ display: 'none' }}
    id="photoUpload"
  />


  {/* Change Photo Button */}
  <button className={styles.uploadButton} onClick={() => document.getElementById('photoUpload')?.click()}>
    Change Photo
  </button>


  {/* Resume Upload Section */}
  <input
    type="file"
    accept=".pdf"
    onChange={handleResumeChange}
    style={{ display: 'none' }}
    id="resumeUpload"
  />
  <button
    className={styles.uploadButton}
    onClick={() => document.getElementById('resumeUpload')?.click()}
    disabled={uploading} // Disable button when uploading
  >
    {uploading ? "Uploading & Parsing..." : "Upload Resume PDF"}
  </button>
  {uploading && <p className={styles.loadingText}>Processing resume, please wait...</p>}
  {resumeName && !uploading && <p className={styles.fileName}>Selected: {resumeName}</p>}
</div>








    {/* Form Fields */}
    {[
      {
        label: 'Full Name',
        value: profile.name, error: errors.name, onChange: (v: string) => setProfile({ ...profile, name: v }) },
      { label: 'Job Title', value: profile.title, error: '', onChange: (v: string) => setProfile({ ...profile, title: v }) },
      { label: 'Email', value: profile.email, error: errors.email, onChange: (v: string) => setProfile({ ...profile, email: v }) },
      { label: 'Phone', value: profile.phone, error: errors.phone, onChange: (v: string) => setProfile({ ...profile, phone: v }) },
    ].map((field, idx) => (
      <div className={styles.formGroup} key={idx}>
        <label>{field.label}</label>
        <input
          type="text"
          className={`${styles.input} ${field.error ? styles.inputError : ''}`}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
        />
        {field.error && <span className={styles.error}>{field.error}</span>}
      </div>
    ))}




    {/* Description Textarea (Auto-Expand) */}
    <div className={styles.formGroup}>
      <label>About</label>
      <textarea className={`${styles.textarea} autoExpand`} value={profile.about} onChange={(e) => {
        setProfile({ ...profile, about: e.target.value });
        autoExpand(e);
      }} />
    </div>


    {/* Skills */}
    <div className={styles.formGroup}>
      <label>Skills (comma-separated)</label>
      <input type="text" className={styles.input} value={profile.skills.join(', ')} onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()) })} />
    </div>


    {/* Links */}
    {[
      { label: 'LinkedIn URL', value: profile.linkedin, error: errors.linkedin, onChange: (v: string) => setProfile({ ...profile, linkedin: v }) },
      { label: 'GitHub URL', value: profile.github, error: errors.github, onChange: (v: string) => setProfile({ ...profile, github: v }) },
      { label: 'Portfolio URL', value: profile.portfolio, error: errors.portfolio, onChange: (v: string) => setProfile({ ...profile, portfolio: v }) },
    ].map((field, idx) => (
      <div className={styles.formGroup} key={idx}>
        <label>{field.label}</label>
        <input
          type="url"
          className={`${styles.input} ${field.error ? styles.inputError : ''}`} // 如果有错误，添加 inputError 样式
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
        />
        {field.error && <span className={styles.error}>{field.error}</span>}  {/* 如果有错误，显示提示 */}
      </div>
    ))}




    {/* Education Cards */}
    <h3>Education</h3>
    {profile.education_history.map((edu, idx) => (
      <div key={idx} className={styles.card}>
        <div className={styles.cardHeader}>
          <strong>Education {idx + 1}</strong>
          <Trash size={16} className={styles.icon} onClick={() => deleteEducation(idx)} />
        </div>


        {[
          { label: 'School', value: edu.institution, key: 'institution' },
          { label: 'Degree', value: edu.degree, key: 'degree' },
          { label: 'Date', value: edu.dates, key: 'dates' },
          { label: 'Location', value: edu.location, key: 'location' },
        ].map((field, i) => (
          <div key={i} className={styles.formGroup}>
            <label>{field.label}</label>
            <input type="text" className={styles.input} value={field.value} onChange={(e) => handleEducationChange(idx, field.key as keyof EducationItem, e.target.value)} />
          </div>
        ))}


        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea className={`${styles.textarea} autoExpand`} value={edu.description} onChange={(e) => {
            handleEducationChange(idx, 'description', e.target.value);
            autoExpand(e);
          }} />
        </div>
      </div>
    ))}
    <button className={styles.addButton} onClick={addEducation}><PlusCircle size={16}/> Add Education</button>
  </div>


  {/* Column 2: Experience */}
  <div className={styles.column}>
    <h3>Experience</h3>
    {profile.experience.map((exp, idx) => (
      <div key={idx} className={styles.card}>
        <div className={styles.cardHeader}>
          <strong>Experience {idx + 1}</strong>
          <Trash size={16} className={styles.icon} onClick={() => deleteExperience(idx)} />
        </div>


        {[
          { label: 'Title', value: exp.title, key: 'title' },
          { label: 'Organization', value: exp.organization, key: 'organization' },
          { label: 'Date', value: exp.dates, key: 'dates' },
          { label: 'Location', value: exp.location, key: 'location' },
        ].map((field, i) => (
          <div key={i} className={styles.formGroup}>
            <label>{field.label}</label>
            <input type="text" className={styles.input} value={field.value} onChange={(e) => handleExperienceChange(idx, field.key as keyof ExperienceItem, e.target.value)} />
          </div>
        ))}


        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea className={`${styles.textarea} autoExpand`} value={exp.description} onChange={(e) => {
            handleExperienceChange(idx, 'description', e.target.value);
            autoExpand(e);
          }} />
        </div>
      </div>
    ))}
    <button className={styles.addButton} onClick={addExperience}><PlusCircle size={16}/> Add Experience</button>
  </div>
</div>


{/* Save Button */}
<button className={styles.saveButton} onClick={handleSave}><Save size={20}/> Save Changes</button>
      </main>


    </div>
  );
};


export default SettingsPage;
