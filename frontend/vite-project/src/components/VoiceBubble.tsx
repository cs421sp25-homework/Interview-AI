import React, { useEffect, useState } from 'react';
import { Mic, Bot, Volume2 } from 'lucide-react';
import styles from '../pages/InterviewPage.module.css';

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
}

const VoiceBubble: React.FC<VoiceBubbleProps> = ({
    message,
    isPlaying,
    onPlay,
    onToggleText,
    showText
  }) => {
    const [shouldShowPlayHint, setShouldShowPlayHint] = useState(false);
    
    // 如果消息已经准备好且是AI的消息，显示播放提示
    useEffect(() => {
      if (message.sender === 'ai' && message.isReady && message.audioUrl) {
        setShouldShowPlayHint(true);
        
        // 5秒后自动隐藏提示
        const timer = setTimeout(() => {
          setShouldShowPlayHint(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }, [message.sender, message.isReady, message.audioUrl]);
    
    return (
      <div className={styles.voiceBubbleContainer}>
        <div className={styles.voiceBubbleWrapper}>
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
            
            {/* 播放提示 */}
            {shouldShowPlayHint && message.sender === 'ai' && !isPlaying && (
              <div className={styles.playHint}>
                Click to play
              </div>
            )}
          </div>
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
    );
  };

export default VoiceBubble;
