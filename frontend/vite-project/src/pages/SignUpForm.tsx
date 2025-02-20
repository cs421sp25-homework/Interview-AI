import React, { useState } from 'react';
import { Bot, FileText, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './SignUpForm.module.css';
import axios from 'axios';

interface FormData {
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
  keySkills: string;
  preferredRole: string;
  expectations: string;
}

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
    keySkills: '',
    preferredRole: '',
    expectations: ''
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const updateFormData = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    updateFormData('resume', file);
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep !== 5) {
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          formDataToSend.append(key, value);
        }
      });

      const response = await axios.post('http://localhost:5000/api/signup', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        console.log('Form submitted successfully');
        // Navigate to success page or next step
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error (show error message to user)
    }
  };

  const renderStep = () => {
    switch(currentStep) {
      case 1:
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
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone</label>
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

      case 2:
        return (
          <>
            <h2 className={styles.stepTitle}>Professional Information</h2>
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

      case 3:
        return (
          <>
            <h2 className={styles.stepTitle}>Interview Preferences</h2>
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

      case 4:
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
          </>
        );

      case 5:
        return (
          <>
            <h2 className={styles.stepTitle}>Additional Information</h2>
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

  return (
    <div className={styles.formContainer}>
      <div className={styles.progressBar}>
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className={styles.progressStep}>
            <div className={`${styles.stepNumber} ${currentStep === step ? styles.active : ''}`}>
              {step}
            </div>
            <div className={styles.stepLabel}>
              Step {step}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.formCard}>
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
          
          {currentStep < 5 ? (
            <button 
              type="button"
              className={styles.buttonPrimary}
              onClick={handleNext}
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              type="submit"
              className={styles.buttonPrimary}
            >
              Submit
              <CheckCircle size={20} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

const SignUpForm = () => {
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
          <h1>Set Up Your Interview Profile</h1>
          <p>Complete the following steps to personalize your interview experience</p>
        </div>
        <MultiStepForm />
      </main>

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default SignUpForm;