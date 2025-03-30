import React from 'react';
import { Mic, Bot } from 'lucide-react';
import styles from '../pages/InterviewPage.module.css';

interface VoiceBubbleProps {
  message: {
    text: string;
    sender: 'user' | 'ai';
    duration?: number;
    audioUrl?: string;
  };
  isPlaying: boolean;
  onPlay: () => void;
  onToggleText: () => void;
  showText: boolean;
}

const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  message,
  isPlaying,
  onPlay,
  onToggleText,
  showText
}) => {
  return (
    <div className={`${styles.voiceBubbleContainer} ${message.sender === 'ai' ? styles.aiBubble : styles.userBubble}`}>
      <div 
        className={`${styles.voiceBubble} ${isPlaying ? styles.playing : ''}`}
        onClick={onPlay}
      >
        <div className={styles.voiceIcon}>
          {message.sender === 'ai' ? <Bot size={16} /> : <Mic size={16} />}
        </div>
        <div className={styles.duration}>
          {message.duration ? message.duration.toFixed(1) + 's' : '0.0s'}
        </div>
      </div>
      <button 
        className={styles.toggleTextButton}
        onClick={(e) => {
          e.stopPropagation();
          onToggleText();
        }}
        aria-label={showText ? "Hide transcription" : "Show transcription"}
      >
        {showText ? (
          <span className={styles.toggleTextContent}>Hide Text</span>
        ) : (
          <span className={styles.toggleTextContent}>Show Text</span>
        )}
      </button>
      {showText && (
        <div className={styles.messageText}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default VoiceBubble;