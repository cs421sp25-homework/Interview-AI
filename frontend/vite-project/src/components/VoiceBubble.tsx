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

  // We can add small guards:
  if (!message) {
    console.error('VoiceBubble received undefined message');
    return <div style={{ color: 'red' }}>Error: No message provided.</div>;
  }

  const safeDuration = message.duration !== undefined 
    ? message.duration.toFixed(1) + 's' 
    : '0.0s';

  const handlePlay = () => {
    try {
      onPlay();
    } catch (err) {
      console.error('Error during onPlay:', err);
    }
  };

  const handleToggleText = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e.stopPropagation();
      onToggleText();
    } catch (err) {
      console.error('Error toggling text:', err);
    }
  };

  return (
    <div className={styles.voiceBubbleContainer}>
      <div className={styles.voiceBubbleWrapper}>
        <div
          className={`${styles.voiceBubble} ${isPlaying ? styles.voiceBubble : ''}`}
          onClick={handlePlay}
        >
          <div className={styles.voiceIcon}>
            {message.sender === 'ai' ? <Bot size={16} /> : <Mic size={16} />}
          </div>
          <div className={styles.duration}>
            {safeDuration}
          </div>
        </div>
        <button
          className={styles.toggleTextButton}
          onClick={handleToggleText}
          aria-label={showText ? 'Hide text' : 'Show text'}
        >
          <span className={styles.toggleTextLabel}>
            {showText ? 'Hide Text ▲' : 'Show Text ▼'}
          </span>
        </button>
      </div>

      {showText && (
        <div className={styles.messageText}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default VoiceBubble;
