// src/pages/VoiceInterviewLogPage.tsx

import React, {
    useState,
    useEffect,
    useRef,
    useCallback
  } from 'react';
  import { useNavigate, useParams } from 'react-router-dom';
  import { message, Button, Tooltip } from 'antd';
  import { Home, Bot, Loader, Sparkles, Check } from 'lucide-react';
  import VoiceBubble from '../components/VoiceBubble';
  import API_BASE_URL from '../config/api';
  import styles from './VoiceInterviewLogPage.module.css';
  
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
    const { id } = useParams<{ id: string }>();
  
    // State for chat messages and loading
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  
    // For audio playback
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
    const audioRefs = useRef<HTMLAudioElement[]>([]);
  
    // Toggle text for each message
    const [showTextForMessage, setShowTextForMessage] = useState<Record<number, boolean>>({});
  
    // For AI improvements
    const [generatedResponses, setGeneratedResponses] = useState<{ [index: number]: string }>({});
    const [loadingResponses, setLoadingResponses] = useState<{ [index: number]: boolean }>({});
    const [loadingCount, setLoadingCount] = useState<{ [index: number]: number }>({});
  
    // For user avatar
    const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  
    // Ref for auto-scrolling
    const chatContainerRef = useRef<HTMLDivElement>(null);
  
    /**
     * Stop all playing audio
     */
    const stopAllAudios = useCallback(() => {
      setCurrentlyPlaying(null);
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onplay = null;
        audio.onerror = null;
        // Revoke if needed
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        audio.src = '';
        audio.load();
      });
      audioRefs.current = [];
    }, []);
  
    /**
     * Handle playing a specific message
     */
    const handlePlayMessage = useCallback(
      async (msg: ChatMessage, index: number) => {
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
  
          await audio.play();
          setCurrentlyPlaying(index);
        } catch (err) {
          console.error('Error playing audio:', err);
          setCurrentlyPlaying(null);
          message.error('Failed to play audio');
        }
      },
      [stopAllAudios]
    );
  
    /**
     * Toggle transcript for a message
     */
    const toggleShowText = useCallback((index: number) => {
      setShowTextForMessage((prev) => ({
        ...prev,
        [index]: !prev[index]
      }));
    }, []);
  
    /**
     * Retrieve the voice interview log from your backend
     */
    useEffect(() => {
      const email = localStorage.getItem('user_email');
      if (!email) {
        message.error('You are not logged in. Redirecting...');
        navigate('/login');
        return;
      }
  
      // If user has a profile pic
      const storedUserPhoto = localStorage.getItem('user_photo_url');
      if (storedUserPhoto) {
        setUserPhotoUrl(storedUserPhoto);
      }
  
      setIsLoading(true);
  
      const fetchVoiceLog = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/chat_history/${id}`);
          if (!res.ok) {
            throw new Error(`Failed to fetch voice interview log: ${res.status}`);
          }
          const data = await res.json();
          if (!data || !data.messages) {
            throw new Error('No messages found in response');
          }
          setMessages(data.messages);
        } catch (error) {
          console.error('Error fetching voice interview log:', error);
          message.error('Failed to load voice interview log');
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchVoiceLog();
  
      return () => {
        stopAllAudios();
      };
    }, [id, navigate, stopAllAudios]);
  
    /**
     * Scroll to bottom when messages change
     */
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [messages]);
  
    /**
     * Generate improved AI response for a user message
     */
    const handleGenerateResponse = async (userMessageText: string, index: number) => {
      // Mark this message as loading
      setLoadingResponses((prev) => ({ ...prev, [index]: true }));
      // Use a count to keep track of "dots" or "wave" animations, etc.
      setLoadingCount((prev) => ({ ...prev, [index]: 0 }));
  
      const loadingInterval = setInterval(() => {
        // Just increment a count so we can do some minor re-render for animations
        setLoadingCount((prev) => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
      }, 800);
  
      try {
        // Attempt to find an AI question that preceded this user message
        let aiQuestion = '';
        for (let i = index - 1; i >= 0; i--) {
          if (messages[i]?.sender === 'ai') {
            aiQuestion = messages[i].text;
            break;
          }
        }
  
        const res = await fetch(`${API_BASE_URL}/api/generate_good_response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessageText,
            ai_question: aiQuestion
          })
        });
        const data = await res.json();
  
        if (data.response) {
          setTimeout(() => {
            setGeneratedResponses((prev) => ({ ...prev, [index]: data.response }));
            message.success('AI response generated successfully');
            setLoadingResponses((prev) => ({ ...prev, [index]: false }));
            clearInterval(loadingInterval);
          }, 500);
        } else {
          message.error('Failed to generate AI improvement');
          setLoadingResponses((prev) => ({ ...prev, [index]: false }));
          clearInterval(loadingInterval);
        }
      } catch (err) {
        console.error('Error generating AI response:', err);
        message.error('Failed to generate AI improvement');
        setLoadingResponses((prev) => ({ ...prev, [index]: false }));
        clearInterval(loadingInterval);
      }
    };
  
    /**
     * A more "beautiful" loading UI
     */
    const renderLoadingUI = (index: number) => {
      // We'll do a shimmer + "preparing your improved response..."
      // The integer in `loadingCount[index]` can be used to animate dots or a wave effect, etc.
      const cycles = loadingCount[index] || 0;
      // We'll do a simple "dot-dot-dot" approach
      const dots = '.'.repeat((cycles % 4) + 1);
  
      return (
        <div className={styles.beautifulLoaderContainer}>
          <div className={styles.shimmerBox}>
            <div className={styles.shimmer} />
          </div>
          <p className={styles.loadingText}>
            Preparing your improved response
            {dots}
          </p>
        </div>
      );
    };
  
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
        {/* Header */}
        <div className={styles.interviewHeader}>
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            <Home size={18} />
            Back to Dashboard
          </button>
  
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Voice Interview Log</h1>
          </div>
        </div>
  
        {/* Chat area */}
        <div className={styles.chatInterface}>
          <div ref={chatContainerRef} className={styles.chatContainer}>
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
  
              return (
                <div
                  key={index}
                  className={`
                    ${styles.messageWrapper}
                    ${isUser ? styles.userMessageWrapper : styles.aiMessageWrapper}
                  `}
                >
                  {/* Avatar */}
                  <div className={styles.avatarContainer}>
                    {isUser ? (
                      <div className={styles.userAvatar}>
                        {userPhotoUrl ? (
                          <img src={userPhotoUrl} alt="User" />
                        ) : (
                          <div className={styles.defaultUserAvatar}>U</div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.botAvatar}>
                        <Bot size={24} />
                      </div>
                    )}
                  </div>
  
                  {/* Voice bubble with optional text */}
                  <VoiceBubble
                    message={msg}
                    isPlaying={currentlyPlaying === index}
                    onPlay={() => handlePlayMessage(msg, index)}
                    onToggleText={() => toggleShowText(index)}
                    showText={!!showTextForMessage[index]}
                  />
  
                  {/* If user message & user has chosen to show text, show AI generation under it */}
                  {isUser && showTextForMessage[index] && (
                    <div className={styles.generatedContainer}>
                      {generatedResponses[index] ? (
                        <div className={styles.generatedResponse}>
                          {generatedResponses[index]}
                          <Tooltip title="This is an AI-recommended response for your reference.">
                            <span className={styles.infoIcon}>
                              <Check size={16} />
                            </span>
                          </Tooltip>
                        </div>
                      ) : loadingResponses[index] ? (
                        // Use our new "beautiful" loading UI
                        renderLoadingUI(index)
                      ) : (
                        <Tooltip title="Generate an AI-suggested response to improve your answer quality">
                          <Button
                            onClick={() => handleGenerateResponse(msg.text, index)}
                            className={styles.generateButton}
                          >
                            <Sparkles size={16} />
                            <span>Generate AI Response</span>
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  export default VoiceInterviewLogPage;
  