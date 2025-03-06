// File: src/pages/InterviewPage.tsx
import React, { useState } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import styles from './InterviewPage.module.css';

const InterviewPage: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([
    {
      text: "Hello! I'm Sarah, your interviewer today. Shall we begin with you introducing yourself?",
      sender: 'ai',
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
    const userInput = input;
    setInput('');
    try {
      const res = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, threadId: 'default_thread' }),
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
