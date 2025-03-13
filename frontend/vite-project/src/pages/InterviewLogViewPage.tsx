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

  // 避免布局跳跃，确保容器在组件初始渲染时就已经存在
  useEffect(() => {
    // 立即设置容器尺寸为固定值
    const container = document.getElementById('logViewContainer');
    if (container) {
      container.style.height = 'calc(100vh - 100px)';
    }
    
    setLoading(true);
    if (location.state && (location.state as any).conversation) {
      setMessages((location.state as any).conversation);
      // 使用较短的延迟，但仍然确保UI有时间渲染
      setTimeout(() => setLoading(false), 300);
    } else {
      // Option 2: fetch the interview log from the API using the id
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

  // 自定义加载图标
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
                  {msg.text}
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
