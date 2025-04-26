// src/pages/VoiceInterviewLogPage.tsx

import React, {
    useState,
    useEffect,
    useRef,
    useCallback
  } from 'react';
  import { useNavigate, useParams } from 'react-router-dom';
  import { message, Button, Tooltip, Tabs } from 'antd';
  import { Home, Bot, Loader, Sparkles, Check, Headphones, FileText } from 'lucide-react';
  import VoiceBubble from '../components/VoiceBubble';
  import InterviewMessage from '../components/InterviewMessage';
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
    question_type?: string;
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
  
    // For user avatar
    const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
    
    // Active tab state
    const [activeTab, setActiveTab] = useState<string>("voice");
  
    // Ref for auto-scrolling
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textContainerRef = useRef<HTMLDivElement>(null);
  
    // Add these state variables near the other useState declarations
    const [loadingSteps, setLoadingSteps] = useState<{ [index: number]: number }>({});
    const [loadingTexts] = useState<string[]>([
      "Analyzing response...",
      "Generating improvements...",
      "Polishing answer...",
      "Finalizing response..."
    ]);
  
    // Add state for thread id and question type for favorite function
    const [threadId, setThreadId] = useState<string>("");
    const [questionType, setQuestionType] = useState<string>("");
  
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
          console.log('Voice chat history API response:', data);
          if (!data || !data.messages) {
            throw new Error('No messages found in response');
          }
          setMessages(data.messages);
          
          // Set thread ID and question type if available in the response
          if (data.thread_id) {
            setThreadId(data.thread_id);
          } else if (data.id) {
            // If thread_id is not available, use the id field instead
            setThreadId(String(data.id));
          } else {
            // If neither is available, use the id from the URL
            setThreadId(id || '');
          }
          
          if (data.question_type) {
            setQuestionType(data.question_type);
          } else if (data.messages && data.messages.length > 0) {
            // Try to get question_type from the first AI message if available
            const firstAiMessage = data.messages.find((msg: ChatMessage) => msg.sender === 'ai');
            if (firstAiMessage && firstAiMessage.question_type) {
              setQuestionType(firstAiMessage.question_type);
            } else {
              // Default to 'behavioral' if no question_type is found
              setQuestionType('behavioral');
            }
          } else {
            // Default to 'behavioral' if no messages found
            setQuestionType('behavioral');
          }
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
      if (activeTab === "voice" && chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else if (activeTab === "text" && textContainerRef.current) {
        textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
      }
    }, [messages, activeTab]);
  
    /**
     * Generate improved AI response for a user message
     */
    const handleGenerateResponse = async (userMessageText: string, index: number) => {
      // Mark this message as loading
      setLoadingResponses((prev) => ({ ...prev, [index]: true }));
      // Initialize the loading step for this message
      setLoadingSteps((prev) => ({ ...prev, [index]: 0 }));

      // Start the loading animation
      const loadingInterval = setInterval(() => {
        setLoadingSteps(prev => {
          if (prev[index] >= 3) return prev; // If at final step, stay there
          return { ...prev, [index]: prev[index] + 1 };
        });
      }, 1500); // Change steps every 1.5 seconds

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
          // Move to a "completed" step
          setLoadingSteps(prev => ({ ...prev, [index]: 4 }));
          
          // Slight delay to show that final state
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
     * Render voice view with audio bubbles
     */
    const renderVoiceView = () => {
      return (
        <div 
          ref={chatContainerRef} 
          className={styles.chatContainer} 
          style={{ 
            overflowY: 'scroll', 
            maxHeight: 'calc(100vh - 200px)',
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingBottom: '40px'
          }}
        >
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
                {/* Voice bubble with fixed position - contains its own avatar */}
                <VoiceBubble
                  message={msg}
                  isPlaying={currentlyPlaying === index}
                  onPlay={() => handlePlayMessage(msg, index)}
                  onToggleText={() => toggleShowText(index)}
                  showText={!!showTextForMessage[index]}
                  userPhotoUrl={userPhotoUrl}
                />
              </div>
            );
          })}
          
          {/* Add extra space at the bottom */}
          <div className={styles.bottomSpacer}></div>
        </div>
      );
    };

    /**
     * Render text view with full transcripts
     */
    const renderTextView = () => {
      return (
        <div 
          ref={textContainerRef} 
          className={styles.chatContainer} 
          style={{ 
            overflowY: 'scroll', 
            maxHeight: 'calc(100vh - 200px)',
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingBottom: '40px'
          }}
        >
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
                        <div className={styles.defaultUserAvatar}>
                          {localStorage.getItem('user_email')?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.botAvatar}>
                      <Bot size={24} />
                    </div>
                  )}
                </div>
  
                {/* Text message */}
                {isUser ? (
                  <div className={styles.userMessage}>
                    <div className={styles.messageContent}>
                      {msg.text}
                    </div>
                    
                    {/* User message always shows AI generation option */}
                    <div className={styles.generatedContainer}>
                      {generatedResponses[index] ? (
                        <div className={styles.generatedResponse}>
                          {generatedResponses[index]}
                          <Tooltip title="This is an AI-recommended response for your reference">
                            <span className={styles.infoIcon}>
                              <Check size={16} />
                            </span>
                          </Tooltip>
                        </div>
                      ) : loadingResponses[index] ? (
                        renderLoadingSteps(index)
                      ) : (
                        <Tooltip title="Generate an AI-suggested response to improve your answer quality">
                          <Button
                            onClick={() => handleGenerateResponse(msg.text, index)}
                            className={styles.generateButton}
                          >
                            <Sparkles size={16} />
                            Generate AI Response
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ) : (
                  <InterviewMessage
                    message={msg}
                    messageId={`${id}-${index}`}
                    threadId={threadId}
                    questionType={questionType}
                    isFirstMessage={index === 0}
                  />
                )}
              </div>
            );
          })}
          
          {/* Add extra space at the bottom */}
          <div className={styles.bottomSpacer}></div>
        </div>
      );
    };
  
    /**
     * Render the multi-step loading UI
     */
    const renderLoadingSteps = (index: number) => {
      const currentStep = loadingSteps[index] || 0;
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingMessage}>
            {loadingTexts[currentStep] || "Generating improved response..."}
          </div>
          
          <div className={styles.loadingSteps}>
            <div className={styles.loadingStep}>
              <div
                className={`
                  ${styles.loadingStepDot}
                  ${currentStep >= 0 ? styles.active : ''}
                  ${currentStep > 0 ? styles.completed : ''}
                `}
              ></div>
              <div
                className={`
                  ${styles.loadingStepText}
                  ${currentStep >= 0 ? styles.active : ''}
                  ${currentStep > 0 ? styles.completed : ''}
                `}
              >
                Analyze
              </div>
            </div>
            
            <div className={styles.loadingStep}>
              <div
                className={`
                  ${styles.loadingStepDot}
                  ${currentStep >= 1 ? styles.active : ''}
                  ${currentStep > 1 ? styles.completed : ''}
                `}
              ></div>
              <div
                className={`
                  ${styles.loadingStepText}
                  ${currentStep >= 1 ? styles.active : ''}
                  ${currentStep > 1 ? styles.completed : ''}
                `}
              >
                Improve
              </div>
            </div>
            
            <div className={styles.loadingStep}>
              <div
                className={`
                  ${styles.loadingStepDot}
                  ${currentStep >= 2 ? styles.active : ''}
                  ${currentStep > 2 ? styles.completed : ''}
                `}
              ></div>
              <div
                className={`
                  ${styles.loadingStepText}
                  ${currentStep >= 2 ? styles.active : ''}
                  ${currentStep > 2 ? styles.completed : ''}
                `}
              >
                Refine
              </div>
            </div>
            
            <div className={styles.loadingStep}>
              <div
                className={`
                  ${styles.loadingStepDot}
                  ${currentStep >= 3 ? styles.active : ''}
                  ${currentStep > 3 ? styles.completed : ''}
                `}
              ></div>
              <div
                className={`
                  ${styles.loadingStepText}
                  ${currentStep >= 3 ? styles.active : ''}
                  ${currentStep > 3 ? styles.completed : ''}
                `}
              >
                Finalize
              </div>
            </div>
          </div>
          
          <div className={styles.loadingProgress}>
            <div className={styles.loadingProgressBar}></div>
          </div>
        </div>
      );
    };
  
    if (isLoading) {
      return (
        <div className={styles.interviewContainer}>
          <div className={styles.interviewHeader}>
            <button className={styles.backButton} onClick={() => navigate('/interview/history')}>
              <Home size={18} />
              Back to History
            </button>
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>Interview Log</h1>
            </div>
            <div style={{ width: '120px' }}></div>
          </div>
          <div className={styles.chatInterface} style={{justifyContent: 'center', alignItems: 'center'}}>
            <div style={{textAlign: 'center'}}>
              <Loader size={40} className={styles.loadingSpinner} />
              <p style={{marginTop: '1rem', color: '#ec4899', fontWeight: 500}}>Loading Interview Log...</p>
            </div>
          </div>
        </div>
      );
    }
  
    return (
      <div className={styles.interviewContainer}>
        {/* Header */}
        <div className={styles.interviewHeader}>
          <button className={styles.backButton} onClick={() => navigate('/interview/history')}>
            <Home size={18} />
            Back to History
          </button>
  
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Interview Log</h1>
          </div>

          {/* Add a placeholder div to balance the header */}
          <div style={{ width: '120px' }}></div>
        </div>
  
        {/* Chat area with tabs */}
        <div className={styles.chatInterface}>
          <Tabs 
            defaultActiveKey="voice" 
            onChange={(key) => setActiveTab(key)}
            className={styles.interviewTabs}
            destroyInactiveTabPane={false}
            items={[
              {
                key: "voice",
                label: (
                  <span>
                    <Headphones size={16} style={{ marginRight: 8 }} />
                    Voice View
                  </span>
                ),
                children: renderVoiceView()
              },
              {
                key: "text",
                label: (
                  <span>
                    <FileText size={16} style={{ marginRight: 8 }} />
                    Text View
                  </span>
                ),
                children: renderTextView()
              }
            ]}
          />
        </div>
      </div>
    );
  };
  
  export default VoiceInterviewLogPage;
  