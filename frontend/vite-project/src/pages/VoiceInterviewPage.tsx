// VoiceInterviewPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Home, Bot, Loader, Save } from 'lucide-react';
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

  // Retrieve user/config data from localStorage
  const config_name = localStorage.getItem('current_config') || '';
  const config_id = localStorage.getItem('current_config_id') || '';
  const userEmail = localStorage.getItem('user_email') || '';

  // -----------------------------------------------------------
  // Stop all currently playing audios
  // -----------------------------------------------------------
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
          message: userMsg.text,
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
        isReady: false,
      };
      setMessages(prev => [...prev, aiMessage]);
  
      // Generate and store TTS
      const ttsResponse = await fetch(`${API_BASE_URL}/api/text2speech/${userEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: realAiText })
      });
      
      const ttsData = await ttsResponse.json();
  
      // 更新消息对象
      const updatedAiMessage = { 
        ...aiMessage, 
        text: realAiText,
        audioUrl: ttsData.audio_url,
        storagePath: ttsData.storage_path,
        duration: ttsData.duration,
        isReady: true 
      };
      
      // 更新消息状态
      setMessages(prev =>
        prev.map(msg =>
          msg === aiMessage ? updatedAiMessage : msg
        )
      );
      
      // 使用新的播放函数
      await playAudio(ttsData.audio_url);

    } catch (error) {
      console.error('Chat error:', error);
      setIsAISpeaking(false);
      message.error('Failed to send message. Please try again.');
    }
  };

  // -----------------------------------------------------------
  // End interview & save
  // -----------------------------------------------------------
  const handleEndInterview = async () => {
    // 防止多次点击触发多次请求
    if (isSaving) return;
    
    // 设置保存状态
    setIsSaving(true);
    
    // 显示保存动画
    setShowSavingOverlay(true);
    
    // 首先停止所有音频播放
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
      
      // 短暂延迟以显示保存动画
      setTimeout(() => {
        // 隐藏保存动画
        setShowSavingOverlay(false);
        // 保存后导航到查看页面
        navigate(`/dashboard`);
      }, 800);
    } catch (error) {
      console.error('Error ending interview:', error);
      message.error('Failed to save interview');
      // 如果出错，重置保存状态，让用户可以重试
      setIsSaving(false);
      setShowSavingOverlay(false);
    }
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    // 直接调用 handleEndInterview 函数，确保音频停止和保存逻辑执行
    handleEndInterview();
    stopAllAudios();
    navigate("/dashboard");
  };

  // 在组件卸载时确保所有音频都被停止并保存数据
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 如果有未保存的数据，显示确认提示
      if (messages.length > 1 && !isSaving) {
        e.preventDefault();
        e.returnValue = '您有未保存的面试数据，确定要离开吗？';
        return e.returnValue;
      }
    };

    // 添加页面关闭前的事件监听
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // 移除事件监听
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // 确保所有音频停止播放
      stopAllAudios();
      
      // 停止媒体录音（如果正在录制）
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      }
      
      // 如果有面试数据且没有正在保存中，尝试保存
      if (threadId && messages.length > 1 && !isSaving) {
        // 尝试同步保存（注意：这可能不会完全执行，因为页面可能已经在卸载）
        try {
          const finalMessages = messages.map(msg => ({
            ...msg,
            ...(msg.audioUrl ? { 
              audioUrl: msg.audioUrl,
              storagePath: msg.storagePath,
              duration: msg.duration 
            } : {})
          }));
          
          // 使用 sendBeacon API 尝试在页面关闭时发送保存请求
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

  // 修改初始化音频上下文的逻辑 - 自动初始化
  const initializeAudio = useCallback(() => {
    if (audioInitialized) return;
    
    try {
      // 创建一个静音的音频上下文来初始化
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const silenceBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silenceBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      setAudioInitialized(true);
      console.log('Audio context initialized successfully');
      
      // 播放队列中等待的音频
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

  // 组件挂载时自动尝试初始化
  useEffect(() => {
    // 第一次尝试自动初始化
    initializeAudio();
    
    // 仍然保留用户交互事件作为备用初始化机制
    const handleUserInteraction = () => {
      if (!audioInitialized) {
        initializeAudio();
      }
    };
    
    // 添加用户交互事件监听作为备用
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });
    
    return () => {
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [initializeAudio, audioInitialized]);

  // 修改播放音频的函数
  const playAudio = async (audioUrl: string) => {
    try {
      // 如果音频还未初始化，先将音频加入等待队列
      if (!audioInitialized) {
        const index = messages.length - 1;
        pendingAudioQueue.current.push({ url: audioUrl, index });
        console.log('Audio playback queued - waiting for initialization');
        return null;
      }
      
      // 创建音频元素
      const audio = new Audio(audioUrl);
      audioRefs.current.push(audio);
      
      // 设置 AI 正在说话
      setIsAISpeaking(true);
      
      // 添加结束事件处理
      audio.onended = () => {
        setIsAISpeaking(false);
        setCurrentlyPlaying(null);
        audioRefs.current = audioRefs.current.filter(a => a !== audio);
      };
      
      // 添加错误处理
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsAISpeaking(false);
        setCurrentlyPlaying(null);
        audioRefs.current = audioRefs.current.filter(a => a !== audio);
        message.error('Failed to play AI response');
      };
      
      // 尝试播放
      try {
        const index = messages.length - 1;
        setCurrentlyPlaying(index);
        
        // play() 返回一个 Promise
        await audio.play();
        console.log('Audio playback started successfully');
      } catch (playError) {
        console.warn('Autoplay prevented by browser:', playError);
        
        // 如果自动播放失败，提供静默反馈
        console.log('Click on AI message to play the response');
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

  // -----------------------------------------------------------
  // Main render
  // -----------------------------------------------------------
  return (
    <div className={styles.interviewContainer}>
      {/* 保存动画覆盖层 */}
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
            // 如果是AI消息且尚未准备好，显示增强的加载UI
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
