import React, { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './InterviewPage.module.css';

const VoiceInterviewPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const activeConversationId = location.pathname.split('/').pop();
  
  useEffect(() => {
    loadSessionInfo();
  }, [activeConversationId]);
  
  const loadSessionInfo = () => {
    setIsLoading(true);
    
    try {
      const logsString = localStorage.getItem('interview_logs');
      if (logsString && activeConversationId) {
        const logs = JSON.parse(logsString);
        const activeLog = logs.find((log: any) => log.id.toString() === activeConversationId);
        
        if (activeLog) {
          console.log("Found voice session:", activeLog);
          setSessionInfo(activeLog);
          setIsLoading(false);
          return;
        }
      }
      
      console.error("No session info found for ID:", activeConversationId);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading session info:", error);
      setIsLoading(false);
    }
  };
  
  const startVoiceInterview = () => {
    navigate('/interview/voice/ongoing');
  };
  
  return (
    <>
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading voice interview session...</p>
        </div>
      ) : (
        <div className={styles.startInterviewContainer}>
          <h2>Voice Interview Session</h2>
          {sessionInfo ? (
            <>
              <p>You are about to start a voice interview for: <strong>{sessionInfo.title}</strong></p>
              <p>This interview will use your microphone to capture your responses.</p>
              <button 
                className={styles.startButton}
                onClick={startVoiceInterview}
              >
                <Mic size={20} />
                Start Voice Interview
              </button>
            </>
          ) : (
            <p>No session information found. Please select a configuration and try again.</p>
          )}
        </div>
      )}
    </>
  );
};

export default VoiceInterviewPage;
