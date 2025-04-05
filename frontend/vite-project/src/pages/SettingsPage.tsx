import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bot, User, Save, FileText, PlusCircle, Trash } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

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
  firstName: string;
  lastName: string;
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

  // Basic UI states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // If there's a major error loading or saving, store it here
  const [error, setError] = useState<string | null>(null);

  // For uploading photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // For uploading resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState<string>("");

  // Profile data
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
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

  // Field-level error messages
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: ''
  });

  // -------------------------------------------
  // Validation Helpers
  // -------------------------------------------
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  // If you want phone to be truly optional, allow blank
  // but if provided, must match phone pattern
  const validatePhone = (phone: string) =>
    !phone || /^\+?\d{10,15}$/.test(phone);

  const validateURL = (url: string) =>
    !url || /^https?:\/\//.test(url);

  const validateName = (name: string) =>
    name.trim().length >= 2;

  // -------------------------------------------
  // Auto-expand textareas
  // -------------------------------------------
  const autoExpand = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto'; // reset
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // -------------------------------------------
  // Load user profile on mount
  // -------------------------------------------
  useEffect(() => {
    // If userEmail is missing, redirect to login
    if (!userEmail) {
      setError('Please log in to view settings.');
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        // We retrieve user_email from localStorage in case `userEmail` from context is empty
        const localEmail = localStorage.getItem('user_email') || userEmail;
        if (!localEmail) {
          setError('No user email found. Please log in again.');
          navigate('/login');
          return;
        }

        console.log("Fetching profile for email:", localEmail);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/api/profile/${localEmail}`);
        if (response.data?.data) {
          const userData = response.data.data;
          console.log("Profile data loaded:", userData);

          const profileData: UserProfile = {
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            title: userData.job_title || '',
            email: localEmail || '',
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
            education_history: userData.education_history
              || userData.resume?.education_history
              || [],
            experience: userData.resume_experience
              || userData.resume?.experience
              || [],
          };

          setProfile(profileData);
          setPhotoPreview(userData.photo_url || null);
        } else {
          // No data returned
          setError('No profile data found. Please complete your profile.');
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);

        if (err.response) {
          // Server responded
          const { status } = err.response;
          if (status === 401) {
            setError('Session expired or unauthorized. Please log in again.');
            navigate('/login');
          } else {
            setError('Failed to load profile data from server.');
          }
        } else {
          // Likely a network error
          setError('Network error. Could not fetch your profile.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userEmail, navigate]);

  // -------------------------------------------
  // Photo Upload
  // -------------------------------------------
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async (): Promise<string | null> => {
    if (!photoFile) return null;
    try {
      const localEmail = localStorage.getItem('user_email') || userEmail;
      if (!localEmail) {
        setError('Missing email. Please log in again.');
        return null;
      }

      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('email', localEmail);

      console.log("Uploading image for email:", localEmail);

      const response = await axios.post(`${API_BASE_URL}/api/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.url) {
        console.log('Image uploaded successfully:', response.data.url);
        return response.data.url;
      } else {
        console.error('Upload response did not contain a URL:', response.data);
        setError('Server did not return photo URL. Please try again.');
        return null;
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Error uploading image. Please try again.');
      return null;
    }
  };

  // -------------------------------------------
  // Resume Upload + Parsing
  // -------------------------------------------
  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure it's a PDF
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setResumeFile(file);
    setResumeName(file.name);
    setUploading(true);

    try {
      const localEmail = localStorage.getItem('user_email') || userEmail;
      if (!localEmail) {
        setError('Missing email. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("email", localEmail);

      const response = await axios.post(`${API_BASE_URL}/api/parse-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200 && response.data.resume) {
        const resumeData = response.data.resume;
        console.log("Parsed resume data:", resumeData);

        // Update local state
        setProfile(prev => ({
          ...prev,
          education_history: resumeData.education_history || [],
          experience: resumeData.experience || []
        }));

        // Also update server profile
        const updateResponse = await axios.put(
          `${API_BASE_URL}/api/profile/${localEmail}`,
          {
            education_history: resumeData.education_history,
            resume_experience: resumeData.experience
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        console.log("Profile updated with new resume data:", updateResponse.data);
        alert("Resume parsed and profile updated successfully!");
      } else {
        setError('Server returned an unexpected response parsing resume.');
      }
    } catch (error: any) {
      console.error("Error processing resume:", error);
      alert("Failed to process resume. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // -------------------------------------------
  // Save Changes (Profile Update)
  // -------------------------------------------
  const handleSave = async () => {
    // Validate fields
    let hasErrors = false;
    const newErrors = { ...errors };

    if (!validateName(profile.firstName)) {
      newErrors.firstName = 'First name must be at least 2 characters';
      hasErrors = true;
    } else {
      newErrors.firstName = '';
    }

    if (!validateName(profile.lastName)) {
      newErrors.lastName = 'Last name must be at least 2 characters';
      hasErrors = true;
    } else {
      newErrors.lastName = '';
    }

    if (!validateEmail(profile.email)) {
      newErrors.email = 'Invalid email address';
      hasErrors = true;
    } else {
      newErrors.email = '';
    }

    // If phone is optional, only validate if not empty
    if (profile.phone && !validatePhone(profile.phone)) {
      newErrors.phone = 'Invalid phone number (must be 10–15 digits)';
      hasErrors = true;
    } else {
      newErrors.phone = '';
    }

    if (!validateURL(profile.linkedin)) {
      newErrors.linkedin = 'Invalid URL (must start with http or https)';
      hasErrors = true;
    } else {
      newErrors.linkedin = '';
    }

    if (!validateURL(profile.github)) {
      newErrors.github = 'Invalid URL (must start with http or https)';
      hasErrors = true;
    } else {
      newErrors.github = '';
    }

    if (!validateURL(profile.portfolio)) {
      newErrors.portfolio = 'Invalid URL (must start with http or https)';
      hasErrors = true;
    } else {
      newErrors.portfolio = '';
    }

    setErrors(newErrors);
    if (hasErrors) return;

    // Attempt to upload photo and update profile
    try {
      setUploading(true);
      setError(null);

      let imageUrl = profile.photoUrl;
      if (photoFile) {
        imageUrl = await handlePhotoUpload();
        if (!imageUrl) {
          // If we fail to upload the photo, do not proceed with updating the rest
          throw new Error('Failed to upload photo.');
        }
      }

      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        jobTitle: profile.title,
        phone: profile.phone,
        keySkills: profile.skills.join(', '),
        about: profile.about,
        linkedinUrl: profile.linkedin,
        githubUrl: profile.github,
        portfolioUrl: profile.portfolio,
        photo_url: imageUrl || null,
        education_history: profile.education_history,
        resume_experience: profile.experience
      };

      const response = await axios.put(`${API_BASE_URL}/api/profile/${profile.email}`, updateData);
      console.log('Profile update server response:', response.data);

      alert('Profile updated successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error updating profile:', err);

      if (err.response) {
        const { status, data } = err.response;
        if (status === 401) {
          setError('Session expired or unauthorized. Please log in again.');
          navigate('/login');
        } else {
          setError(data?.message || 'Failed to update profile. Please try again.');
        }
      } else {
        // Possibly a network error or an error thrown by handlePhotoUpload
        setError('Failed to update profile. Check your connection or try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // -------------------------------------------
  // Education/Experience Handlers
  // -------------------------------------------
  const handleEducationChange = (index: number, key: keyof EducationItem, value: string) => {
    const updatedEdus = [...profile.education_history];
    updatedEdus[index] = { ...updatedEdus[index], [key]: value };
    setProfile({ ...profile, education_history: updatedEdus });
  };

  const addEducation = () => {
    setProfile({
      ...profile,
      education_history: [
        ...profile.education_history,
        { institution: '', degree: '', dates: '', location: '', description: '' }
      ],
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
      experience: [
        ...profile.experience,
        { title: '', organization: '', dates: '', location: '', description: '' }
      ],
    });
  };

  const deleteExperience = (index: number) => {
    const updatedExps = [...profile.experience];
    updatedExps.splice(index, 1);
    setProfile({ ...profile, experience: updatedExps });
  };


  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <div className={styles.spinner}></div>
        <p>Loading your profile...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className={styles.loadingContainer}>
      <div className={styles.errorCard}>
        <div className={styles.errorIcon}>!</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button 
          className={styles.errorButton}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );


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
            Back to Dashboard
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Profile Settings</h1>
          <p>Manage Your Profile Information</p>
        </div>


        {/* Two-Column Grid */}
<div className={styles.grid}>
  {/* Column 1: Basic Info + Education */}
  <div className={styles.column}>
    <h3>Basic Information</h3>

            {/* Avatar + Resume */}
            <div className={styles.avatarSection}>
              {/* Avatar or Icon */}
              <div className={styles.avatar}>
                {photoPreview || profile?.photoUrl ? (
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
              <button 
                className={styles.uploadButton} 
                onClick={() => document.getElementById('photoUpload')?.click()}
                disabled={uploading}
              >
                <User size={20} />
                <span>Change Photo</span>
              </button>

              {/* Resume Upload */}
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeChange}
                style={{ display: 'none' }}
                id="resumeUpload"
              />
              <div className={styles.resumeUploadContainer}>
                <button
                  className={`${styles.uploadButton} ${uploading ? styles.uploading : ''}`}
                  onClick={() => document.getElementById('resumeUpload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className={styles.uploadingMessage}>
                      <div className={styles.uploadSpinner}></div>
                      <span>Processing your resume...</span>
                    </div>
                  ) : (
                    <>
                      <FileText size={20} />
                      <span>Upload Resume PDF</span>
                    </>
                  )}
                </button>
                {resumeName && !uploading && (
                  <div className={styles.fileInfo}>
                    <FileText size={16} />
                    <span className={styles.fileName}>{resumeName}</span>
                  </div>
                )}
              </div>
            </div>

    <div className={styles.sectionDivider}>
      <span>Personal Details</span>
    </div>

    {/* Form Fields */}
    {[
      {
        label: 'First Name',
        value: profile.firstName,
        error: errors.firstName,
        onChange: (v: string) => setProfile({ ...profile, firstName: v }),
        testId: 'first-name-input'
      },
      {
        label: 'Last Name',
        value: profile.lastName,
        error: errors.lastName,
        onChange: (v: string) => setProfile({ ...profile, lastName: v }),
        testId: 'last-name-input'
      },
      { 
        label: 'Job Title', 
        value: profile.title, 
        error: '', 
        onChange: (v: string) => setProfile({ ...profile, title: v }),
        testId: 'job-title-input'
      },
      { 
        label: 'Email', 
        value: profile.email, 
        error: errors.email, 
        onChange: (v: string) => setProfile({ ...profile, email: v }),
        testId: 'email-input'
      },
      { 
        label: 'Phone', 
        value: profile.phone, 
        error: errors.phone, 
        onChange: (v: string) => setProfile({ ...profile, phone: v }),
        testId: 'phone-input'
      },
    ].map((field, idx) => (
      <div className={styles.formGroup} key={idx}>
        <label>{field.label}</label>
        <input
          type="text"
          className={`${styles.input} ${field.error ? styles.inputError : ''}`}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          data-testid={field.testId}
          placeholder={`Enter your ${field.label.toLowerCase()}`}
        />
        {field.error && <span className={styles.error}>{field.error}</span>}
      </div>
    ))}

    <div className={styles.sectionDivider}>
      <span>About & Skills</span>
    </div>

    {/* Description Textarea (Auto-Expand) */}
    <div className={styles.formGroup}>
      <label>About</label>
      <textarea 
        className={`${styles.textarea} autoExpand`} 
        value={profile.about} 
        placeholder="Write a short bio about yourself..."
        onChange={(e) => {
          setProfile({ ...profile, about: e.target.value });
          autoExpand(e);
        }} 
      />
    </div>


    {/* Skills */}
    <div className={styles.formGroup}>
      <label>Skills (comma-separated)</label>
      <input 
        type="text" 
        className={styles.input} 
        value={profile.skills.join(', ')} 
        placeholder="e.g. JavaScript, React, UI Design"
        onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()) })} 
      />
    </div>

    <div className={styles.sectionDivider}>
      <span>Professional Links</span>
    </div>

    {/* Links */}
    {[
      { 
        label: 'LinkedIn URL', 
        value: profile.linkedin, 
        error: errors.linkedin, 
        onChange: (v: string) => setProfile({ ...profile, linkedin: v }),
        testId: 'linkedin-input',
        placeholder: 'https://linkedin.com/in/yourprofile'
      },
      { 
        label: 'GitHub URL', 
        value: profile.github, 
        error: errors.github, 
        onChange: (v: string) => setProfile({ ...profile, github: v }),
        testId: 'github-input',
        placeholder: 'https://github.com/yourusername'
      },
      { 
        label: 'Portfolio URL', 
        value: profile.portfolio, 
        error: errors.portfolio, 
        onChange: (v: string) => setProfile({ ...profile, portfolio: v }),
        testId: 'portfolio-input',
        placeholder: 'https://yourportfolio.com'
      },
    ].map((field, idx) => (
      <div className={styles.formGroup} key={idx}>
        <label>{field.label}</label>
        <input
          type="url"
          className={`${styles.input} ${field.error ? styles.inputError : ''}`}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          data-testid={field.testId}
          placeholder={field.placeholder}
        />
        {field.error && <span className={styles.error}>{field.error}</span>}
      </div>
    ))}




    {/* Education Cards */}
    <div className={styles.sectionDivider}>
      <span>Education</span>
    </div>
    
    {profile.education_history.map((edu, idx) => (
      <div key={idx} className={styles.card} data-testid={`education-card-${idx}`}>
        <div className={styles.cardHeader}>
          <strong data-testid={`education-title-${idx}`}>Education {idx + 1}</strong>
          <Trash size={16} className={styles.icon} onClick={() => deleteEducation(idx)} data-testid="trash" />
        </div>

        {[
          { label: 'School', value: edu.institution, key: 'institution', testId: `institution-input-${idx}`, placeholder: 'Enter school name' },
          { label: 'Degree', value: edu.degree, key: 'degree', testId: `degree-input-${idx}`, placeholder: 'Enter degree or certificate' },
          { label: 'Date', value: edu.dates, key: 'dates', testId: `dates-input-${idx}`, placeholder: 'e.g. 2018-2022' },
          { label: 'Location', value: edu.location, key: 'location', testId: `location-input-${idx}`, placeholder: 'Enter location' },
        ].map((field, i) => (
          <div key={i} className={styles.formGroup}>
            <label>{field.label}</label>
            <input 
              type="text" 
              className={styles.input} 
              value={field.value} 
              placeholder={field.placeholder}
              onChange={(e) => handleEducationChange(idx, field.key as keyof EducationItem, e.target.value)} 
              data-testid={field.testId}
            />
          </div>
        ))}

        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea 
            className={`${styles.textarea} autoExpand`} 
            value={edu.description} 
            placeholder="Describe your education experience..."
            onChange={(e) => {
              handleEducationChange(idx, 'description', e.target.value);
              autoExpand(e);
            }} 
          />
        </div>
      </div>
    ))}
    <button className={styles.addButton} onClick={addEducation}><PlusCircle size={16}/> Add Education</button>
  </div>


  {/* Column 2: Experience */}
  <div className={styles.column}>
    <h3>Work Experience</h3>
    
    {profile.experience.map((exp, idx) => (
      <div key={idx} className={styles.card} data-testid={`experience-card-${idx}`}>
        <div className={styles.cardHeader}>
          <strong data-testid={`experience-title-${idx}`}>Experience {idx + 1}</strong>
          <Trash size={16} className={styles.icon} onClick={() => deleteExperience(idx)} data-testid="trash" />
        </div>

        {[
          { label: 'Title', value: exp.title, key: 'title', testId: `title-input-${idx}`, placeholder: 'Enter job title' },
          { label: 'Organization', value: exp.organization, key: 'organization', testId: `organization-input-${idx}`, placeholder: 'Enter company name' },
          { label: 'Date', value: exp.dates, key: 'dates', testId: `exp-dates-input-${idx}`, placeholder: 'e.g. Jan 2020 - Present' },
          { label: 'Location', value: exp.location, key: 'location', testId: `exp-location-input-${idx}`, placeholder: 'Enter location' },
        ].map((field, i) => (
          <div key={i} className={styles.formGroup}>
            <label>{field.label}</label>
            <input 
              type="text" 
              className={styles.input} 
              value={field.value} 
              placeholder={field.placeholder}
              onChange={(e) => handleExperienceChange(idx, field.key as keyof ExperienceItem, e.target.value)} 
              data-testid={field.testId}
            />
          </div>
        ))}

        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea 
            className={`${styles.textarea} autoExpand`} 
            value={exp.description} 
            placeholder="Describe your responsibilities and achievements..."
            onChange={(e) => {
              handleExperienceChange(idx, 'description', e.target.value);
              autoExpand(e);
            }} 
          />
        </div>
      </div>
    ))}
    <button className={styles.addButton} onClick={addExperience}><PlusCircle size={16}/> Add Experience</button>
  </div>
</div>


{/* Save Button */}
<button 
  className={styles.saveButton} 
  onClick={handleSave} 
  data-testid="save-changes-button"
>
  <Save size={24}/> Save Changes
</button>
      </main>
    </div>
  );
};

export default SettingsPage;
