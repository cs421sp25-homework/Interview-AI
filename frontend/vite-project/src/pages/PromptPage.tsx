import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, X, MoreVertical, Edit, Trash, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PromptPage.module.css';
import axios from 'axios';
import API_BASE_URL from '../config/api'
import { message } from 'antd';

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
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const email = localStorage.getItem('user_email') || '';
  const pageRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      // Check if user is logged in
      if (!email) {
        console.log("User not logged in, redirecting to login page");
        navigate('/login');
        return;
      }

      axios.get(`${API_BASE_URL}/api/get_interview_configs/${email}`)
        .then((response) => {
          console.log("API Response:", response.data);
          setSavedInterviewConfigs(response.data);
        })
        .catch((error) => {
          console.error("Error fetching interview configs:", error);
        });
    } catch (error) {
      console.error('Error in PromptPage:', error);
      navigate('/login');
    }
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
    if (selectedConfig) {
      startInterviewWithConfig(selectedConfig);
    } else {
      message.error('Please select a configuration first');
    }
  };  
  
  const startInterviewWithConfig = async (config: InterviewConfig) => {
    try {
      localStorage.setItem('current_config', config.interview_name);
      localStorage.setItem('current_config_id', config.id.toString());
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/profile/${email}`);
        if (response.data && response.data.data && response.data.data.photo_url) {
          localStorage.setItem('user_photo_url', response.data.data.photo_url);
        }
      } catch (error) {
        console.error('Error fetching user profile for photo URL:', error);
      }
      
      localStorage.removeItem('current_thread_id');
      
      if (config.interview_type === 'voice') {
        navigate(`/interview/voice`);
      } else {
        navigate(`/interview/text`);
      }
    } catch (error) {
      console.error('Error starting interview:', error);
    }
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
      message.error("Please fill in all required fields marked with *");
      return;
    }
  
    try {
      if (isEditing && id) { 
        await axios.put(`${API_BASE_URL}/api/update_interview_config/${id}`, interviewConfig);
        console.log("Interview configuration updated successfully.");
        message.success("Interview configuration updated successfully!");
        
        const updatedConfigs = savedInterviewConfigs.map(config => 
          config.id === id ? {...interviewConfig, id: config.id} as InterviewConfig : config
        );
        setSavedInterviewConfigs(updatedConfigs);
        
        setSelectedConfig({...interviewConfig, id} as InterviewConfig);
      } else { 
        const response = await axios.post(`${API_BASE_URL}/api/create_interview_config`, interviewConfig);
        console.log("New interview configuration saved successfully.");
        message.success("New interview configuration saved successfully!");
        
        if (response.data && response.data.id) {
          const newConfig = {
            ...interviewConfig,
            id: response.data.id
          } as InterviewConfig;
          
          setSavedInterviewConfigs([...savedInterviewConfigs, newConfig]);
          setSelectedConfig(newConfig);
        }
      }
  
      setIsModalOpen(false);
      setIsEditing(false);
      setInterviewId(null);
      setInterviewName('');
      setCompanyName('');
      setJobDescription('');
      setQuestionType('behavioral');
      setInterviewType('text');
    } catch (error) {
      console.error("Error saving interview configuration:", error);
      message.error("Failed to save configuration. Please try again.");
    }
  };

  const handleEdit = (index: number) => {
    const selected = savedInterviewConfigs[index];
    setInterviewId(selected.id);
    setInterviewName(selected.interview_name);
    setCompanyName(selected.company_name);
    setJobDescription(selected.job_description || '');
    setQuestionType(selected.question_type);
    setInterviewType(selected.interview_type);
    setIsEditing(true);
    setIsModalOpen(true); 
  };
  
  const handleDelete = (index: number, id: number) => {
    if (window.confirm("Are you sure you want to delete this configuration?")) {
      axios
        .delete(`${API_BASE_URL}/api/delete_interview_config/${id}`)
        .then((response) => {
          if (response.status === 200) {
            const updatedConfigs = savedInterviewConfigs.filter((_, i) => i !== index);
            setSavedInterviewConfigs(updatedConfigs);
            message.success('Interview configuration deleted successfully!');
            
            if (selectedConfig && selectedConfig.id === id) {
              setSelectedConfig(null);
            }
          }
        })
        .catch((error) => {
          console.error("Error deleting interview config:", error);
          message.error('Failed to delete the interview configuration. Please try again.');
        });
    }
  };
  
  const openCreateModal = () => {
    setIsEditing(false);
    setInterviewId(null);
    setInterviewName('');
    setCompanyName('');
    setJobDescription('');
    setQuestionType('behavioral');
    setInterviewType('text');
    setIsModalOpen(true);
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
          <p>Select a configuration and click "Start Interview"</p>
        </div>

        <button 
          className={styles.buttonPrimary} 
          onClick={openCreateModal}
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
                  <h3 className={styles.interviewName} data-testid="interview-name">{interview.interview_name}</h3>
                  <div className={styles.cardDetails} data-testid="card-details">
                    <p><strong>Company:</strong> {interview.company_name}</p>
                    <p><strong>Question Type:</strong> {interview.question_type}</p>
                    <p><strong>Interview Type:</strong> {interview.interview_type}</p>
                  </div>
                </div>

                <div className={styles.menuContainer}>
                  <MoreVertical 
                    className={styles.menuIcon} 
                    data-testid="config-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === index ? null : index);
                    }} 
                  />

                  {menuOpen === index && (
                    <div className={styles.menuDropdown}>
                      <button 
                        data-testid="edit-config-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(index);
                          setMenuOpen(null);
                        }}
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        data-testid="delete-config-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(index, interview.id);
                          setMenuOpen(null);
                        }}
                      >
                        <Trash size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="button" 
          className={`${styles.buttonPrimary} ${!selectedConfig ? styles.buttonDisabled : ''}`} 
          onClick={handleStartInterview}
          disabled={!selectedConfig}
        >
          <Play size={20} /> Start Interview with Selected Configuration
        </button>
        
      </main>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h2>{isEditing ? 'Edit Interview Configuration' : 'Create New Configuration'}</h2>
            <form className={styles.formCard}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Session Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={interview_name}
                  onChange={(e) => setInterviewName(e.target.value)}
                  placeholder="Enter interview session name"
                  data-testid="interview-name-input"
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
                  data-testid="company-name-input"
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
              
              

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.buttonSecondary}
                  data-testid="cancel-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.buttonPrimary} 
                  data-testid="save-update-button"
                  onClick={handleSaveConfig}
                >
                  {isEditing ? 'Update' : 'Save'}
                </button>
              </div>

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
