import React, { useState, useEffect, useRef } from 'react';
import { Bot, Plus, X, MoreVertical, Edit, Trash, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PromptPage.module.css';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { message } from 'antd';

interface InterviewConfig {
  id: number;
  interview_name: string;
  company_name: string;
  job_description: string;
  question_type: string;
  interview_type: string;
  language: string;
}

const PromptPage = () => {
  const navigate = useNavigate();
  
  // Form fields
  const [id, setInterviewId] = useState<number | null>(null);
  const [interview_name, setInterviewName] = useState('');
  const [company_name, setCompanyName] = useState('');
  const [job_description, setJobDescription] = useState('');
  const [question_type, setQuestionType] = useState('behavioral');
  const [interview_type, setInterviewType] = useState('text');
  const [language, setLanguage] = useState('english'); 
  
  // Existing configs
  const [savedInterviewConfigs, setSavedInterviewConfigs] = useState<InterviewConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<InterviewConfig | null>(null);

  // Control UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const email = localStorage.getItem('user_email') || '';
  const pageRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------
  // Check user login and load interview configs
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!email) {
      message.warning("You must be logged in to manage interview configurations.");
      navigate('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/get_interview_configs/${email}`);
        setSavedInterviewConfigs(response.data);
      } catch (error: any) {
        console.error("Error fetching interview configs:", error);

        if (error.response) {
          const { status, data } = error.response;
          if (status === 401) {
            message.error('Session expired or unauthorized. Please log in again.');
            navigate('/login');
          } else {
            message.error(data?.message || 'Failed to load interview configurations. Please try again.');
          }
        } else {
          message.error('Network error. Could not fetch interview configurations.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [email, navigate]);

  // ------------------------------------------------------------------
  // Close the menu if user clicks outside
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Start Interview with Selected Config
  // ------------------------------------------------------------------
  const handleStartInterview = () => {
    if (!selectedConfig) {
      message.error('Please select a configuration first');
      return;
    }
    startInterviewWithConfig(selectedConfig);
  };

  const startInterviewWithConfig = async (config: InterviewConfig) => {
    try {
      localStorage.setItem('current_config', config.interview_name);
      localStorage.setItem('current_config_id', config.id.toString());

      // Attempt to fetch user profile data to get photo
      try {
        const response = await axios.get(`${API_BASE_URL}/api/profile/${email}`);
        if (response.data?.data?.photo_url) {
          localStorage.setItem('user_photo_url', response.data.data.photo_url);
        }
      } catch (error: any) {
        console.error('Error fetching user profile for photo URL:', error);
        // Not critical, so we won't block the user
      }

      localStorage.removeItem('current_thread_id');

      // Navigate to the correct interview mode
      if (config.interview_type === 'voice') {
        navigate(`/interview/voice`);
      } else {
        navigate(`/interview/text`);
      }
    } catch (error: any) {
      console.error('Error starting interview:', error);
      message.error('Failed to start interview. Please try again.');
    }
  };

  // ------------------------------------------------------------------
  // Create or Update config
  // ------------------------------------------------------------------
  const handleSaveConfig = async () => {
    const interviewConfig = {
      id,
      interview_name,
      company_name,
      job_description,
      question_type,
      interview_type,
      language,
      email
    };

    if (
      !interviewConfig.interview_name || 
      !interviewConfig.company_name || 
      !interviewConfig.question_type || 
      !interviewConfig.interview_type ||
      !interviewConfig.language
    ) {
      message.error("Please fill in all required fields marked with *");
      return;
    }

    setLoading(true);

    try {
      if (isEditing && id) {
        // Update existing
        await axios.put(`${API_BASE_URL}/api/update_interview_config/${id}`, interviewConfig);
        message.success("Interview configuration updated successfully!");

        // Refresh local state
        const updatedConfigs = savedInterviewConfigs.map(cfg =>
          cfg.id === id ? { ...interviewConfig, id: cfg.id } as InterviewConfig : cfg
        );
        setSavedInterviewConfigs(updatedConfigs);

        // Also refresh selection
        setSelectedConfig({ ...interviewConfig, id } as InterviewConfig);

      } else {
        // Create new
        const response = await axios.post(`${API_BASE_URL}/api/create_interview_config`, interviewConfig);
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

      // Clean up modal states
      setIsModalOpen(false);
      setIsEditing(false);
      setInterviewId(null);
      setInterviewName('');
      setCompanyName('');
      setJobDescription('');
      setQuestionType('behavioral');
      setInterviewType('text');
      setLanguage('english');
    } catch (error: any) {
      console.error("Error saving interview configuration:", error);

      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          message.error(data?.message || 'Bad request. Check your inputs.');
        } else if (status === 401) {
          message.error('Session expired or unauthorized. Please log in again.');
          navigate('/login');
        } else if (status === 500) {
          message.error('Server error while saving configuration.');
        } else {
          message.error('Failed to save configuration. Please try again.');
        }
      } else {
        message.error('Network error. Could not reach the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Editing an existing config
  // ------------------------------------------------------------------
  const handleEdit = (index: number) => {
    const selected = savedInterviewConfigs[index];
    setInterviewId(selected.id);
    setInterviewName(selected.interview_name);
    setCompanyName(selected.company_name);
    setJobDescription(selected.job_description || '');
    setQuestionType(selected.question_type);
    setInterviewType(selected.interview_type);
    setLanguage(selected.language || 'english');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Deleting a config
  // ------------------------------------------------------------------
  const handleDelete = (index: number, configId: number) => {
    if (!window.confirm("Are you sure you want to delete this configuration?")) return;

    setLoading(true);
    axios.delete(`${API_BASE_URL}/api/delete_interview_config/${configId}`)
      .then((response) => {
        if (response.status === 200) {
          const updatedConfigs = savedInterviewConfigs.filter((_, i) => i !== index);
          setSavedInterviewConfigs(updatedConfigs);
          message.success('Interview configuration deleted successfully!');

          if (selectedConfig && selectedConfig.id === configId) {
            setSelectedConfig(null);
          }
        }
      })
      .catch((error: any) => {
        console.error("Error deleting interview config:", error);
        if (error.response) {
          const { status, data } = error.response;
          if (status === 401) {
            message.error('Session expired or unauthorized. Please log in again.');
            navigate('/login');
          } else {
            message.error(data?.message || 'Failed to delete configuration. Please try again.');
          }
        } else {
          message.error('Network error. Could not delete configuration.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // ------------------------------------------------------------------
  // Create new config
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setIsEditing(false);
    setInterviewId(null);
    setInterviewName('');
    setCompanyName('');
    setJobDescription('');
    setQuestionType('behavioral');
    setInterviewType('text');
    setLanguage('english');
    setIsModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className={styles.pageContainer} ref={pageRef}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo} onClick={() => navigate('/dashboard')}>
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

        <div className={styles.createButtonContainer}>
          <button
            className={styles.createButton}
            onClick={openCreateModal}
            disabled={loading}
          >
            <Plus size={20} /> Create Custom Interview Configuration
          </button>
        </div>

        <div className={styles.interviewList}>
          {savedInterviewConfigs.map((interview, index) => (
            <div
              key={index}
              className={`
                ${styles.interviewCard} 
                ${selectedConfig === interview ? styles.selectedCard : ''}
              `}
              onClick={() => setSelectedConfig(interview)}
            >
              <div className={styles.cardContent}>
                <div>
                  <h3 className={styles.interviewName} data-testid="interview-name">
                    {interview.interview_name}
                  </h3>
                  <div className={styles.cardDetails} data-testid="card-details">
                    <p><strong>Company:</strong> {interview.company_name}</p>
                    <p><strong>Question Type:</strong> {interview.question_type}</p>
                    <p><strong>Interview Type:</strong> {interview.interview_type}</p>
                    {/* Display the Language here */}
                    <p><strong>Language:</strong> {interview.language}</p>
                  </div>
                </div>

                <div className={styles.menuContainer}>
                  <MoreVertical
                    className={styles.menuIcon}
                    data-testid="config-menu-button"
                    size={24}
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
          className={`
            ${styles.buttonPrimary} 
            ${!selectedConfig || loading ? styles.buttonDisabled : ''}
          `}
          onClick={handleStartInterview}
          disabled={!selectedConfig || loading}
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
            <h2>
              {isEditing ? 'Edit Interview Configuration' : 'Create New Configuration'}
            </h2>

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
                <select
                  className={styles.formInput}
                  value={question_type}
                  onChange={(e) => setQuestionType(e.target.value)}
                  required
                >
                  <option value="behavioral">Behavioral</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Interview Type <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formInput}
                  value={interview_type}
                  onChange={(e) => setInterviewType(e.target.value)}
                  required
                  disabled={isEditing}
                >
                  <option value="text">Text</option>
                  <option value="voice">Voice</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Language <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formInput}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                  data-testid="language-input"
                >
                  <option value="english">English</option>
                  <option value="french">French</option>
                  <option value="spanish">Spanish</option>
                  <option value="mandarin">Mandarin</option>
                  {/* Add more languages as needed */}
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
                  disabled={loading}
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
