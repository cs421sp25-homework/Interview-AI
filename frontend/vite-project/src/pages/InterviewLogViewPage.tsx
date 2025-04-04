import React, { useEffect, useRef, useState } from 'react';
import { Home, Sparkles, Check, Brain, Lightbulb, PenTool } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { message, Button, Spin, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import API_BASE_URL from '../config/api';
import styles from './InterviewLogViewPage.module.css';
import InterviewMessage from '../components/InterviewMessage';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

interface InterviewLog {
  id: number;
  thread_id: string;
  log: Message[];
}

interface LocationState {
  conversation: Message[];
  thread_id: string;
}

const InterviewLogViewPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleGenerateResponse = async (messageText: string, index: number) => {
    // Set loading for this index
    setLoadingResponses(prev => ({ ...prev, [index]: true }));
    setLoadingSteps(prev => ({ ...prev, [index]: 0 }));
    
    // Start the loading animation
    const loadingInterval = setInterval(() => {
      setLoadingSteps(prev => {
        // If we're already at step 3 (final step), keep it there
        if (prev[index] >= 3) return prev;
        return { ...prev, [index]: prev[index] + 1 };
      });
    }, 1500); // Change steps every 1.5 seconds
    
    try {
      // Find the AI question that the user was responding to
      let aiQuestion = '';
      
      // Look for the most recent AI message before this user message
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i] && messages[i].sender === 'ai') {
          aiQuestion = messages[i].text;
          break;
        }
      }
      
      // Debug logging
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
      
      const data = await res.json();
      if (data.response) {
        // Set step to completed before clearing interval
        setLoadingSteps(prev => ({ ...prev, [index]: 4 })); // 4 is completed
        
        // Short delay to show completion state
        setTimeout(() => {
          setGeneratedResponse(prev => ({ ...prev, [index]: data.response }));
          message.success('AI response generated successfully');
          setLoadingResponses(prev => ({ ...prev, [index]: false }));
          clearInterval(loadingInterval);
        }, 500);
      } else {
        message.error('Failed to generate response');
        setLoadingResponses(prev => ({ ...prev, [index]: false }));
        clearInterval(loadingInterval);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      message.error('Failed to generate response');
      setLoadingResponses(prev => ({ ...prev, [index]: false }));
      clearInterval(loadingInterval);
    }
  };

  // Avoid layout shift by ensuring container exists on first render.
  useEffect(() => {
    const container = document.getElementById('logViewContainer');
    if (container) {
      container.style.height = 'calc(100vh - 100px)';
    }
    
    setLoading(true);
    if (location.state && (location.state as LocationState).conversation) {
      setMessages((location.state as LocationState).conversation);
      setThreadId((location.state as LocationState).thread_id);
      setTimeout(() => setLoading(false), 300);
      console.log('Thread ID:', (location.state as LocationState).thread_id);
    } else {
      const fetchLog = async () => {
        try {
          const userEmail = localStorage.getItem('user_email') || '';
          const res = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
          const data = await res.json();
          const log = data.data.find((l: InterviewLog) => String(l.id) === id);
          if (log && log.log) {
            const conversation = typeof log.log === 'string' ? JSON.parse(log.log) : log.log;
            setMessages(conversation);
            setThreadId(log.thread_id);
          } else {
            message.error('Interview log not found.');
          }
        } catch (error) {
          console.error(error);
          message.error('Failed to load interview log.');
        } finally {
          setLoading(false);
        }
      };
      fetchLog();
    }
  }, [id, location.state]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!loading && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleBack = () => {
    navigate('/interview/history');
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 20, color: '#ec4899' }} spin />;

  // Helper function to render loading steps
  const renderLoadingSteps = (index: number) => {
    const currentStep = loadingSteps[index] || 0;
    
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingMessage}>
          {loadingTexts[currentStep] || "Generating improved response..."}
        </div>
        
        <div className={styles.loadingSteps}>
          <div className={styles.loadingStep}>
            <div className={`${styles.loadingStepDot} ${currentStep >= 0 ? styles.active : ''} ${currentStep > 0 ? styles.completed : ''}`}></div>
            <div className={`${styles.loadingStepText} ${currentStep >= 0 ? styles.active : ''} ${currentStep > 0 ? styles.completed : ''}`}>Analyze</div>
          </div>
          
          <div className={styles.loadingStep}>
            <div className={`${styles.loadingStepDot} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}></div>
            <div className={`${styles.loadingStepText} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>Improve</div>
          </div>
          
          <div className={styles.loadingStep}>
            <div className={`${styles.loadingStepDot} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}></div>
            <div className={`${styles.loadingStepText} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}>Refine</div>
          </div>
          
          <div className={styles.loadingStep}>
            <div className={`${styles.loadingStepDot} ${currentStep >= 3 ? styles.active : ''} ${currentStep > 3 ? styles.completed : ''}`}></div>
            <div className={`${styles.loadingStepText} ${currentStep >= 3 ? styles.active : ''} ${currentStep > 3 ? styles.completed : ''}`}>Finalize</div>
          </div>
        </div>
        
        <div className={styles.loadingProgress}>
          <div className={styles.loadingProgressBar}></div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
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
                className={msg.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper}
              >
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
                        localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                  )}
                </div>
                {msg.sender === 'ai' ? (
                  <InterviewMessage
                    message={msg}
                    messageId={`${id}-${index}`}
                    threadId={threadId}
                    isFirstMessage={index === 0}
                  />
                ) : (
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
                          <Button onClick={() => handleGenerateResponse(msg.text, index)}>
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
