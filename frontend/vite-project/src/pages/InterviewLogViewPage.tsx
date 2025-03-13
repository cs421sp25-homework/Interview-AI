import React, { useEffect, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import styles from './InterviewPage.module.css'; // Reuse InterviewPage styles
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { message, Button } from 'antd';
import API_BASE_URL from '../config/api';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

const InterviewLogViewPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // log id from route
  const location = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Option 1: if the conversation was passed via route state from InterviewHistoryPage
  useEffect(() => {
    if (location.state && (location.state as any).conversation) {
      setMessages((location.state as any).conversation);
    } else {
      // Option 2: fetch the interview log from the API using the id (adjust API endpoint as needed)
      const fetchLog = async () => {
        try {
          const userEmail = localStorage.getItem('user_email') || '';
          const res = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
          const data = await res.json();
          // find the log by id
          const log = data.data.find((l: any) => String(l.id) === id);
          if (log && log.log) {
            const conversation = typeof log.log === 'string' ? JSON.parse(log.log) : log.log;
            setMessages(conversation);
          } else {
            message.error('Interview log not found.');
          }
        } catch (error) {
          console.error(error);
          message.error('Failed to load interview log.');
        }
      };
      fetchLog();
    }
  }, [id, location.state]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleBack = () => {
    navigate('/interview/history');
  };

  return (
    <div className={styles.interviewContainer}>
      <div className={styles.interviewHeader}>
        <button 
            className={styles.backButton}
            onClick={handleBack}
        >
        <Home size={18} />
            Back to History
        </button>
        <h1 className={styles.centeredTitle}>Log</h1>
        <div className={styles.placeholder} /> {/* Empty div to balance flexbox spacing */}
        </div>


      <div className={styles.chatInterface}>
        <div 
          ref={chatContainerRef}
          className={styles.chatContainer}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${styles.messageWrapper} ${msg.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper}`}
            >
              <div className={styles.avatarContainer}>
                {msg.sender === 'ai' ? (
                  <div className={styles.botAvatar}>
                    {/* You can use an icon or image for the bot */}
                    <span role="img" aria-label="bot">🤖</span>
                  </div>
                ) : (
                  <div className={styles.userAvatar}>
                    {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className={`${styles.message} ${msg.sender === 'ai' ? styles.aiMessage : styles.userMessage}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        {/* Note: No input container here because this is a read-only log view */}
      </div>
    </div>
  );
};

export default InterviewLogViewPage;
