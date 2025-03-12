import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import styles from './InterviewPage.module.css';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import { useLocation, useNavigate } from 'react-router-dom';

const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    console.log("Active conversation ID changed to:", activeConversationId);
    setMessages([]);
    setSessionInitialized(false);
    setThreadId(null);
    setIsLoading(true);
    initializeChat();
  }, [activeConversationId]);
  
  // 加载历史消息
  const loadHistoryMessages = (historyMessages: Array<{ text: string; sender: 'user' | 'ai' }>) => {
    setMessages(historyMessages);
  };
  
  // 从localStorage获取历史消息
  const getHistoryMessages = (threadId: string) => {
    try {
      const historyKey = `chat_history_${threadId}`;
      const savedHistory = localStorage.getItem(historyKey);
      
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error('Error getting history messages:', error);
    }
    return null;
  };
  
  // 保存历史消息到localStorage
  const saveHistoryMessages = (threadId: string, messages: Array<{ text: string; sender: 'user' | 'ai' }>) => {
    try {
      const historyKey = `chat_history_${threadId}`;
      localStorage.setItem(historyKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving history messages:', error);
    }
  };
  
  const initializeChat = async () => {
    if (sessionInitialized) return;
    
    setIsLoading(true);
    
    // 首先检查是否是返回到现有会话
    const logsString = localStorage.getItem('interview_logs');
    if (logsString && activeConversationId) {
      try {
        const logs = JSON.parse(logsString);
        const activeLog = logs.find((log: any) => log.id.toString() === activeConversationId);
        
        if (activeLog && activeLog.thread_id) {
          console.log("Found existing session with thread_id:", activeLog.thread_id);
          setThreadId(activeLog.thread_id);
          
          // 尝试从localStorage加载历史消息
          const historyMessages = getHistoryMessages(activeLog.thread_id);
          
          if (historyMessages && historyMessages.length > 0) {
            console.log("Loading history messages from localStorage for thread_id:", activeLog.thread_id);
            loadHistoryMessages(historyMessages);
            setIsLoading(false);
            setSessionInitialized(true);
            return;
          } else {
            console.log("No history messages found, setting welcome message");
            // 如果没有历史消息，显示欢迎消息
            const welcomeMessage = `Welcome to your interview session for "${activeLog.title}". Please feel free to start the conversation.`;
            
            setIsLoading(false);
            setSessionInitialized(true);
            
            // 直接设置欢迎消息
            setMessages([{ text: welcomeMessage, sender: 'ai' }]);
            
            // 保存这条欢迎消息到历史记录
            saveHistoryMessages(activeLog.thread_id, [{ text: welcomeMessage, sender: 'ai' }]);
            
            return;
          }
        } else {
          console.error("Active log found but no thread_id:", activeLog);
        }
      } catch (error) {
        console.error('Error parsing logs:', error);
      }
    }
    
    // 如果不是返回到现有会话，则创建新会话
    if (config_name) {
      try {
        console.log("Creating new chat session with config:", config_name);
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
        console.log("New chat created with thread_id:", data.thread_id);
        setThreadId(data.thread_id);
        
        // 更新logs中的thread_id
        if (activeConversationId) {
          updateLogThreadId(activeConversationId, data.thread_id);
        }
        
        setIsLoading(false);
        setSessionInitialized(true);
        
        let messageText = '';
        
        // 显示API返回的消息或默认欢迎消息
        if (data.response) {
          messageText = data.response;
        } else {
          messageText = `Welcome to your interview session for "${config_name}". Please feel free to start the conversation.`;
        }
        
        // 直接设置消息
        setMessages([{ text: messageText, sender: 'ai' }]);
        
        // 保存这条欢迎消息到历史记录
        saveHistoryMessages(data.thread_id, [{ text: messageText, sender: 'ai' }]);
        
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
  
  // 更新logs中的thread_id
  const updateLogThreadId = (logId: string, threadId: string) => {
    try {
      const logsString = localStorage.getItem('interview_logs');
      if (logsString) {
        const logs = JSON.parse(logsString);
        const updatedLogs = logs.map((log: any) => {
          if (log.id.toString() === logId) {
            return { ...log, thread_id: threadId };
          }
          return log;
        });
        localStorage.setItem('interview_logs', JSON.stringify(updatedLogs));
        console.log("Updated thread_id in logs for log ID:", logId);
      }
    } catch (error) {
      console.error('Error updating log thread_id:', error);
    }
  };
  
  const handleSend = async () => {
    if (!threadId) {
      message.warning('No active interview session. Please start a new interview.');
      return;
    }
    
    if (!input.trim()) return;
    
    // 添加用户消息
    const userMessage = { text: input, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    
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
      
      // 直接添加AI回复
      const aiMessage = { text: data.response, sender: 'ai' as const };
      
      // 使用函数式更新确保获取最新状态
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, aiMessage];
        // 保存更新后的消息列表
        saveHistoryMessages(threadId, updatedMessages);
        return updatedMessages;
      });
      
    } catch (error) {
      console.error('Error processing chat:', error);
      message.error('Failed to send message. Please try again.');
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
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your response..."
              className={styles.input}
            />
            <button 
              className={styles.micButton} 
              onClick={() => setIsRecording(!isRecording)}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              className={styles.sendButton} 
              onClick={handleSend}
              disabled={!input.trim()}
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
