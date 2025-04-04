import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Bot, Home, Loader } from 'lucide-react';
import styles from './InterviewPage.module.css';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
}

const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  // Refs to track interview status
  const hasEndedInterviewRef = useRef(false);
  const hasRealConversationRef = useRef(false);
  const initialLoadRef = useRef(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userEmail = localStorage.getItem('user_email') || '';
  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const navigate = useNavigate();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Track if the conversation is “real”
  useEffect(() => {
    // If there's at least one user message or more than one message total
    if (messages.length > 1 || (messages.length === 1 && messages[0].sender === 'user')) {
      hasRealConversationRef.current = true;
    }
  }, [messages]);

  // -----------------------------------
  // Helper: Save chat history
  // -----------------------------------
  const saveChatHistory = useCallback(
    async (currentThreadId: string, chatMessages: ChatMessage[]) => {
      try {
        // If there's only one AI message, it's just the welcome message
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
          }),
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
    },
    [userEmail, config_name, config_id]
  );

  // -----------------------------------
  // On Unmount: attempt to save chat
  // -----------------------------------
  useEffect(() => {
    return () => {
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

  // -----------------------------------
  // Initialize interview session
  // -----------------------------------
  useEffect(() => {
    const initInterview = async () => {
      try {
        // Check if user is logged in
        if (!userEmail) {
          message.warning("You must be logged in to start an interview.");
          navigate('/login');
          return;
        }

        setIsLoading(true);

        // Fetch user photo if available
        const storedUserPhoto = localStorage.getItem('user_photo_url');
        if (storedUserPhoto) {
          setUserPhotoUrl(storedUserPhoto);
        }

        // Check if there's a config
        if (!config_name || !config_id) {
          message.error('No interview configuration. Please select a configuration first.');
          navigate('/prompts');
          return;
        }

        console.log("Creating new interview session...");
        let userProfile = null;
        try {
          const profileRes = await fetch(`${API_BASE_URL}/api/profile/${userEmail}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            userProfile = profileData.data || null;
          }
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
        }

        const startRes = await fetch(`${API_BASE_URL}/api/new_chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: config_name,
            new_session: true,
            userProfile: userProfile || {
              first_name: localStorage.getItem('user_first_name') || '',
              last_name: localStorage.getItem('user_last_name') || '',
              job_title: localStorage.getItem('user_job_title') || '',
              key_skills: localStorage.getItem('user_skills')
                ? localStorage.getItem('user_skills')!.split(',')
                : [],
              education_history: JSON.parse(localStorage.getItem('user_education') || '[]'),
              resume_experience: JSON.parse(localStorage.getItem('user_experience') || '[]')
            }
          }),
        });

        if (!startRes.ok) {
          throw new Error(`Failed to start interview: ${startRes.status} ${startRes.statusText}`);
        }

        const data = await startRes.json();
        if (!data.thread_id) {
          throw new Error("No thread_id returned from server");
        }

        setThreadId(data.thread_id);
        const welcomeMessage = data.response ||
          `Welcome to your interview session for "${config_name}". Please start by introducing yourself.`;

        setMessages([{ text: welcomeMessage, sender: 'ai' }]);
        setIsChatReady(true);
        setIsLoading(false);

        // End initial load after a short delay
        setTimeout(() => {
          initialLoadRef.current = false;
          console.log("Initial load phase completed");
        }, 1000);
      } catch (err) {
        console.error("Error in InterviewPage initialization:", err);
        message.error('Failed to start interview. Please try again.');
        setIsLoading(false);
      }
    };

    initInterview();
  }, [navigate, userEmail, config_name, config_id]);

  // -----------------------------------
  // Handle sending user message
  // -----------------------------------
  const handleSend = async () => {
    if (!threadId) {
      message.warning('No active interview session. Please start a new interview.');
      return;
    }
    if (!input.trim()) return;

    const userMessage: ChatMessage = { text: input.trim(), sender: 'user' };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          thread_id: threadId,
          email: userEmail,
          config_name,
          config_id
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat response not ok: ${res.status}`);
      }

      const data = await res.json();
      const aiText = data.response || "I'm thinking about my response...";
      const aiMessage: ChatMessage = { text: aiText, sender: 'ai' };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing chat:', error);
      message.error('Failed to send message. Please try again.');
    }
  };

  // -----------------------------------
  // End Interview
  // -----------------------------------
  const handleEndInterview = async () => {
    if (!threadId) {
      message.warning("No active interview session to end.");
      navigate('/dashboard');
      return;
    }

    if (isEnding) return; // Prevent multiple clicks
    setIsEnding(true);

    hasEndedInterviewRef.current = true;
    message.loading('Saving your interview responses...', 0);

    // Attempt to save
    saveChatHistory(threadId, messages)
      .then((saveResult) => {
        if (saveResult) {
          message.success('Interview responses saved.');
        } else {
          message.warning('Interview ended, but there was an issue saving your responses.');
        }
      })
      .catch((err) => {
        console.error('Error saving chat history on end:', err);
        message.error('Failed to save your responses.');
      });

    setTimeout(() => {
      localStorage.removeItem('current_config');
      localStorage.removeItem('current_config_id');
    }, 500);

    navigate(`/interview/view/${threadId}`, { state: { conversation: messages } });
    setIsEnding(false);
  };

  // -----------------------------------
  // Go back to Dashboard
  // -----------------------------------
  const handleBackToDashboard = () => {
    handleEndInterview();
  };

  // -----------------------------------
  // Render loading if needed
  // -----------------------------------
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

  // -----------------------------------
  // Render main interview UI
  // -----------------------------------
  return (
    <div className={styles.interviewContainer}>
      <div className={styles.interviewHeader}>
        <button
          className={styles.backButton}
          onClick={handleBackToDashboard}
          disabled={isEnding}
        >
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Interview: {config_name}</h1>
        <button
          className={styles.endButton}
          onClick={handleEndInterview}
          disabled={isEnding}
        >
          {isEnding ? (
            <>
              <Loader size={20} /> Ending Interview...
            </>
          ) : (
            <>
              <X size={20} /> End Interview
            </>
          )}
        </button>
      </div>

      <div className={styles.chatInterface}>
        <div ref={chatContainerRef} className={styles.chatContainer}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`
                ${styles.messageWrapper}
                ${msg.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper}
              `}
            >
              <div className={styles.avatarContainer}>
                {msg.sender === 'ai' ? (
                  <div className={styles.botAvatar}>
                    <Bot size={24} />
                  </div>
                ) : (
                  <div className={styles.userAvatar}>
                    {userPhotoUrl ? (
                      <img src={userPhotoUrl} alt="User" />
                    ) : (
                      <div className={styles.defaultUserAvatar}>
                        {userEmail.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                className={`${styles.message} ${
                  msg.sender === 'ai' ? styles.aiMessage : styles.userMessage
                }`}
              >
                {msg.text || <span>&nbsp;</span>}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.inputContainer}>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-expand
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
