// VoiceInterviewPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Home, Bot, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import styles from './InterviewPage.module.css';
import VoiceBubble from '../components/VoiceBubble';

// -------------------
// ChatMessage Interface
// -------------------
interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';   // Must be exactly 'user' or 'ai'
  audioUrl?: string;
  storagePath?: string;  // Add this
  duration?: number;
  isReady: boolean;
  realText?: string;
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

  // Retrieve user/config data from localStorage
  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const userEmail = localStorage.getItem('user_email') || '';

  // -----------------------------------------------------------
  // Stop all currently playing audios
  // -----------------------------------------------------------
  const stopAllAudios = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        // Clean up both blob URLs and Supabase audio URLs
        if (audio.src.startsWith('blob:') || audio.src.startsWith(`${API_BASE_URL}/audio`)) {
          URL.revokeObjectURL(audio.src);
        }
        // Remove any event listeners
        audio.onended = null;
        audio.onerror = null;
      } catch (error) {
        console.warn('Error cleaning up audio:', error);
      }
    });
    audioRefs.current = [];
    setCurrentlyPlaying(null);
  }, []);

  // -----------------------------------------------------------
  // Play a given message (user or AI)
  // -----------------------------------------------------------
  const handlePlayMessage = useCallback(
    async (msg: ChatMessage, index: number) => {
      stopAllAudios();
      try {
        if (!msg.audioUrl) {
          throw new Error('No audio available for this message');
        }
        
        const audio = new Audio(msg.audioUrl);
        audioRefs.current.push(audio);
        
        audio.onended = () => {
          setCurrentlyPlaying(null);
          audioRefs.current = audioRefs.current.filter((a) => a !== audio);
        };
        
        await audio.play();
        setCurrentlyPlaying(index);
      } catch (error) {
        console.error('Error playing message:', error);
        setCurrentlyPlaying(null);
        message.error('Failed to play audio message');
      }
    },
    [stopAllAudios]
  );

  // -----------------------------------------------------------
  // Toggle showing text for a message (for AI or user)
  // -----------------------------------------------------------
  const toggleShowText = useCallback((index: number) => {
    setShowTextForMessage((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  // -----------------------------------------------------------
  // Save chat history to server
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // Auto-scroll when messages update
  // -----------------------------------------------------------
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // -----------------------------------------------------------
  // Initialize the voice interview
  // -----------------------------------------------------------
  useEffect(() => {
    // Check if user is logged in
    if (!userEmail) {
      message.warning('You must be logged in to start a voice interview.');
      navigate('/login');
      return;
    }

    setIsLoading(true);

    // Load user photo if stored
    const storedUserPhoto = localStorage.getItem('user_photo_url');
    if (storedUserPhoto) {
      setUserPhotoUrl(storedUserPhoto);
    }

    // Check if config data is missing
    if (!config_name || !config_id) {
      message.error('No interview configuration found. Please select one first.');
      navigate('/prompts');
      return;
    }

    // Create a new session
    const initializeSession = async () => {
      try {
        let userProfile = null;

        // Attempt to fetch user profile
        try {
          const profileRes = await fetch(`${API_BASE_URL}/api/profile/${userEmail}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.data) {
              userProfile = profileData.data;
            }
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Not critical, continue anyway
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
        if (!data.thread_id) {
          throw new Error('No thread_id returned from server');
        }

        setThreadId(data.thread_id);

        // Welcome / initial AI message
        const welcomeMessage = data.response || 
          `Welcome to your voice interview session for "${config_name}". Click the microphone below to start speaking.`;

        // If we haven't auto-played the initial message yet
        if (!hasAutoPlayedInitial.current) {
          hasAutoPlayedInitial.current = true;
          
          try {
            // Call text2speech API endpoint
            const ttsResponse = await fetch(`${API_BASE_URL}/api/text2speech/${userEmail}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                text: welcomeMessage,
                email: userEmail  // Include user email for path generation
              })
            });
    
            if (!ttsResponse.ok) throw new Error('TTS API call failed');
            
            const ttsData = await ttsResponse.json();
    
            // Create audio element for playback
            const audio = new Audio(ttsData.audio_url);
            audioRefs.current.push(audio);
            audio.onended = () => {
              audioRefs.current = audioRefs.current.filter(a => a !== audio);
            };
    
            // Add welcome message with audio data
            setMessages([{
              text: welcomeMessage,
              sender: 'ai',
              audioUrl: ttsData.audio_url,
              storagePath: ttsData.storage_path,
              duration: ttsData.duration,
              isReady: true
            }]);
    
            // Auto-play welcome message
            await audio.play().catch(e => console.warn('Autoplay prevented:', e));
            
          } catch (error) {
            console.error('Error generating welcome message audio:', error);
            // Fallback to text-only if audio fails
            setMessages([{
              text: welcomeMessage,
              sender: 'ai',
              isReady: true
            }]);
          }
        } else {
          const realAiText = data.response || "I'm thinking about my response...";
          setMessages(prev => [...prev, {
            text: '...',
            realText: realAiText,
            sender: 'ai',
            isReady: false
          }]);
        }
    
        setIsChatReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing voice interview:', error);
        message.error('Failed to initialize voice interview. Please try again.');
        setIsLoading(false);
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      stopAllAudios();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [navigate, userEmail, config_name, config_id, stopAllAudios]);

  // -----------------------------------------------------------
  // Start/Stop recording
  // -----------------------------------------------------------
  const toggleRecording = async () => {
    if (!isChatReady) return;
    if (!isRecording) {
      // Start recording
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
        message.error('Unable to access microphone. Please check permissions.');
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      message.info('Recording stopped');
    }
  };

  // -----------------------------------------------------------
  // On recording complete
  // -----------------------------------------------------------
  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      // Calculate duration
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration; // Get actual duration from audio data

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
  
      const response = await fetch(`${API_BASE_URL}/api/speech2text/${userEmail}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
  
      const userMessage: ChatMessage = {
        text: data.transcript,
        sender: 'user',
        audioUrl: data.audio_url,
        storagePath: data.storage_path,  // Store for backend reference
        duration: duration,
        isReady: true
      };
  
      setMessages(prev => [...prev, userMessage]);
      await handleSendVoice(userMessage);
    } catch (error) {
      console.error('Error processing recording:', error);
      message.error('Error processing recording. Please try again.');
    }
  };
  
  // -----------------------------------------------------------
  // Send user voice to API and get AI reply
  // -----------------------------------------------------------
  const handleSendVoice = async (userMsg: ChatMessage) => {
    if (!threadId) {
      message.warning('No active interview session');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          thread_id: threadId,
          email: userEmail,
          config_name,
          config_id
        })
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      const realAiText = data.response || "I'm thinking...";
  
      // Insert placeholder
      const aiMessage: ChatMessage = {
        text: '...',
        realText: realAiText,
        sender: 'ai',
        isReady: false,
        realText: realAiText
      };
      setMessages(prev => [...prev, aiMessage]);
  
      // Generate and store TTS
      const ttsResponse = await fetch(`${API_BASE_URL}/api/text2speech/${userEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: realAiText })
      });
      
      const ttsData = await ttsResponse.json();
  
      // Update with final audio data
      setMessages(prev =>
        prev.map(msg =>
          msg === aiMessage
            ? { 
                ...msg, 
                text: realAiText,
                audioUrl: ttsData.audio_url,
                storagePath: ttsData.storage_path,
                duration: ttsData.duration,
                isReady: true 
              }
            : msg
        )
      );
      
      // Auto-play response
      const audio = new Audio(ttsData.audio_url);
      await audio.play();

    } catch (error) {
      console.error('Chat error:', error);
      message.error('Failed to send voice message. Please try again.');
    }
  };

  // -----------------------------------------------------------
  // End interview & save
  // -----------------------------------------------------------
  const handleEndInterview = async () => {
    stopAllAudios();
    
    try {
      message.loading('Saving your interview...', 1);
      
      const finalMessages = messages.map(msg => ({
        ...msg,
        // Ensure all audio references are included
        ...(msg.audioUrl ? { 
          audioUrl: msg.audioUrl,
          storagePath: msg.storagePath,
          duration: msg.duration 
        } : {})
      }));
  
      await saveChatHistory(threadId!, finalMessages);
      message.success('Interview saved successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending interview:', error);
      message.error('Failed to save interview');
    }
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    handleEndInterview();
  };

  // -----------------------------------------------------------
  // Render the loading screen if needed
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // Main render
  // -----------------------------------------------------------
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
            // If it's an AI message that isn't "ready", show a placeholder
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
                  <div className={styles.placeholderBubble}>...</div>
                </div>
              );
            }

            // Normal bubble
            return (
              <div
                key={index}
                className={`
                  ${styles.messageWrapper}
                  ${msg.sender === 'ai' ? styles.aiMessageWrapper : styles.userMessageWrapper}
                `}
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
