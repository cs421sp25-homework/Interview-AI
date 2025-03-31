// VoiceInterviewPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Home, Bot, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import styles from './InterviewPage.module.css';
import { text2speech, speech2text } from '../utils/voiceUtils';
import VoiceBubble from '../components/VoiceBubble';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  audioUrl?: string;
  duration?: number;
  isReady: boolean;
  realText?: string; // For AI placeholder usage in subsequent messages
}

const VoiceInterviewPage: React.FC = () => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showTextForMessage, setShowTextForMessage] = useState<Record<number, boolean>>({});

  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const hasAutoPlayedInitial = useRef(false);

  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const userEmail = localStorage.getItem('user_email') || '';

  // Stop all audios
  const stopAllAudios = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    });
    audioRefs.current = [];
    setCurrentlyPlaying(null);
  }, []);

  // Play a given message
  const handlePlayMessage = useCallback(
    async (msg: ChatMessage, index: number) => {
      stopAllAudios();
      try {
        if (msg.sender === 'user' && msg.audioUrl) {
          // User message has its own recorded audio URL
          const audio = new Audio(msg.audioUrl);
          audioRefs.current.push(audio);
          audio.onended = () => {
            setCurrentlyPlaying(null);
            audioRefs.current = audioRefs.current.filter((a) => a !== audio);
          };
          await audio.play();
          setCurrentlyPlaying(index);
        } else if (msg.sender === 'ai') {
          // AI message uses TTS
          await text2speech(msg.text, audioRefs);
          setCurrentlyPlaying(index);
        }
      } catch (error) {
        console.error('Error playing message:', error);
        setCurrentlyPlaying(null);
      }
    },
    [stopAllAudios]
  );

  // Toggle text
  const toggleShowText = useCallback((index: number) => {
    setShowTextForMessage((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  // Save chat history
  const saveChatHistory = useCallback(
    async (currentThreadId: string, chatMessages: ChatMessage[]) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat_history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: currentThreadId,
            email: userEmail,
            messages: chatMessages,
            config_name,
            config_id
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to save chat history: ${response.status} ${response.statusText}`);
        }
        return true;
      } catch (error) {
        console.error('Error saving chat history:', error);
        return false;
      }
    },
    [userEmail, config_name, config_id]
  );

  // Auto-scroll on messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize interview
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    const storedUserPhoto = localStorage.getItem('user_photo_url');
    if (storedUserPhoto) {
      setUserPhotoUrl(storedUserPhoto);
    }

    if (!config_name || !config_id) {
      message.error('No interview configuration found. Please select a configuration first.');
      navigate('/prompts');
      return;
    }

    const initializeSession = async () => {
      try {
        let userProfile = null;
        try {
          const profileResponse = await fetch(`${API_BASE_URL}/api/profile/${userEmail}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.data) {
              userProfile = profileData.data;
            }
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: config_name,
            userProfile: userProfile || {
              first_name: localStorage.getItem('user_first_name') || '',
              last_name: localStorage.getItem('user_last_name') || '',
              job_title: localStorage.getItem('user_job_title') || '',
              key_skills: localStorage.getItem('user_skills')
                ? localStorage.getItem('user_skills')!.split(',')
                : [],
              education_history: JSON.parse(localStorage.getItem('user_education') || '[]'),
              resume_experience: JSON.parse(localStorage.getItem('user_experience') || '[]')
            }
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to start interview: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setThreadId(data.thread_id);

        const welcomeMessage = data.response || 
          `Welcome to your voice interview session for "${config_name}". Click the microphone below to start speaking.`;

        // Hide the first message until TTS is ready:
        if (!hasAutoPlayedInitial.current) {
          hasAutoPlayedInitial.current = true;
          
          // Generate TTS for the *initial* AI response
          const duration = await text2speech(welcomeMessage, audioRefs);

          // Now that TTS is done, add the message to state with a real duration
          setMessages([
            {
              text: welcomeMessage,
              sender: 'ai',
              duration,
              isReady: true
            }
          ]);
        } else {
          const realAiText = data.response || "I'm thinking about my response...";
          const aiMessage: ChatMessage = {
            text: '...', // placeholder
            realText: realAiText,
            sender: 'ai',
            isReady: false
          };
          setMessages((prev) => [...prev, aiMessage]);
        }

        // const welcomeDuration = await text2speech(welcomeMessage, audioRefs);

        // // Now that TTS is done, we have a real duration - only THEN
        // // add the AI message to state:
        // const aiWelcomeMessage: ChatMessage = {
        //   text: welcomeMessage,
        //   sender: 'ai',
        //   duration: welcomeDuration,
        //   isReady: true
        // };
        // setMessages([aiWelcomeMessage]);

        setIsChatReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing voice session:', error);
        message.error('Failed to initialize voice interview. Please try again.');
        setIsLoading(false);
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      stopAllAudios();
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [navigate, config_name, config_id, userEmail, stopAllAudios]);

  // Start/stop recording
  const toggleRecording = async () => {
    if (!isChatReady) return;

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        });

        mediaRecorder.addEventListener('stop', async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          if (audioBlob.size > 0) {
            await handleRecordingComplete(audioBlob);
          } else {
            message.error('Empty recording detected.');
          }
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        });

        mediaRecorder.start();
        setIsRecording(true);
        message.info('Recording started');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        message.error('Unable to access microphone');
      }
    } else {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      message.info('Recording stopped');
    }
  };

  // Process the recorded audio
  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;

      const transcript = await speech2text(audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);

      const userMessage: ChatMessage = {
        text: transcript,
        sender: 'user',
        audioUrl,
        duration,
        isReady: true
      };

      setMessages((prev) => [...prev, userMessage]);
      await handleSendVoice(userMessage);
    } catch (error) {
      console.error('Recording processing error:', error);
      message.error('Error processing recording. Please try again.');
    }
  };

  // Handle AI reply
  const handleSendVoice = async (userMessage: ChatMessage) => {
    if (!threadId) {
      message.warning('No active interview session');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          thread_id: threadId,
          email: userEmail,
          config_name,
          config_id
        })
      });

      if (!res.ok) {
        throw new Error('Network response not ok');
      }

      const data = await res.json();
      const realAiText = data.response || "I'm thinking about my response...";

      // Insert a placeholder bubble for the new AI reply
      const aiMessage: ChatMessage = {
        text: '...', // placeholder
        realText: realAiText,
        sender: 'ai',
        isReady: false
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Generate TTS in background
      const duration = await text2speech(realAiText, audioRefs);

      // Replace placeholder with final text
      setMessages((prev) =>
        prev.map((msg) =>
          msg === aiMessage
            ? { ...msg, text: realAiText, duration, isReady: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      message.error('Failed to send message. Please try again.');
    }
  };

  // End interview
  const handleEndInterview = async () => {
    stopAllAudios();
    if (!threadId) {
      navigate('/dashboard');
      return;
    }

    try {
      message.loading('Saving your voice interview responses...', 1);

      const finalMessages: ChatMessage[] = [
        ...messages,
        {
          text: 'Voice interview session ended',
          sender: 'ai',
          isReady: true
        }
      ];
      const saveResult = await saveChatHistory(threadId, finalMessages);
      if (saveResult) {
        message.success('Voice interview ended. Your responses have been saved.');
      } else {
        message.warning('Interview ended, but there might be an issue saving your responses.');
      }

      localStorage.removeItem('current_config');
      localStorage.removeItem('current_config_id');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending voice interview:', error);
      message.error('Failed to end voice interview properly.');
    }
  };

  const handleBackToDashboard = () => {
    handleEndInterview();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader size={48} className={styles.loadingSpinner} />
          <h2>Initializing voice interview</h2>
          <p>Setting up your voice interview for: {config_name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      <div className={styles.interviewHeader}>
        <button className={styles.backButton} onClick={handleBackToDashboard}>
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Voice Interview: {config_name}</h1>
        <button className={styles.endButton} onClick={handleEndInterview}>
          <X size={20} /> End Interview
        </button>
      </div>
      <div className={styles.chatInterface}>
        <div ref={chatContainerRef} className={styles.chatContainer}>
          {messages.map((msg, index) => {
            // If it's an AI message that isn't ready, show the placeholder
            if (msg.sender === 'ai' && !msg.isReady) {
              return (
                <div
                  key={index}
                  className={`${styles.messageWrapper} ${styles.aiMessageWrapper}`}
                >
                  <div className={styles.avatarContainer}>
                    <div className={styles.botAvatar}>
                      <Bot size={24} />
                    </div>
                  </div>
                  <div className={styles.placeholderBubble}>
                    ...
                  </div>
                </div>
              );
            }

            // Otherwise, show a normal bubble
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
                        <div className={styles.defaultUserAvatar}>
                          {userEmail.charAt(0).toUpperCase()}
                        </div>
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
        <div className={styles.micContainer}>
          <button
            className={`${styles.largeMic} ${isRecording ? styles.recording : ''}`}
            onClick={toggleRecording}
            disabled={!isChatReady}
          >
            {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
          </button>
          <p>{isRecording ? 'Recording... Click to stop' : 'Click to start recording'}</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewPage;
