import React, { useEffect, useState } from 'react';
import { Mic, Bot, Volume2 } from 'lucide-react';
import styles from './VoiceBubble.module.css';

interface VoiceBubbleProps {
  message: {
    text: string;
    sender: 'user' | 'ai';
    duration?: number;
    audioUrl?: string;
    isReady?: boolean;
  };
  isPlaying: boolean;
  onPlay: () => void;
  onToggleText: () => void;
  showText: boolean;
  userPhotoUrl?: string | null;
}

const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  message,
  isPlaying,
  onPlay,
  onToggleText,
  showText,
  userPhotoUrl
}) => {
  const [shouldShowPlayHint, setShouldShowPlayHint] = useState(false);
  
  // Show play hint for AI messages that are ready
  useEffect(() => {
    if (message.sender === 'ai' && message.isReady && message.audioUrl) {
      setShouldShowPlayHint(true);
      
      // Hide hint after 5 seconds
      const timer = setTimeout(() => {
        setShouldShowPlayHint(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message.sender, message.isReady, message.audioUrl]);
  
  return (
    <div className={`${styles.bubbleContainer} ${styles[message.sender]}`}>
      <div className={styles.messageContent}>
        <div className={styles.avatar}>
          {message.sender === 'ai' ? (
            <div className={styles.botAvatar}>
              <Bot size={24} />
            </div>
          ) : (
            <div className={styles.userAvatar}>
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="User" className={styles.avatarImage} />
              ) : (
                <div className={styles.defaultUserAvatar}>
                  {typeof window !== 'undefined' && 
                    localStorage.getItem('user_email')?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.bubbleWrapper}>
          <div className={styles.bubbleRow}>
            <div 
              className={`${styles.voiceBubble} ${isPlaying ? styles.playing : ''} ${message.sender === 'ai' && !isPlaying ? styles.aiVoiceBubble : ''}`}
              onClick={onPlay}
            >
              <div className={styles.voiceIcon}>
                {message.sender === 'ai' ? 
                  (isPlaying ? <Volume2 size={16} /> : <Bot size={16} />) : 
                  <Mic size={16} />
                }
              </div>
              <div className={styles.duration}>
                Click to play
              </div>
              
              {/* Play hint */}
              {shouldShowPlayHint && message.sender === 'ai' && !isPlaying && (
                <div className={styles.playHint}>
                  Click to play
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.textControls}>
            <button 
              className={styles.toggleTextButton}
              onClick={(e) => {
                e.stopPropagation();
                onToggleText();
              }}
              aria-label={showText ? "Hide text" : "Show text"}
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
      </div>
    </div>
  );
};

export default VoiceBubble;
