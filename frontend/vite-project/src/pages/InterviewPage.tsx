import React, { useState, useEffect } from 'react';
import { Bot, Mic, MicOff, Send } from 'lucide-react';
import styles from './InterviewPage.module.css';

const InterviewPage = () => {
  const [messages, setMessages] = useState<Array<{text: string; sender: 'user' | 'ai'}>>([
    { text: "Hello! I'm Sarah, your interviewer today. Shall we begin with you introducing yourself?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's interesting! Can you tell me about a challenging project you've worked on?",
        "How do you handle conflicts in a team environment?",
        "What are your thoughts on the latest developments in your field?",
        "Could you elaborate on your problem-solving approach?"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { text: randomResponse, sender: 'ai' }]);
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.interviewer}>
          <Bot size={32} color="#ec4899" />
          <div>
            <h2>Sarah (AI Interviewer)</h2>
            <p>Technical Interview Specialist</p>
          </div>
        </div>
      </div>

      <div className={styles.chatContainer}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${message.sender === 'ai' ? styles.aiMessage : styles.userMessage}`}
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
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default InterviewPage; 