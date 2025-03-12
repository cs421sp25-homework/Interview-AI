import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, X, Home, Bot, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import styles from './InterviewPage.module.css';

const OnGoingVoice: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([]);
  const navigate = useNavigate();
  
  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const userEmail = localStorage.getItem('user_email') || '';

  const saveChatHistory = useCallback(async (currentThreadId: string, chatMessages: Array<{ text: string; sender: 'user' | 'ai' }>) => {
    try {
      console.log("Saving voice chat history to API for thread_id:", currentThreadId);
      
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
      
      console.log("Voice chat history saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving voice chat history:", error);
      return false;
    }
  }, [userEmail, config_name, config_id]);

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
        message.error('No interview configuration found. Please select a configuration first.');
        navigate('/prompts');
        return;
      }
      
      const initializeSession = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: userEmail, 
              name: config_name,
            }), 
          });
    
          if (!res.ok) {
            throw new Error(`Failed to start interview: ${res.status} ${res.statusText}`);
          }
    
          const data = await res.json();
          setThreadId(data.thread_id);
          
          const welcomeMessage = data.response || 
            `Welcome to your voice interview session for "${config_name}". Click the microphone button below to start speaking.`;
            
          const initialMessages = [{ 
            text: welcomeMessage, 
            sender: 'ai' as const 
          }];
          setMessages(initialMessages);
          
          setIsChatReady(true);
          setIsLoading(false);
          
          return data.thread_id;
        } catch (error) {
          console.error('Error initializing voice session:', error);
          message.error('Failed to initialize voice interview. Please try again.');
          setIsLoading(false);
          return null;
        }
      };
      
      initializeSession();
    } catch (error) {
      console.error('Error in OnGoingVoice:', error);
      navigate('/login');
    }
  }, [navigate, config_name, config_id, userEmail]);

  const toggleRecording = () => {
    if (!isChatReady) return;
    
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      message.info('Recording started');
      // TODO 
    } else {
      message.info('Recording stopped');
      // TODO 
    }
  };

  const handleEndInterview = async () => {
    if (!threadId) {
      message.warning('No active interview session.');
      navigate('/dashboard');
      return;
    }

    try {
      message.loading('Saving your voice interview responses...', 1);
      
      const finalMessages = [
        ...messages,
        { text: "Voice interview session ended", sender: 'ai' as const }
      ];
      
      const saveResult = await saveChatHistory(threadId, finalMessages);
      
      if (saveResult) {
        message.success('Voice interview ended successfully. Your responses have been saved.');
      } else {
        message.warning('Voice interview ended, but there might be issues saving your responses.');
      }
      
      localStorage.removeItem('current_config');
      localStorage.removeItem('current_config_id');
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending voice interview:', error);
      message.error('Failed to end voice interview properly. Your responses may not have been saved.');
    }
  };

  const handleBackToDashboard = () => {
    handleEndInterview();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader size={48} className={styles.loadingSpinner} />
          <h2>Initializing voice interview</h2>
          <p>Setting up your voice interview for: {config_name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      <div className={styles.interviewHeader}>
        <button 
          className={styles.backButton}
          onClick={handleBackToDashboard}
        >
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Voice Interview: {config_name}</h1>
        <button 
          className={styles.endButton} 
          onClick={handleEndInterview}
        >
          <X size={20} /> End Interview
        </button>
      </div>

      <div className={styles.chatInterface}>
        <div className={styles.voiceInterfaceContainer}>
          <div className={styles.messageWrapper + ' ' + styles.aiMessageWrapper}>
            <div className={styles.avatarContainer}>
              <div className={styles.botAvatar}>
                <Bot size={24} />
              </div>
            </div>
            <div className={styles.message + ' ' + styles.aiMessage}>
              Welcome to your voice interview session. Click the microphone button below to start speaking, and click it again to stop. I'll listen and respond to your answers.
            </div>
          </div>
          
          <div className={styles.voiceInterface}>
            <div className={styles.micContainer}>
              <button 
                className={`${styles.largeMic} ${isRecording ? styles.recording : ''}`} 
                onClick={toggleRecording}
                disabled={!isChatReady}
              >
                {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
              </button>
              <p>{isRecording ? 'Recording... Click to stop' : 'Click to start recording'}</p>
            </div>
            
            {userPhotoUrl && (
              <div className={styles.userAvatarContainer}>
                <div className={styles.userAvatar}>
                  <img src={userPhotoUrl} alt="User" />
                </div>
              </div>
            )}
            
            <div className={styles.voiceInstructions}>
              <h3>Voice Interview Instructions</h3>
              <ul>
                <li>Click the microphone button to start/stop recording</li>
                <li>Speak clearly and at a normal pace</li>
                <li>Your responses will be processed automatically</li>
                <li>Click "End Interview" when you're finished</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnGoingVoice;
