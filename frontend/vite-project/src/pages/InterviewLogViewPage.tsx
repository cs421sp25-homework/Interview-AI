import React, { useEffect, useRef, useState } from 'react';
import { Home, Sparkles, Check  } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { message, Button, Spin, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import API_BASE_URL from '../config/api';
import styles from './InterviewLogViewPage.module.css';
import InterviewMessage from '../components/InterviewMessage';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  question_type: string;
}

interface InterviewLog {
  id: number;
  thread_id: string;
  log: Message[];
  question_type: string;
}

interface LocationState {
  conversation: Message[];
  thread_id: string;
  question_type: string;
}

const InterviewLogViewPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // For AI-suggested improvements
  const [generatedResponses, setGeneratedResponse] = useState<{ [key: number]: string }>({});
  const [loadingResponses, setLoadingResponses] = useState<{ [key: number]: boolean }>({});
  const [loadingSteps, setLoadingSteps] = useState<{ [key: number]: number }>({});
  const [loadingTexts, setLoadingTexts] = useState<string[]>([
    "Analyzing response...",
    "Generating improvements...",
    "Polishing answer...",
    "Finalizing response..."
  ]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [threadId, setThreadId] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("");
  // ---------------------------------------
  // Ensure user is logged in
  // ---------------------------------------
  useEffect(() => {
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) {
      message.warning('Please log in to view this interview log.');
      navigate('/login');
      return;
    }
  }, [navigate]);

  // ---------------------------------------
  // Handle AI suggestion generation
  // ---------------------------------------
  const handleGenerateResponse = async (messageText: string, index: number) => {
    setLoadingResponses(prev => ({ ...prev, [index]: true }));
    setLoadingSteps(prev => ({ ...prev, [index]: 0 }));
    
    const loadingInterval = setInterval(() => {
      setLoadingSteps(prev => {
        if (prev[index] >= 3) return prev; // If at final step, stay there
        return { ...prev, [index]: prev[index] + 1 };
      });
    }, 1500); // step changes every 1.5s
    
    try {
      // Find the AI question that the user was responding to
      let aiQuestion = '';

      // Look for the most recent AI message before this user message
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i]?.sender === 'ai') {
        if (messages[i]?.sender === 'ai') {
          aiQuestion = messages[i].text;
          break;
        }
      }
      
      console.log("Sending request to generate_good_response with data:", {
        message: messageText,
        ai_question: aiQuestion
      });
      
      const res = await fetch(`${API_BASE_URL}/api/generate_good_response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText,
          ai_question: aiQuestion
        }),
      });
      
      // Handle possible non-2xx statuses
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.response) {
        // Move to a "completed" step
        setLoadingSteps(prev => ({ ...prev, [index]: 4 }));
        
        // Slight delay to show that final state
        setTimeout(() => {
          setGeneratedResponse(prev => ({ ...prev, [index]: data.response }));
          message.success('AI response generated successfully');
          setLoadingResponses(prev => ({ ...prev, [index]: false }));
          clearInterval(loadingInterval);
        }, 500);
      } else {
        message.error('Failed to generate a response. Please try again.');
        setLoadingResponses(prev => ({ ...prev, [index]: false }));
        clearInterval(loadingInterval);
      }
    } catch (error: any) {
      console.error("Error generating response:", error);
      message.error(
        error.message === 'Failed to fetch'
          ? 'Network error. Please check your connection.'
          : 'Failed to generate response. Please try again.'
      );
      setLoadingResponses(prev => ({ ...prev, [index]: false }));
      clearInterval(loadingInterval);
    }
  };

  // ---------------------------------------
  // Load interview log
  // ---------------------------------------
  useEffect(() => {
    const container = document.getElementById('logViewContainer');
    if (container) {
      container.style.height = 'calc(100vh - 100px)';
    }
    
    setLoading(true);
    if (location.state && (location.state as LocationState).conversation) {
      // Load conversation from router state
      const { conversation, thread_id, question_type } = location.state as LocationState;
      setMessages(conversation);
      setThreadId(thread_id);
      setQuestionType(question_type);
      setTimeout(() => setLoading(false), 300);
      console.log('Thread ID:', thread_id);
    } else {
      // Fetch from DB if not in router state
      const fetchLog = async () => {
        try {
          const userEmail = localStorage.getItem('user_email') || '';
          if (!userEmail) {
            // Just in case user_email is missing in localStorage
            message.warning('Please log in to view this interview log.');
            navigate('/login');
            return;
          }

          const res = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
          if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
          }

          const data = await res.json();
          if (!data || !data.data) {
            message.error('No data returned from server. Please try again later.');
            setLoading(false);
            return;
          }
          
          const log = data.data.find((l: any) => String(l.id) === id);
          if (log && log.log) {
            const conversation = typeof log.log === 'string' ? JSON.parse(log.log) : log.log;
            setMessages(conversation);
            setThreadId(log.thread_id);
            setQuestionType(log.question_type || '');
          } else {
            message.error('Interview log not found.');
          }
        } catch (error: any) {
          console.error('Failed to load interview log:', error);
          message.error(
            error.message === 'Failed to fetch'
              ? 'Network error. Please check your connection.'
              : 'Failed to load interview log.'
          );
        } finally {
          setLoading(false);
        }
      };
      fetchLog();
    }
  }, [id, location.state, navigate]);

  // ---------------------------------------
  // Scroll to bottom on messages update
  // ---------------------------------------
  useEffect(() => {
    if (!loading && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ---------------------------------------
  // Navigation
  // ---------------------------------------
  const handleBack = () => {
    navigate('/interview/history');
  };

  // ---------------------------------------
  // Helper to render loading icons
  // ---------------------------------------
  const antIcon = <LoadingOutlined style={{ fontSize: 20, color: '#ec4899' }} spin />;

  // ---------------------------------------
  // Helper function to render step progress
  // ---------------------------------------
  const renderLoadingSteps = (index: number) => {
    const currentStep = loadingSteps[index] || 0;
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>
          {loadingTexts[currentStep] || "Generating improved response..."}
        </div>
        
        <div className={styles.loadingSteps}>
          <div className={styles.loadingStep}>
            <div
              className={`
                ${styles.loadingStepDot}
                ${currentStep >= 0 ? styles.active : ''}
                ${currentStep > 0 ? styles.completed : ''}
              `}
            ></div>
            <div
              className={`
                ${styles.loadingStepText}
                ${currentStep >= 0 ? styles.active : ''}
                ${currentStep > 0 ? styles.completed : ''}
              `}
            >
              Analyze
            </div>
          </div>
          
          <div className={styles.loadingStep}>
            <div
              className={`
                ${styles.loadingStepDot}
                ${currentStep >= 1 ? styles.active : ''}
                ${currentStep > 1 ? styles.completed : ''}
              `}
            ></div>
            <div
              className={`
                ${styles.loadingStepText}
                ${currentStep >= 1 ? styles.active : ''}
                ${currentStep > 1 ? styles.completed : ''}
              `}
            >
              Improve
            </div>
          </div>
          
          <div className={styles.loadingStep}>
            <div
              className={`
                ${styles.loadingStepDot}
                ${currentStep >= 2 ? styles.active : ''}
                ${currentStep > 2 ? styles.completed : ''}
              `}
            ></div>
            <div
              className={`
                ${styles.loadingStepText}
                ${currentStep >= 2 ? styles.active : ''}
                ${currentStep > 2 ? styles.completed : ''}
              `}
            >
              Refine
            </div>
          </div>
          
          <div className={styles.loadingStep}>
            <div
              className={`
                ${styles.loadingStepDot}
                ${currentStep >= 3 ? styles.active : ''}
                ${currentStep > 3 ? styles.completed : ''}
              `}
            ></div>
            <div
              className={`
                ${styles.loadingStepText}
                ${currentStep >= 3 ? styles.active : ''}
                ${currentStep > 3 ? styles.completed : ''}
              `}
            >
              Finalize
            </div>
          </div>
        </div>
        
        <div className={styles.loadingProgress}>
          <div className={styles.loadingProgressBar}></div>
        </div>
      </div>
    );
  };

  // ---------------------------------------
  // Render
  // ---------------------------------------
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={handleBack}
        >
          <Home size={18} />
          Back to History
        </button>
        <h1 className={styles.title}>Interview Log</h1>
        <div className={styles.placeholder} />
      </div>

      {/* Main Content */}
      <div id="logViewContainer" className={styles.contentContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin indicator={antIcon} />
            <div className={styles.loadingText}>Loading interview logs...</div>
          </div>
        ) : (
          <div ref={chatContainerRef} className={styles.chatContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={
                  msg.sender === 'ai'
                    ? styles.aiMessageWrapper
                    : styles.userMessageWrapper
                }
              >
                {/* Avatar */}
                <div className={styles.avatarContainer}>
                  {msg.sender === 'ai' ? (
                    <div className={styles.botAvatar}>
                      <span role="img" aria-label="bot">🤖</span>
                    </div>
                  ) : (
                    <div className={styles.userAvatar}>
                      {localStorage.getItem('user_photo_url') ? (
                        <img
                          src={localStorage.getItem('user_photo_url') || ''}
                          alt="User"
                          className={styles.avatarImage}
                        />
                      ) : (
                        localStorage
                          .getItem('user_email')
                          ?.charAt(0)
                          .toUpperCase() || 'U'
                      )}
                    </div>
                  )}
                </div>

                {/* If AI, use InterviewMessage */}
                {msg.sender === 'ai' ? (
                  <InterviewMessage
                    message={msg}
                    messageId={`${id}-${index}`}
                    threadId={threadId}
                    questionType={questionType}
                    isFirstMessage={index === 0}
                  />
                ) : (
                  // Otherwise, user message
                  <div className={styles.userMessage}>
                    <div className={styles.messageContent}>
                      {msg.text}
                    </div>
                    <div className={styles.generatedContainer}>
                      {generatedResponses[index] ? (
                        <div className={styles.generatedResponse}>
                          {generatedResponses[index]}
                          <Tooltip title="This is an AI-recommended response for your reference">
                            <span className={styles.infoIcon}><Check size={16} /></span>
                          </Tooltip>
                        </div>
                      ) : loadingResponses[index] ? (
                        renderLoadingSteps(index)
                      ) : (
                        <Tooltip title="Generate an AI-suggested response to improve your answer quality">
                          <Button
                            onClick={() => handleGenerateResponse(msg.text, index)}
                          >
                            <Sparkles size={16} />
                            <span>Generate AI Response</span>
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewLogViewPage;
