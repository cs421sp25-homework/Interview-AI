import React, { useEffect, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { message, Button, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import API_BASE_URL from '../config/api';
import styles from './InterviewLogViewPage.module.css';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

const InterviewLogViewPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // log id from route
  const location = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [generatedResponses, setGeneratedResponse] = useState<{ [key: number]: string }>({});

  const handleGenerateResponse = async (messageText: string, index: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate_good_response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });
      const data = await res.json();
      if (data.response) {
        setGeneratedResponse(prev => ({ ...prev, [index]: data.response }));
      } else {
        message.error('Failed to generate response');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to generate response');
    }
  };

  // Avoid layout shift by ensuring container exists on first render.
  useEffect(() => {
    const container = document.getElementById('logViewContainer');
    if (container) {
      container.style.height = 'calc(100vh - 100px)';
    }
    
    setLoading(true);
    if (location.state && (location.state as any).conversation) {
      setMessages((location.state as any).conversation);
      setTimeout(() => setLoading(false), 300);
    } else {
      const fetchLog = async () => {
        try {
          const userEmail = localStorage.getItem('user_email') || '';
          const res = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
          const data = await res.json();
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

  const antIcon = <LoadingOutlined style={{ fontSize: 40, color: '#ec4899' }} spin />;

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
          <div 
            ref={chatContainerRef}
            className={styles.chatContainer}
          >
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
                <div className={msg.sender === 'ai' ? styles.aiMessage : styles.userMessage}>
                  <div className={styles.messageContent}>
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className={styles.generatedContainer}>
                      {generatedResponses[index] ? (
                        <div className={styles.generatedResponse}>{generatedResponses[index]}</div>
                      ) : (
                        <Button onClick={() => handleGenerateResponse(msg.text, index)}>
                          Generate AI Response
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewLogViewPage;
