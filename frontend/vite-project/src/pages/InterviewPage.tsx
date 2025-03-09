// File: src/pages/InterviewPage.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Mic, MicOff, Send } from 'lucide-react';
import styles from './InterviewPage.module.css';
import { ConfigProvider } from 'antd';
import API_BASE_URL from '../config/api';




const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  
  const userEmail = localStorage.getItem('user_email') || '';
  const config_name = localStorage.getItem('current_config') || 'default_config';

  
  useEffect(() => {
    if (!threadId) {
      startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const startInterview = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, name: config_name}), 
        });

        if (!res.ok) {
            throw new Error('Failed to start interview');
        }

        const data = await res.json();
        setThreadId(data.thread_id);  
        setMessages([{ text: data.response, sender: 'ai' }]);  
    } catch (error) {
        console.error('Error starting interview:', error);
    }
};

  const handleSend = async () => {

    if (!threadId) {
        await startInterview();
    }
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
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
      setMessages((prev) => [...prev, { text: data.response, sender: 'ai' }]);
    } catch (error) {
      console.error('Error processing chat:', error);
    }
  };

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto' }} className={styles.chatContainer}>
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
        <button className={styles.micButton} onClick={() => setIsRecording(!isRecording)}>
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button className={styles.sendButton} onClick={handleSend}>
          <Send size={20} />
        </button>
      </div>
    </>
  );
};

export default InterviewPage;
