import React, { useState } from 'react';
import { Bot, Plus, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PromptPage.module.css';

const PromptPage = () => {
  const navigate = useNavigate();
  const [interviewName, setInterviewName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questionType, setQuestionType] = useState('behavioral');
  const [interviewType, setInterviewType] = useState('text');

  const handleStartInterview = () => {
    const interviewConfig = {
      interviewName,
      companyName,
      jobDescription,
      questionType,
      interviewType,
    };
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
          <h1>Customize Your Interview</h1>
          <p>Set up your interview details and prompts</p>
        </div>

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
      </main>

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default PromptPage;
