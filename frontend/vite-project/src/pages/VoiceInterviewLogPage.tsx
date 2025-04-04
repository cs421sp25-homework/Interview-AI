// src/pages/VoiceInterviewLogPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message, Button } from 'antd';
import { Bot, Home, Loader } from 'lucide-react';
import API_BASE_URL from '../config/api';
import styles from './InterviewPage.module.css';  // reuse the same CSS from InterviewPage
import VoiceBubble from '../components/VoiceBubble';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  audioUrl?: string;
  storagePath?: string;
  duration?: number;
  isReady: boolean;
  realText?: string;
}

const VoiceInterviewLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // read the interview ID from the route
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showTextForMessage, setShowTextForMessage] = useState<Record<number, boolean>>({});
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);

  // -------------
  // 1) STOP ALL AUDIOS
  // -------------
  const stopAllAudios = useCallback(() => {
    try {
      setCurrentlyPlaying(null);
      // Stop all audio playback
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onplay = null;
        audio.onerror = null;
        // release blob URLs
        if (audio.src && (audio.src.startsWith('blob:') || audio.src.startsWith(`${API_BASE_URL}/audio`))) {
          URL.revokeObjectURL(audio.src);
        }
        audio.src = '';
        audio.load();
      });
      audioRefs.current = [];
    } catch (error) {
      console.error('Error stopping all audios:', error);
    }
  }, []);

  // -------------
  // 2) HANDLE PLAY MESSAGE
  // -------------
  const handlePlayMessage = useCallback(
    async (msg: ChatMessage, index: number) => {
      // stop any current audio first
      stopAllAudios();
      if (!msg.audioUrl) {
        message.warning('No audio found for this message');
        return;
      }
      try {
        const audio = new Audio(msg.audioUrl);
        audioRefs.current.push(audio);

        audio.onended = () => {
          setCurrentlyPlaying(null);
          audioRefs.current = audioRefs.current.filter((a) => a !== audio);
        };

        await audio.play(); // returns a promise
        setCurrentlyPlaying(index);
      } catch (error) {
        console.error('Error playing audio message:', error);
        setCurrentlyPlaying(null);
        message.error('Failed to play audio message');
      }
    },
    [stopAllAudios]
  );

  // -------------
  // 3) TOGGLE SHOW TEXT
  // -------------
  const toggleShowText = useCallback((index: number) => {
    setShowTextForMessage((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  // -------------
  // 4) FETCH THE VOICE LOG ON LOAD
  // -------------
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      message.error('You are not logged in. Redirecting...');
      navigate('/login');
      return;
    }

    // optionally load user photo
    const storedUserPhoto = localStorage.getItem('user_photo_url');
    if (storedUserPhoto) {
      setUserPhotoUrl(storedUserPhoto);
    }

    // load interview log from the DB, by ID
    const fetchVoiceLog = async () => {
      setIsLoading(true);
      try {
        // GET: /api/chat_history/:id or your actual endpoint
        const response = await fetch(`${API_BASE_URL}/api/chat_history/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch voice interview log: status ${response.status}`);
        }
        const data = await response.json();
        // data might look like: { id: ..., messages: [...], etc. }
        // adjust as needed based on your backend shape
        if (!data || !data.messages) {
          throw new Error('No messages found in response');
        }

        // in your code, you might have data.log or data.messages
        // parse them into ChatMessage objects:
        setMessages(data.messages);
      } catch (error) {
        console.error('Error fetching voice interview log:', error);
        message.error('Failed to load voice interview log');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoiceLog();

    // on unmount, stop audios
    return () => {
      stopAllAudios();
    };
  }, [id, navigate, stopAllAudios]);

  // -------------
  // 5) SCROLL TO BOTTOM WHEN MESSAGES CHANGE
  // -------------
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // -------------
  // 6) RENDERING
  // -------------
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader size={48} className={styles.loadingSpinner} />
          <h2>Loading Voice Interview Log</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      <div className={styles.interviewHeader}>
        <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Voice Interview Log</h1>
        {/* Optional: additional buttons (Export, etc.) */}
      </div>

      <div className={styles.chatInterface}>
        <div ref={chatContainerRef} className={styles.chatContainer}>
          {messages.map((msg, index) => {
            return (
              <div
                key={index}
                className={`${styles.messageWrapper} ${
                  msg.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper
                }`}
              >
                <div className={styles.avatarContainer}>
                  {msg.sender === 'ai' ? (
                    <div className={styles.botAvatar}>
                      <Bot size={24} />
                    </div>
                  ) : (
                    <div className={styles.userAvatar}>
                      {userPhotoUrl ? (
                        <img src={userPhotoUrl} alt="User" />
                      ) : (
                        <div className={styles.defaultUserAvatar}>U</div>
                      )}
                    </div>
                  )}
                </div>
                <VoiceBubble
                  message={msg}
                  isPlaying={currentlyPlaying === index}
                  onPlay={() => handlePlayMessage(msg, index)}
                  onToggleText={() => toggleShowText(index)}
                  showText={!!showTextForMessage[index]}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewLogPage;
