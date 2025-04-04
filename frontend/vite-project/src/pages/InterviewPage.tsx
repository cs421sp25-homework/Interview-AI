import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Bot, Home, Loader, Save } from 'lucide-react';
import styles from './InterviewPage.module.css';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import { useNavigate } from 'react-router-dom';
import InterviewMessage from '../components/InterviewMessage';
import { Button } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

// 添加保存过渡动画组件
const SavingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <div className={styles.savingOverlay}>
      <div className={styles.savingContent}>
        <Save size={60} className={styles.savingIcon} />
        <h2 className={styles.savingText}>Saving Interview</h2>
        <p className={styles.savingSubtext}>
          Please wait while we save your interview data...
        </p>
      </div>
    </div>
  );
};

const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  
  // Record whether the interview has ended and if there is actual conversation
  const hasEndedInterviewRef = useRef(false);
  const hasRealConversationRef = useRef(false);
  const initialLoadRef = useRef(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userEmail = localStorage.getItem('user_email') || '';
  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const navigate = useNavigate();
  
  // 添加保存动画状态
  const [showSavingOverlay, setShowSavingOverlay] = useState(false);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Update hasRealConversationRef when there are user messages indicating a real conversation
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].sender === 'user')) {
      hasRealConversationRef.current = true;
    }
  }, [messages]);
  
  const saveChatHistory = useCallback(async (currentThreadId: string, chatMessages: Array<{ text: string; sender: 'user' | 'ai' }>) => {
    try {
      // If there's only one AI message, it's just the welcome message, skip saving
      if (chatMessages.length === 1 && chatMessages[0].sender === 'ai') {
        console.log("Only welcome message exists, skipping save");
        return true;
      }
      
      console.log("Saving chat history to API for thread_id:", currentThreadId);
      
      const response = await fetch(`${API_BASE_URL}/api/chat_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: currentThreadId,
          email: userEmail,
          messages: chatMessages,
          config_name: config_name,
          config_id: config_id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save chat history: ${response.status} ${response.statusText}`);
      }
      
      console.log("Chat history saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving chat history:", error);
      return false;
    }
  }, [userEmail, config_name, config_id]);
  
  useEffect(() => {
    return () => {
      // Only save chat history when all conditions are met:
      // 1. Thread ID exists
      // 2. Messages exist
      // 3. Interview has not been explicitly ended
      // 4. There is real conversation (not just welcome message)
      // 5. Not in initial loading phase
      if (
        threadId && 
        messages.length > 0 && 
        !hasEndedInterviewRef.current && 
        hasRealConversationRef.current &&
        !initialLoadRef.current
      ) {
        console.log("Component unmounting, saving chat history");
        saveChatHistory(threadId, messages)
          .then(() => console.log("Chat history saved on unmount"))
          .catch(err => console.error("Failed to save chat history on unmount:", err));
      } else {
        console.log("Skipping save on unmount because conditions not met");
      }
    };
  }, [threadId, messages, saveChatHistory]);
  
  useEffect(() => {
    try {
      // Check if user is logged in
      const email = localStorage.getItem('user_email');
      if (!email) {
        console.log("User not logged in, redirecting to login page");
        navigate('/login');
        return;
      }

      setIsLoading(true);
      
      const storedUserPhoto = localStorage.getItem('user_photo_url');
      if (storedUserPhoto) {
        setUserPhotoUrl(storedUserPhoto);
      }
      
      if (!config_name || !config_id) {
        message.error('Please select a configuration to start an interview');
        navigate('/prompts');
        return;
      }
      
      const createSession = async () => {
        try {
          console.log("Creating new interview session...");
          
          // Fetch user profile data
          let userProfile = null;
          try {
            const profileResponse = await fetch(`${API_BASE_URL}/api/profile/${userEmail}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.data) {
                userProfile = profileData.data;
              }
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Continue even if profile fetch fails
          }
          console.log("User profile:", userProfile);

          // Fetch config details to get company name and type
          try {
            const configResponse = await fetch(`${API_BASE_URL}/api/interview_config/${config_id}`);
            if (configResponse.ok) {
              const configData = await configResponse.json();
              if (configData.data) {
                const config = configData.data;
                // Store these values in localStorage for persistence
                localStorage.setItem('current_company_name', config.company_name || '');
                localStorage.setItem('current_interview_type', config.interview_type || '');
                localStorage.setItem('current_question_type', config.question_type || '');
              }
            }
          } catch (configError) {
            console.error('Error fetching config details:', configError);
            // Continue even if config fetch fails
          }
          
          const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: userEmail, 
              name: config_name,
              new_session: true,
              // Include user profile information for the LLM
              userProfile: userProfile || {
                first_name: localStorage.getItem('user_first_name') || '',
                last_name: localStorage.getItem('user_last_name') || '',
                job_title: localStorage.getItem('user_job_title') || '',
                key_skills: localStorage.getItem('user_skills') ? localStorage.getItem('user_skills')!.split(',') : [],
                education_history: JSON.parse(localStorage.getItem('user_education') || '[]'),
                resume_experience: JSON.parse(localStorage.getItem('user_experience') || '[]')
              }
            }), 
          });
    
          if (!res.ok) {
            throw new Error(`Failed to start interview: ${res.status} ${res.statusText}`);
          }
    
          const data = await res.json();
          console.log("Received session data:", data);
          
          if (!data.thread_id) {
            throw new Error("No thread_id received from server");
          }
          
          setThreadId(data.thread_id);
          
          const welcomeMessage = data.response || 
            `Welcome to your interview session for "${config_name}". Please feel free to start the conversation.`;
          
          setMessages([{ 
            text: welcomeMessage, 
            sender: 'ai' as const 
          }]);
          
          setIsChatReady(true);
          setIsLoading(false);
          
          // Set initial load flag to false after a short delay
          setTimeout(() => {
            initialLoadRef.current = false;
            console.log("Initial load phase completed");
          }, 1000);
          
          return data.thread_id;
        } catch (error) {
          console.error('Error creating new chat session:', error);
          message.error('Failed to start interview. Please try again.');
          setIsLoading(false);
          return null;
        }
      };
      
      createSession();
    } catch (error) {
      console.error('Error in InterviewPage:', error);
      navigate('/login');
    }
  }, [navigate, userEmail, config_name, config_id]);
  
  const handleSend = async () => {
    if (!threadId) {
      message.warning('No active interview session. Please start a new interview.');
      return;
    }
    
    if (!input.trim()) return;
    
    const userMessage = { text: input, sender: 'user' as const };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    const userInput = input;
    setInput('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userInput, 
          thread_id: threadId,
          email: userEmail,
          config_name: config_name,
          config_id: config_id
        }),
      });
      
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await res.json();
      
      console.log(`Received AI response: "${data.response.substring(0, 30)}..."`);
      
      const aiMessage = { 
        text: data.response || "I'm thinking about my response...", 
        sender: 'ai' as const 
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      
    } catch (error) {
      console.error('Error processing chat:', error);
      message.error('Failed to send message. Please try again.');
    }
  };

  const handleEndInterview = async () => {
    if (!threadId) {
      message.warning('No active interview session.');
      return;
    }
    
    // 防止多次点击触发多次请求
    if (isSaving) return;
    
    // 设置保存状态
    setIsSaving(true);
    
    // 显示保存动画
    setShowSavingOverlay(true);
    
    // 显示加载消息
    message.loading('Saving your interview...', 1);
    
    try {
      // 执行保存操作
      const saveResult = await saveChatHistory(threadId, messages);
      
      if (saveResult) {
        message.success('Interview saved successfully');
      } else {
        message.warning('There might be issues saving your responses');
      }
      
      // 短暂延迟以显示保存动画
      setTimeout(() => {
        // 隐藏保存动画
        setShowSavingOverlay(false);
        // 保存后导航到查看页面
        navigate(`/interview/view/${threadId}`, { state: { conversation: messages } });
      }, 800);
    } catch (error) {
      console.error('Error saving chat history:', error);
      message.error('Failed to save your responses');
      // 如果出错，重置保存状态，让用户可以重试
      setIsSaving(false);
      setShowSavingOverlay(false);
    }
  };
  
  
  

  const handleBackToDashboard = () => {
    // 直接调用 handleEndInterview 函数，确保保存逻辑执行
    handleEndInterview();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader size={48} className={styles.loadingSpinner} />
          <h2>Initializing interview session</h2>
          <p>Setting up your interview for: {config_name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      {/* 保存动画覆盖层 */}
      <SavingOverlay isVisible={showSavingOverlay} />
      
      <div className={styles.interviewHeader}>
        <button 
          className={`${styles.backButton} ${isSaving ? styles.saving : ''}`}
          onClick={handleBackToDashboard}
          disabled={isSaving}
        >
          <Home size={18} />
          {isSaving ? 'Saving...' : 'Back to Dashboard'}
        </button>
        <h1>Interview: {config_name}</h1>
        <button 
          className={`${styles.endButton} ${isSaving ? styles.saving : ''}`}
          onClick={handleEndInterview}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader size={20} className={styles.loadingSpinner} /> Saving...
            </>
          ) : (
            <>
              <X size={20} /> End Interview
            </>
          )}
        </button>

      </div>

      <div className={styles.chatInterface}>
        <div className={styles.chatContainer} ref={chatContainerRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.messageWrapper} ${
                message.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper
              }`}
            >
              <div className={styles.avatarContainer}>
                {message.sender === 'ai' ? (
                  <div className={styles.botAvatar}>
                    <Bot size={24} />
                  </div>
                ) : (
                  <div className={styles.userAvatar}>
                    {userPhotoUrl ? (
                      <img src={userPhotoUrl} alt="User" />
                    ) : (
                      <div className={styles.defaultUserAvatar}>{userEmail.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                )}
              </div>
              {message.sender === 'ai' ? (
                <InterviewMessage
                  message={message}
                  messageId={`${threadId}-${index}`}
                  threadId={threadId || ''}
                  isFirstMessage={index === 0}
                />
              ) : (
                <div className={`${styles.message} ${styles.userMessage}`}>
                  {message.text || <span>&nbsp;</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.inputContainer}>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-adjust height based on content
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type your response..."
            className={styles.input}
            disabled={!isChatReady}
            rows={1}
          />
          <button 
            className={styles.sendButton} 
            onClick={handleSend}
            disabled={!input.trim() || !isChatReady}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;