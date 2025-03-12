import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import styles from './InterviewPage.module.css';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import { useLocation, useNavigate } from 'react-router-dom';

const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai'; fullText?: string; isTyping?: boolean }>
  >([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userEmail = localStorage.getItem('user_email') || '';
  const config_name = localStorage.getItem('current_config') || '';
  const navigate = useNavigate();
  
  const location = useLocation();
  const activeConversationId = location.pathname.split('/').pop();
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    setMessages([]);
    setSessionInitialized(false);
    setIsAiResponding(false);
    initializeChat();
  }, [activeConversationId]);
  
  const typeMessage = (fullText: string) => {
    return new Promise<void>((resolve) => {
      setMessages((prev) => {
        const filteredMessages = prev.filter(msg => !msg.isTyping);
        return [...filteredMessages, { text: '', sender: 'ai', fullText, isTyping: true }];
      });
      
      let currentIndex = 0;
      const typingSpeed = 30; 
      
      const typeNextChar = () => {
        if (currentIndex < fullText.length) {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.isTyping) {
              lastMessage.text = fullText.substring(0, currentIndex + 1);
            }
            
            return newMessages;
          });
          
          currentIndex++;
          setTimeout(typeNextChar, typingSpeed);
        } else {
          // 打字完成，更新消息状态
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.isTyping) {
              lastMessage.isTyping = false;
            }
            
            return newMessages;
          });
          
          setIsAiResponding(false);
          resolve();
        }
      };
      
      setTimeout(typeNextChar, typingSpeed);
    });
  };
  
  // 加载历史消息，不使用打字效果
  const loadHistoryMessages = (historyMessages: Array<{ text: string; sender: 'user' | 'ai' }>) => {
    setMessages(historyMessages);
  };
  
  const initializeChat = async () => {
    if (sessionInitialized) return;
    
    setIsLoading(true);
    
    const logsString = localStorage.getItem('interview_logs');
    if (logsString) {
      try {
        const logs = JSON.parse(logsString);
        const activeLog = logs.find((log: any) => log.id.toString() === activeConversationId);
        
        if (activeLog && activeLog.thread_id) {
          setThreadId(activeLog.thread_id);
          
          // 检查是否有历史消息
          const historyKey = `chat_history_${activeLog.thread_id}`;
          const savedHistory = localStorage.getItem(historyKey);
          
          if (savedHistory) {
            // 如果有历史消息，直接加载，不使用打字效果
            loadHistoryMessages(JSON.parse(savedHistory));
            setIsLoading(false);
            setSessionInitialized(true);
            return;
          }
          
          // 如果没有历史消息，显示欢迎消息
          const welcomeMessage = `Welcome to your interview session for "${activeLog.title}". Please feel free to start the conversation.`;
          
          setIsLoading(false);
          setSessionInitialized(true);
          
          // 使用打字效果显示欢迎消息
          await typeMessage(welcomeMessage);
          
          // 保存这条欢迎消息到历史记录
          const initialHistory = [{ text: welcomeMessage, sender: 'ai' as const }];
          localStorage.setItem(historyKey, JSON.stringify(initialHistory));
          
          return;
        }
      } catch (error) {
        console.error('Error parsing logs:', error);
      }
    }
    
    if (config_name) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: userEmail, 
            name: config_name
          }), 
        });

        if (!res.ok) {
          throw new Error('Failed to start interview');
        }

        const data = await res.json();
        setThreadId(data.thread_id);
        
        setIsLoading(false);
        setSessionInitialized(true);
        
        let messageText = '';
        
        // 使用打字效果显示API返回的消息或默认欢迎消息
        if (data.response) {
          messageText = data.response;
        } else {
          messageText = `Welcome to your interview session for "${config_name}". Please feel free to start the conversation.`;
        }
        
        await typeMessage(messageText);
        
        // 保存这条欢迎消息到历史记录
        const historyKey = `chat_history_${data.thread_id}`;
        const initialHistory = [{ text: messageText, sender: 'ai' as const }];
        localStorage.setItem(historyKey, JSON.stringify(initialHistory));
        
      } catch (error) {
        console.error('Error starting interview:', error);
        message.error('Failed to start interview. Please try again.');
        setIsLoading(false);
      }
    } else {
      message.info('Please select a configuration to start an interview');
      navigate('/interview');
      setIsLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!threadId) {
      message.warning('No active interview session. Please start a new interview.');
      return;
    }
    
    if (!input.trim() || isAiResponding) return;
    
    // 添加用户消息
    const userMessage = { text: input, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    
    // 设置AI正在响应状态
    setIsAiResponding(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, thread_id: threadId }),
      });
      
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await res.json();
      
      // 使用打字效果显示AI回复
      await typeMessage(data.response);
      
      // 更新历史记录
      const historyKey = `chat_history_${threadId}`;
      const currentMessages = [...messages, userMessage, { text: data.response, sender: 'ai' as const }];
      localStorage.setItem(historyKey, JSON.stringify(currentMessages));
      
    } catch (error) {
      console.error('Error processing chat:', error);
      message.error('Failed to send message. Please try again.');
      setIsAiResponding(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading interview session...</p>
        </div>
      ) : (
        <>
          <div 
            ref={chatContainerRef}
            style={{ flex: 1, overflowY: 'auto' }} 
            className={styles.chatContainer}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.sender === 'ai' ? styles.aiMessage : styles.userMessage
                } ${message.isTyping ? styles.typingMessage : ''}`}
              >
                {message.text}
                {message.isTyping && <span className={styles.typingCursor}></span>}
              </div>
            ))}
          </div>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isAiResponding ? "AI is responding..." : "Type your response..."}
              className={styles.input}
              disabled={isAiResponding}
            />
            <button 
              className={styles.micButton} 
              onClick={() => setIsRecording(!isRecording)}
              disabled={isAiResponding}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              className={styles.sendButton} 
              onClick={handleSend}
              disabled={isAiResponding || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default InterviewPage;
