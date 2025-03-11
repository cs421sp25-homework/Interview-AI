import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, X, MoreVertical, Edit, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PromptPage.module.css';
import axios from 'axios';
import API_BASE_URL from '../config/api'

const PromptPage = () => {
  interface InterviewConfig {
    id: number;
    interview_name: string;
    company_name: string;
    job_description: string;
    question_type: string;
    interview_type: string;
  }

  const navigate = useNavigate();
  const [id, setInterviewId] = useState<number|null>(null);
  const [interview_name, setInterviewName] = useState('');
  const [company_name, setCompanyName] = useState('');
  const [job_description, setJobDescription] = useState('');
  const [question_type, setQuestionType] = useState('behavioral');
  const [interview_type, setInterviewType] = useState('text');
  const [savedInterviewConfigs, setSavedInterviewConfigs] = useState<InterviewConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<InterviewConfig | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const email = localStorage.getItem('user_email') || '';
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/get_interview_configs/${email}`)
      .then((response) => {
        console.log("API Response:", response.data);
        setSavedInterviewConfigs(response.data);
      })
      .catch((error) => {
        console.error("Error fetching interview configs:", error);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen !== null && pageRef.current && !pageRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleStartInterview = () => {
    navigate('/interview');
  };  

  const handleSaveConfig = async () => {
    const interviewConfig = {
      id,
      interview_name,
      company_name,
      job_description,
      question_type,
      interview_type,
      email
    };
  
    if (!interviewConfig.interview_name || !interviewConfig.company_name || !interviewConfig.question_type || !interviewConfig.interview_type) {
      alert("Please fill in all required fields marked with *");
      return;
    }
  
    try {
      if (selectedConfig) { // Editing an existing config
        await axios.put(`${API_BASE_URL}/api/update_interview_config/${selectedConfig.id}`, interviewConfig);
        console.log("Interview configuration updated successfully.");
        alert("Interview configuration updated successfully!");
      } else { // Saving a new config
        await axios.post(`${API_BASE_URL}/api/create_interview_config`, interviewConfig);
        console.log("New interview configuration saved successfully.");
        alert("New interview configuration saved successfully!");
      }
  
      // Refresh interview configs after saving
      const response = await axios.get(`${API_BASE_URL}/api/get_interview_configs/${email}`);
      setSavedInterviewConfigs(response.data);
  
      setIsModalOpen(false);
      setSelectedConfig(null);
      setInterviewId(null);
      setInterviewName('');
      setCompanyName('');
      setJobDescription('');
      setQuestionType('behavioral');
      setInterviewType('text');
    } catch (error) {
      console.error("Error saving interview configuration:", error);
    }
  };

  const handleEdit = (index: number) => {
    const selected = savedInterviewConfigs[index];
    setInterviewId(selected.id);
    setInterviewName(selected.interview_name);
    setCompanyName(selected.company_name);
    setJobDescription(selected.job_description);
    setQuestionType(selected.question_type);
    setInterviewType(selected.interview_type);
    setIsModalOpen(true); 
  };
  
  const handleDelete = (index: number, id: number) => {
    axios
      .delete(`${API_BASE_URL}/api/delete_interview_config/${id}`)
      .then((response) => {
        if (response.status === 200) {
          const updatedConfigs = savedInterviewConfigs.filter((_, i) => i !== index);
          setSavedInterviewConfigs(updatedConfigs);
          localStorage.setItem('interviews', JSON.stringify(updatedConfigs));
          alert('Interview configuration deleted successfully!');
        }
      })
      .catch((error) => {
        console.error("Error deleting interview config:", error);
        alert('Failed to delete the interview configuration. Please try again.');
      });
  };
  

  return (
    <div className={styles.pageContainer} ref={pageRef}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo} onClick={() => navigate('/')}>  
            <Bot className={styles.logoIcon} />
            <span className={styles.logoText}>InterviewAI</span>
          </div>
          <button 
            className={styles.backButton} 
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Interview Configurations</h1>
          <p>Create or select an interview configuration</p>
        </div>

        <button 
  className={styles.buttonPrimary} 
  onClick={() => {
    setSelectedConfig(null);
    setIsModalOpen(true);
  }}
>
          <Plus size={20} /> Create Custom Interview Configuration
        </button>

        <div className={styles.interviewList}>
          {savedInterviewConfigs.map((interview, index) => (
            <div
              key={index}
              className={`${styles.interviewCard} ${selectedConfig === interview ? styles.selectedCard : ''}`}
              onClick={() => setSelectedConfig(interview)}
            >
              <div className={styles.cardContent}>
                <div>
                  <h3 className={styles.interviewName}>{interview.interview_name}</h3>
                  <div className={styles.cardDetails}>
                    <p><strong>Company:</strong> {interview.company_name}</p>
                    <p><strong>Question Type:</strong> {interview.question_type}</p>
                    <p><strong>Interview Type:</strong> {interview.interview_type}</p>
                  </div>
                </div>

                <div className={styles.menuContainer}>
                  <MoreVertical 
                    className={styles.menuIcon} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === index ? null : index);
                    }} 
                  />

                  {menuOpen === index && (
                    <div className={styles.menuDropdown}>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(index);
                        setMenuOpen(null);
                      }}>
                        <Edit size={16} /> Edit
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(index, interview.id);
                        setMenuOpen(null);
                      }}>
                        <Trash size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className={styles.buttonPrimary} onClick={handleStartInterview}>
          Back to Interview Page
        </button>
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
                <label className={styles.formLabel}>
                  Interview Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={interview_name}
                  onChange={(e) => setInterviewName(e.target.value)}
                  placeholder="Enter interview session name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Company Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={company_name}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter the company name"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Job Description <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  className={styles.formInput}
                  value={job_description}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Enter the job description (optional)"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Question Type <span className={styles.required}>*</span>
                </label>
                <select className={styles.formInput} value={question_type} onChange={(e) => setQuestionType(e.target.value)} required>
                  <option value="behavioral">Behavioral</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Interview Type <span className={styles.required}>*</span>
                </label>
                <select className={styles.formInput} value={interview_type} onChange={(e) => setInterviewType(e.target.value)} required>
                  <option value="text">Text</option>
                  <option value="voice">Voice</option>
                </select>
              </div>

              <button type="button" className={styles.buttonPrimary} onClick={handleSaveConfig}>
                Save Configuration
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
