import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Home, Bot, Loader, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import API_BASE_URL from '../config/api';
import styles from './InterviewPage.module.css';
import VoiceBubble from '../components/VoiceBubble';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  audioUrl?: string;
  storagePath?: string;  // Add this
  duration?: number;
  isReady: boolean;
  realText?: string;
}

// 添加保存过渡动画组件
const SavingOverlay = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <div className={styles.savingOverlay}>
      <div className={styles.savingContent}>
        <Save size={60} className={styles.savingIcon} />
        <h2 className={styles.savingText}>Saving Interview</h2>
        <p className={styles.savingSubtext}>
          Please wait while we save your voice interview data...
        </p>
      </div>
    </div>
  );
};

const VoiceInterviewPage: React.FC = () => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showTextForMessage, setShowTextForMessage] = useState<Record<number, boolean>>({});
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showSavingOverlay, setShowSavingOverlay] = useState(false);

  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const hasAutoPlayedInitial = useRef(false);
  const pendingAudioQueue = useRef<{url: string, index: number}[]>([]);

  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const userEmail = localStorage.getItem('user_email') || '';

  // Stop all audios
  const stopAllAudios = useCallback(() => {
    try {
      // 立即重置当前播放状态
      setCurrentlyPlaying(null);
      setIsAISpeaking && setIsAISpeaking(false);
      
      // 遍历并停止所有音频
      audioRefs.current.forEach((audio) => {
        try {
          // 暂停音频播放
          audio.pause();
          // 重置播放位置
          audio.currentTime = 0;
          // 移除所有事件监听器
          audio.onended = null;
          audio.onplay = null;
          audio.onpause = null;
          audio.onerror = null;
          
          // 释放 blob URL
          if (audio.src) {
            if (audio.src.startsWith('blob:') || audio.src.startsWith(`${API_BASE_URL}/audio`)) {
              URL.revokeObjectURL(audio.src);
            }
            // 清空音频源
            audio.src = '';
            audio.load();
          }
        } catch (audioError) {
          console.warn('Error cleaning up individual audio:', audioError);
        }
      });
      
      // 清空音频引用数组
      audioRefs.current = [];
    } catch (error) {
      console.error('Error stopping all audios:', error);
    }
  }, []);

  // Play a given message
  const handlePlayMessage = useCallback(
    async (msg: ChatMessage, index: number) => {
      stopAllAudios();
      try {
        if (!msg.audioUrl) {
          throw new Error('No audio available for this message');
        }
        
        const audio = new Audio(msg.audioUrl);
        audioRefs.current.push(audio);
        
        if (msg.sender === 'ai') {
          setIsAISpeaking(true);
        }
        
        audio.onended = () => {
          setCurrentlyPlaying(null);
          audioRefs.current = audioRefs.current.filter((a) => a !== audio);
          if (msg.sender === 'ai') {
            setIsAISpeaking(false);
          }
        };
        
        await audio.play();
        setCurrentlyPlaying(index);
      } catch (error) {
        console.error('Error playing message:', error);
        setCurrentlyPlaying(null);
        setIsAISpeaking(false);
        message.error('Failed to play audio message');
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
            
            setIsAISpeaking(true);
            
            audio.onended = () => {
              setIsAISpeaking(false);
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
            await playAudio(ttsData.audio_url);
            
          } catch (error) {
            console.error('Error generating welcome message audio:', error);
            // Fallback to text-only if audio fails
            setMessages([{
              text: welcomeMessage,
              sender: 'ai',
              isReady: true
            }]);
            setIsAISpeaking(false);
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
  
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      const realAiText = data.response || "I'm thinking...";
  
      // Insert placeholder
      const aiMessage: ChatMessage = {
        text: '...',
        realText: realAiText,
        sender: 'ai',
        isReady: false
      };
      setMessages(prev => [...prev, aiMessage]);
  
      // Generate and store TTS
      const ttsResponse = await fetch(`${API_BASE_URL}/api/text2speech/${userEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: realAiText })
      });
      
      const ttsData = await ttsResponse.json();
  
      const updatedAiMessage = { 
        ...aiMessage, 
        text: realAiText,
        audioUrl: ttsData.audio_url,
        storagePath: ttsData.storage_path,
        duration: ttsData.duration,
        isReady: true 
      };
      
      setMessages(prev =>
        prev.map(msg =>
          msg === aiMessage ? updatedAiMessage : msg
        )
      );
      
      await playAudio(ttsData.audio_url);

    } catch (error) {
      console.error('Chat error:', error);
      setIsAISpeaking(false);
      message.error('Failed to send message. Please try again.');
    }
  };

  // End interview
  const handleEndInterview = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setShowSavingOverlay(true);
    
    stopAllAudios();
    
    try {
      message.loading('Saving your interview...', 1);
      
      const finalMessages = messages.map(msg => ({
        ...msg,
        ...(msg.audioUrl ? { 
          audioUrl: msg.audioUrl,
          storagePath: msg.storagePath,
          duration: msg.duration 
        } : {})
      }));
  
      await saveChatHistory(threadId!, finalMessages);
      message.success('Interview saved successfully');
      
      setTimeout(() => {
        setShowSavingOverlay(false);
        navigate(`/dashboard`);
      }, 800);
    } catch (error) {
      console.error('Error ending interview:', error);
      message.error('Failed to save interview');
      setIsSaving(false);
      setShowSavingOverlay(false);
    }
  };

  const handleBackToDashboard = () => {
    handleEndInterview();
    stopAllAudios();
    navigate("/dashboard");
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 1 && !isSaving) {
        e.preventDefault();
        e.returnValue = '您有未保存的面试数据，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      stopAllAudios();
      
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      }
      
      if (threadId && messages.length > 1 && !isSaving) {
        try {
          const finalMessages = messages.map(msg => ({
            ...msg,
            ...(msg.audioUrl ? { 
              audioUrl: msg.audioUrl,
              storagePath: msg.storagePath,
              duration: msg.duration 
            } : {})
          }));
          
          const data = {
            thread_id: threadId,
            email: userEmail,
            messages: finalMessages,
            config_name,
            config_id
          };
          
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE_URL}/api/chat_history`, blob);
        } catch (error) {
          console.error('Error in cleanup save:', error);
        }
      }
    };
  }, [threadId, messages, stopAllAudios, userEmail, config_name, config_id, isSaving]);

  const initializeAudio = useCallback(() => {
    if (audioInitialized) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const silenceBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silenceBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      setAudioInitialized(true);
      
      if (pendingAudioQueue.current.length > 0) {
        const next = pendingAudioQueue.current.shift();
        if (next) {
          handlePlayMessage(messages[next.index], next.index);
        }
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, [audioInitialized, handlePlayMessage, messages]);

  useEffect(() => {
    initializeAudio();
    
    const handleUserInteraction = () => {
      if (!audioInitialized) {
        initializeAudio();
      }
    };
    
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });
    
    return () => {
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [initializeAudio, audioInitialized]);

  const playAudio = async (audioUrl: string) => {
    try {
      if (!audioInitialized) {
        const index = messages.length - 1;
        pendingAudioQueue.current.push({ url: audioUrl, index });
        return null;
      }
      
      const audio = new Audio(audioUrl);
      audioRefs.current.push(audio);
      
      setIsAISpeaking(true);
      
      audio.onended = () => {
        setIsAISpeaking(false);
        setCurrentlyPlaying(null);
        audioRefs.current = audioRefs.current.filter(a => a !== audio);
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsAISpeaking(false);
        setCurrentlyPlaying(null);
        audioRefs.current = audioRefs.current.filter(a => a !== audio);
        message.error('Failed to play AI response');
      };
      
      try {
        const index = messages.length - 1;
        setCurrentlyPlaying(index);
        
        await audio.play();
      } catch (playError) {
        console.warn('Autoplay prevented by browser:', playError);
        
        setIsAISpeaking(false);
        setCurrentlyPlaying(null);
      }
      
      return audio;
    } catch (error) {
      console.error('Error setting up audio playback:', error);
      setIsAISpeaking(false);
      setCurrentlyPlaying(null);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader size={80} className={styles.loadingSpinner} />
          <h2>Initializing Voice Interview</h2>
          <p>We're setting up your interactive voice interview experience for: <strong>{config_name}</strong></p>
          
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
          
          <div className={styles.loadingText}>Preparing AI voice interviewer...</div>
          
          <span className={styles.secondaryText}>
            Please ensure your microphone is ready
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      <SavingOverlay isVisible={showSavingOverlay} />
      
      <div className={styles.interviewHeader}>
        <button 
          className={`${styles.backButton} ${isSaving ? styles.saving : ''}`}
          onClick={handleBackToDashboard}
          disabled={isSaving}
        >
          <Home size={18} />
          {isSaving ? 'Saving...' : 'Back to Dashboard'}
        </button>
        <h1>Voice Interview: {config_name}</h1>
        <button 
          className={`${styles.endButton} ${isSaving ? styles.saving : ''}`}
          onClick={handleEndInterview}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader size={20} className={styles.loadingSpinner} /> Saving...
            </>
          ) : (
            <>
              <X size={20} /> End Interview
            </>
          )}
        </button>
      </div>
      <div className={styles.chatInterface}>
        <div ref={chatContainerRef} className={styles.chatContainer}>
          {messages.map((msg, index) => {
            // If AI message is not ready, show loading UI
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
                  <div className={styles.aiGeneratingBubble}>
                    <div className={styles.waveDot}></div>
                    <div className={styles.waveDot}></div>
                    <div className={styles.waveDot}></div>
                    <span className={styles.aiGeneratingText}>Generating message</span>
                  </div>
                </div>
              );
            }

            // Otherwise, show a normal bubble with the avatar inside
            return (
              <div key={index}>
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
        </div>
        <div className={styles.micContainer}>
          <button
            className={`${styles.largeMic} ${isRecording ? styles.recording : ''} ${isAISpeaking ? styles.disabled : ''}`}
            onClick={toggleRecording}
            disabled={!isChatReady || isAISpeaking}
          >
            {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
          </button>
          <p>
            {isAISpeaking 
              ? 'AI is speaking... Please wait' 
              : isRecording 
                ? 'Recording... Click to stop' 
                : 'Click to start recording'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewPage;