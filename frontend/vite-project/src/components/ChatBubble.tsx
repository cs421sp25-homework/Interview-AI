import React, { useState } from 'react';
import styles from './ChatBubble.module.css';
import { User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  text: string;
  sender: 'user' | 'ai';
  userPhotoUrl?: string | null;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  text, 
  sender, 
  userPhotoUrl 
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLongText = text.length > 300;
  
  // Determine if text should be truncated
  const displayText = !expanded && isLongText 
    ? `${text.substring(0, 300)}...` 
    : text;
  
  // Handle click on the bubble to expand/collapse
  const handleClick = (e: React.MouseEvent) => {
    // Only toggle if the text is long
    if (isLongText) {
      e.stopPropagation(); // Prevent event bubbling
      setExpanded(!expanded);
    }
  };
  
  return (
    <div className={`${styles.bubbleContainer} ${styles[sender]}`}>
      <div className={styles.messageContent}>
        <div className={styles.avatar}>
          {sender === 'user' ? (
            userPhotoUrl ? (
              <img src={userPhotoUrl} alt="User" className={styles.avatarImage} />
            ) : (
              <User size={24} />
            )
          ) : (
            <Bot size={24} />
          )}
        </div>
        </div>
        
        <div 
          className={`${styles.bubble} ${styles[sender]}`}
          onClick={handleClick}
        >
          <div className={styles.text}>
            {displayText}
            
            {isLongText && (
              <button 
                className={styles.expandButton}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent double triggering
                  setExpanded(!expanded);
                }}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
    </div>
  );
};

export default ChatBubble; 