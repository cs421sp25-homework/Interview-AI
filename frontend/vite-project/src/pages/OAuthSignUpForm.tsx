import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './OAuthSignUpForm.module.css';
import axios from 'axios';
import API_BASE_URL from '../config/api';

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  confirmPasswordError: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  experience: string;
  industry: string;
  careerLevel: string;
  interviewType: string;
  preferredLanguage: string;
  specialization: string;
  resume: File | null;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  keySkills: string;
  preferredRole: string;
  expectations: string;
}

const MultiStepForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // -----------------------------------------------------
  // Retrieve email from OAuth or localStorage
  // -----------------------------------------------------
  const emailFromQuery = queryParams.get('email');
  const emailFromStorage = localStorage.getItem('user_email');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no email from either source, default to an empty string
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    confirmPasswordError: '',
    firstName: '',
    lastName: '',
    email: emailFromQuery || emailFromStorage || '',
    phone: '',  // phone is optional
    jobTitle: '',
    experience: '',
    industry: '',
    careerLevel: '',
    interviewType: '',
    preferredLanguage: '',
    specialization: '',
    resume: null,
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    keySkills: '',
    preferredRole: '',
    expectations: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------
  // Check if the OAuth-provided email is valid
  // (We can't update it if invalid, but at least we warn the user.)
  // -----------------------------------------------------
  useEffect(() => {
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        console.error('Invalid email from OAuth:', formData.email);
        alert('We detected an invalid email from your OAuth provider. Please try again or contact support.');
      }
    } else {
      console.warn('No email found from OAuth or local storage.');
    }
  }, [formData.email]);

  // -----------------------------------------------------
  // Functions to update form data
  // -----------------------------------------------------
  const updateFormData = (field: keyof FormData, value: string | File | null) => {
    // Disallow editing the OAuth email
    if (field === 'email') return;

    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };

      // Validate password when either field changes
      if ((field === 'password' || field === 'confirmPassword') && newFormData.confirmPassword) {
        if (newFormData.password.length < 8) {
          newFormData.confirmPasswordError = 'Password must be at least 8 characters long';
        } else {
          newFormData.confirmPasswordError =
            newFormData.password === newFormData.confirmPassword ? '' : 'Passwords do not match';
        }
      }
      return newFormData;
    });
  };

  // -----------------------------------------------------
  // Handle file changes (Resume upload)
  // -----------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 5MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file format. Please upload a PDF or DOC/DOCX file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    updateFormData('resume', file);
  };

  // -----------------------------------------------------
  // Validate each step's required fields
  // -----------------------------------------------------
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        if (
          !formData.username.trim() ||
          !formData.password.trim() ||
          !formData.confirmPassword.trim()
        ) {
          alert('Please fill in all required fields (username, password, confirm password).');
          return false;
        }
        if (formData.password.length < 8) {
          alert('Password must be at least 8 characters long.');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match.');
          return false;
        }
        return true;
      }
      case 2: {
        // phone is optional now, so remove phone from required checks
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          alert('Please fill in all required fields (first and last name).');
          return false;
        }
        return true;
      }
      case 3: {
        // Step 3 requires a resume
        if (!formData.resume) {
          alert('Please upload your resume.');
          return false;
        }
        return true;
      }
      case 4:
      case 5:
      case 6:
      default:
        // Steps 4, 5, 6 are optional fields, so no validation required
        return true;
    }
  };

  // -----------------------------------------------------
  // Navigation among steps
  // -----------------------------------------------------
  const handleNext = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!validateStep(currentStep)) {
      return;
    }

    // If about to move to step 6, do a slight delay to prevent accidental double-submission
    if (currentStep === 5) {
      setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, 6));
      }, 100);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // -----------------------------------------------------
  // Final form submission
  // -----------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 6) return; // Prevent submit if not on last step

    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          // Convert everything to strings except for the 'resume' File
          if (key === 'resume') {
            formDataToSend.append(key, value as File);
          } else {
            formDataToSend.append(key, value as string);
          }
        }
      });

      // Indicate this is an OAuth-based signup
      formDataToSend.append('isOAuth', 'true');

      const response = await axios.post(`${API_BASE_URL}/api/oauth/signup`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // If submission is successful
      if (response.status === 200) {
        navigate('/dashboard');
      } else {
        // Handle unexpected status codes
        console.error('Unexpected response status:', response.status);
        alert('An unexpected error occurred. Please try again later.');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);

      // Distinguish server error vs. network error
      if (error.response) {
        // Server responded with a status
        const { status, data } = error.response;
        if (status === 400) {
          alert(data.error || 'Invalid submission data. Please check your details.');
        } else if (status === 401) {
          alert('You are not authorized. Please log in again.');
        } else if (status === 500) {
          alert('Server error while processing your form. Please try again later.');
        } else {
          alert(data.error || 'An error occurred. Please try again.');
        }
      } else {
        // No response => Possibly a network issue
        alert('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------
  // Render the form content for each step
  // -----------------------------------------------------
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className={styles.stepTitle}>Create Your Account</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Username</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.username}
                onChange={(e) => updateFormData('username', e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <input
                type="password"
                className={styles.formInput}
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm Password</label>
              <input
                type="password"
                className={styles.formInput}
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
              />
              {formData.confirmPasswordError && (
                <p className={styles.errorText}>{formData.confirmPasswordError}</p>
              )}
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className={styles.stepTitle}>Personal Information</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>First Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.firstName}
                onChange={(e) => updateFormData('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Last Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={formData.email}
                readOnly
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
              <p className={styles.helperText}>Email provided by OAuth authentication</p>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone (optional)</label>
              <input
                type="tel"
                className={styles.formInput}
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h2 className={styles.stepTitle}>Upload Documents</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Resume/CV</label>
              <div
                className={styles.fileInputContainer}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText size={48} color="#ec4899" />
                <p>Click to upload your resume (PDF, DOC, DOCX)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.fileInput}
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {formData.resume && (
                  <p className={styles.fileName}>Selected: {formData.resume.name}</p>
                )}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>LinkedIn Profile URL (optional)</label>
              <input
                type="url"
                className={styles.formInput}
                value={formData.linkedinUrl}
                onChange={(e) => updateFormData('linkedinUrl', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Portfolio URL (optional)</label>
              <input
                type="url"
                className={styles.formInput}
                value={formData.portfolioUrl}
                onChange={(e) => updateFormData('portfolioUrl', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Github URL (optional)</label>
              <input
                type="url"
                className={styles.formInput}
                value={formData.githubUrl}
                onChange={(e) => updateFormData('githubUrl', e.target.value)}
              />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <h2 className={styles.stepTitle}>Professional Information (Optional)</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Current Job Title</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.jobTitle}
                onChange={(e) => updateFormData('jobTitle', e.target.value)}
                placeholder="Enter your current job title"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Years of Experience</label>
              <select
                className={styles.formSelect}
                value={formData.experience}
                onChange={(e) => updateFormData('experience', e.target.value)}
              >
                <option value="">Select experience</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="6-10">6-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Industry</label>
              <select
                className={styles.formSelect}
                value={formData.industry}
                onChange={(e) => updateFormData('industry', e.target.value)}
              >
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Career Level</label>
              <select
                className={styles.formSelect}
                value={formData.careerLevel}
                onChange={(e) => updateFormData('careerLevel', e.target.value)}
              >
                <option value="">Select level</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive Level</option>
              </select>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <h2 className={styles.stepTitle}>Interview Preferences (Optional)</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Interview Type</label>
              <select
                className={styles.formSelect}
                value={formData.interviewType}
                onChange={(e) => updateFormData('interviewType', e.target.value)}
              >
                <option value="">Select type</option>
                <option value="behavioral">Behavioral Interview</option>
                <option value="technical">Technical Interview</option>
                <option value="case">Case Interview</option>
                <option value="general">General Interview</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Preferred Language</label>
              <select
                className={styles.formSelect}
                value={formData.preferredLanguage}
                onChange={(e) => updateFormData('preferredLanguage', e.target.value)}
              >
                <option value="">Select language</option>
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Technical Specialization (if applicable)</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.specialization}
                onChange={(e) => updateFormData('specialization', e.target.value)}
                placeholder="e.g., React, Python, Data Science"
              />
            </div>
          </>
        );
      case 6:
        return (
          <>
            <h2 className={styles.stepTitle}>Additional Information (Optional)</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Key Skills (comma-separated)</label>
              <textarea
                className={styles.formTextarea}
                value={formData.keySkills}
                onChange={(e) => updateFormData('keySkills', e.target.value)}
                placeholder="e.g., Project Management, Team Leadership, Problem Solving"
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Target Role</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.preferredRole}
                onChange={(e) => updateFormData('preferredRole', e.target.value)}
                placeholder="e.g., Senior Software Engineer"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Interview Goals & Expectations</label>
              <textarea
                className={styles.formTextarea}
                value={formData.expectations}
                onChange={(e) => updateFormData('expectations', e.target.value)}
                placeholder="What do you hope to achieve from this interview practice?"
                rows={4}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // -----------------------------------------------------
  // JSX return
  // -----------------------------------------------------
  return (
    <div className={styles.formContainer}>
      <div className={styles.progressBar}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className={styles.progressStep}>
            <div className={`${styles.stepNumber} ${currentStep === step ? styles.active : ''}`}>
              {step}
            </div>
            <div className={styles.stepLabel}>Step {step}</div>
          </div>
        ))}
      </div>

      <form
        onKeyDown={(e) => {
          // Only intercept 'Enter'; let spaces work normally in all fields
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (currentStep !== 6) {
              handleNext(e);
            }
          }
        }}
        onSubmit={handleSubmit}
        className={styles.formCard}
      >
        <div className={styles.formContent}>
          {renderStep()}
        </div>

        <div className={styles.formNavigation}>
          {currentStep > 1 && (
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={handlePrev}
            >
              <ChevronLeft size={20} />
              Previous
            </button>
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={(e) => handleNext(e)}
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="submit"
              className={`${styles.buttonPrimary} ${isSubmitting ? styles.submitting : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className={styles.loadingMessage}>
                  <div className={styles.spinner}></div>
                  <p>Processing your resume, please wait a moment...</p>
                </div>
              ) : (
                <>
                  Submit
                  <CheckCircle size={20} />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// --------------------------------------------------------------------

const OAuthSignUpForm = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo} onClick={() => navigate('/')}>
            <Bot className={styles.logoIcon} />
            <span className={styles.logoText}>InterviewAI</span>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Complete Your OAuth Profile</h1>
          <p>
            We&apos;ve already got your email - just fill in the rest to personalize your interview experience.
          </p>
        </div>
        <MultiStepForm />
      </main>

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default OAuthSignUpForm;
