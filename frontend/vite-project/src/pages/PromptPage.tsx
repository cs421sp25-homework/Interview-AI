import React, { useState, useEffect } from 'react';
import { Bot, Plus, ClipboardList, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PromptPage.module.css';

const PromptPage = () => {
  const navigate = useNavigate();
  const [interviewName, setInterviewName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questionType, setQuestionType] = useState('behavioral');
  const [interviewType, setInterviewType] = useState('text');
  const [savedInterviewConfigs, setSavedInterviewConfigs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // const storedInterviewConfigs = JSON.parse(localStorage.getItem('interviewConfigs')) || [];
    // setSavedInterviewConfigs(storedInterviewConfigs);
  }, []);

  const handleStartInterview = () => {
    const interviewConfig = {
      interviewName,
      companyName,
      jobDescription,
      questionType,
      interviewType,
    };
    
    const updatedInterviewConfigs = [...savedInterviewConfigs, interviewConfig];
    // setSavedInterviewConfigs(updatedInterviewConfigs);
    localStorage.setItem('interviews', JSON.stringify(updatedInterviewConfigs));
    navigate('/interview', { state: interviewConfig });
  };

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
          <h1>Previous Interviews</h1>
          <p>View or start a new interview</p>
        </div>

        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Create Custom Interview Configuration
        </button>

        <div className={styles.interviewList}>
          {/* {savedInterviews.length === 0 ? (
            <p>No interviews found. Start a new one!</p>
          ) : (
            savedInterviews.map((interview, index) => (
              <div key={index} className={styles.interviewCard}>
                <h3>{interview.interviewName}</h3>
                <p><strong>Company:</strong> {interview.companyName}</p>
                <p><strong>Type:</strong> {interview.questionType} - {interview.interviewType}</p>
                <button className={styles.buttonSecondary} onClick={() => navigate('/interview', { state: interview })}>
                  Resume
                </button>
              </div>
            ))
          )} */}
        </div>
      </main>

        {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h2>Customize Your Interview</h2>
            <form className={styles.formCard}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interview Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={interviewName}
                  onChange={(e) => setInterviewName(e.target.value)}
                  placeholder="Enter interview session name"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter the company name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Job Description</label>
                <textarea
                  className={styles.formInput}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Enter the job description"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Question Type</label>
                <select className={styles.formInput} value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                  <option value="behavioral">Behavioral</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interview Type</label>
                <select className={styles.formInput} value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                  <option value="text">Text</option>
                  <option value="voice">Voice</option>
                </select>
              </div>

              <button type="button" className={styles.buttonPrimary} onClick={handleStartInterview}>
                Start Interview
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default PromptPage;
