import React, { useState, useEffect } from 'react';
import { Button, message as antMessage } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import API_BASE_URL from '../config/api';
import styles from './InterviewMessage.module.css';

interface InterviewMessageProps {
  message: {
    text: string;
    sender: string;
    question_type?: string;
  };
  messageId: string;
  threadId: string;
  isFirstMessage?: boolean;
}

interface FavoriteQuestion {
  id: number;
  question_text: string;
  session_id: string;
  is_favorite: boolean;
  created_at: string;
}

const InterviewMessage: React.FC<InterviewMessageProps> = ({ message, messageId, threadId, isFirstMessage = false }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);

  useEffect(() => {
    checkIfFavorite();
  }, [messageId, threadId]);

  const checkIfFavorite = async () => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) return;

      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}`);
      if (!response.ok) return;

      const data = await response.json();
      const favoriteQuestion = data.data.find((q: FavoriteQuestion) => 
        q.question_text === message.text && q.session_id === threadId
      );
      
      if (favoriteQuestion) {
        setIsFavorite(true);
        setFavoriteId(favoriteQuestion.id);
      } else {
        setIsFavorite(false);
        setFavoriteId(null);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleFavorite = async () => {
    try {
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) {
        antMessage.error('Please log in to favorite questions');
        return;
      }

      const favoriteData = {
        question_text: message.text,
        email: userEmail,
        session_id: threadId,
        is_favorite: true,
        created_at: new Date().toISOString()
      };

      console.log('Sending favorite data:', favoriteData);

      const response = await fetch(`${API_BASE_URL}/api/favorite_questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(favoriteData),
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to favorite question');
      }

      if (responseData.data && responseData.data.id) {
        setFavoriteId(responseData.data.id);
        setIsFavorite(true);
        antMessage.success('Question added to favorites');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error favoriting question:', error);
      antMessage.error(error instanceof Error ? error.message : 'Failed to favorite question');
    }
  };

  const toggleFavorite = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        antMessage.error('Please log in to favorite questions');
        return;
      }

      if (isFavorite && favoriteId) {
        // Remove from favorites using the actual favorite ID
        const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${favoriteId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove from favorites');
        }

        antMessage.success('Question removed from favorites');
        setFavoriteId(null);
      } else {
        // Add to favorites
        await handleFavorite();
      }

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      antMessage.error(error instanceof Error ? error.message : 'Failed to update favorite status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.messageContainer} ${message.sender === 'ai' ? styles.aiMessage : styles.userMessage}`}>
      {message.sender === 'ai' && !isFirstMessage && (
        <Button
          type="text"
          icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
          onClick={toggleFavorite}
          loading={isLoading}
          className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
        />
      )}
      <div className={styles.messageContent}>
        {message.text}
      </div>
    </div>
  );
};

export default InterviewMessage; 