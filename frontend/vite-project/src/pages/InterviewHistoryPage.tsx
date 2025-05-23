import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker, Select, message, Modal, Typography, Empty, Tooltip, Spin, List } from 'antd';
import { SearchOutlined, DeleteOutlined, HeartOutlined, EyeOutlined, BarChartOutlined, ExclamationCircleOutlined, ExportOutlined, WarningOutlined } from '@ant-design/icons';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './InterviewHistoryPage.module.css';
import { exportToPDF } from '../utils/pdfExport';
import type { SortOrder } from 'antd/es/table/interface';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Define Message interface
interface Message {
  text: string;
  sender: string;
  question_type?: string;
  audioUrl?: string;
  storagePath?: string;
  duration?: number;
  isReady?: boolean;
}

// 辅助函数用于确保日期时区处理正确
const formatToEasternTime = (dateStr: string) => {
  try {
    // 解析ISO日期字符串，不自动应用时区偏移
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      console.error(`Invalid date: ${dateStr}`);
      return { date: "Invalid date" };
    }
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    return {
      date: dateFormatter.format(date)
    };
  } catch (error) {
    console.error(`Error formatting date: ${dateStr}`, error);
    return { date: "Invalid date" };
  }
};

interface InterviewLog {
  id: number;
  title: string;
  date: string;
  updated_at?: string;
  form: 'text' | 'voice';
  thread_id: string;
  question_count?: number;
  company_name?: string;
  interview_type?: string;
  log?: Message[];
  question_type?: string;
  job_description?: string;
  config_company_name?: string;
  interview_name?: string;
  language?: string; 
}

const InterviewHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<InterviewLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InterviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<InterviewLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [modal, contextHolder] = Modal.useModal();
  
  const navigate = useNavigate();
  
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const [favoriteQuestions, setFavoriteQuestions] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  
  const [weakestModalVisible, setWeakestModalVisible] = useState(false);
  const [weakestQuestions, setWeakestQuestions] = useState<any[]>([]);
  const [loadingWeakest, setLoadingWeakest] = useState(false);
  
  useEffect(() => {
    try {
      // Check if user is logged in
      const email = localStorage.getItem('user_email');
      if (!email) {
        navigate('/login');
        return;
      }
      
      fetchInterviewLogs();
    } catch (error) {
      console.error('Error in InterviewHistoryPage:', error);
      navigate('/login');
    }
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [logs, searchText, dateRange, typeFilter]);


  const countQuestionsInConversation = (conversation: { text: string; sender: string }[]): number => {
    return conversation
      .filter(msg => msg.sender === "ai") 
      .reduce((total, msg) => total + (msg.text.match(/\?/g) || []).length, 0);
  };
  
  const fetchInterviewLogs = async () => {
    setLoading(true);
    try {

      const userEmail = localStorage.getItem('user_email') || '';

      if (!userEmail) {
        message.error('User not logged in');
        setLoading(false);
        return;
      }


      const response = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch interview logs: ${response.status}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data.data)) {

        const transformedLogs = data.data.map((log: any) => {

          return {
            id: log.id,
            thread_id: log.thread_id,
            title: log.config_name || log.interview_name || 'Unnamed Interview',
            date: log.created_at || new Date().toISOString(),
            updated_at: log.updated_at || log.created_at || new Date().toISOString(),
            company_name: log.config_company_name || log.company_name || 'Unknown Company',
            form: log.form || 'text',
            log: typeof log.log === 'string' ? JSON.parse(log.log) : log.log,
            question_type: log.question_type || 'Unknown',
            job_description: log.job_description || '',
            interview_name: log.interview_name || '',
            interview_type: log.interview_type || 'Unknown',
            question_count: log.log ? countQuestionsInConversation(typeof log.log === 'string' ? JSON.parse(log.log) : log.log) : 0,
          };
        });

        setLogs(transformedLogs);
        setFilteredLogs(transformedLogs);
      } else {
        // Fallback to localStorage if API doesn't return expected data
        const savedLogs = localStorage.getItem('interview_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);

          const enhancedLogs = parsedLogs.map((log: any) => ({
            ...log,

            question_count: log.conversation ? countQuestionsInConversation(log.conversation) : 0,
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            question_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            interview_type: Math.random() > 0.8 ? 'Voice' : 'Text',
            updated_at: log.updated_at || log.date || new Date().toISOString(),

          }));

          setLogs(enhancedLogs);
          setFilteredLogs(enhancedLogs);
        }
      }
    } catch (error) {
      console.error('Error fetching interview logs:', error);
      message.error('Failed to load interview history');

      // Fallback to localStorage if API call fails
      try {
        const savedLogs = localStorage.getItem('interview_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);

          const enhancedLogs = parsedLogs.map((log: any) => ({
            ...log,

            question_count: Math.floor(Math.random() * 20) + 5,
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            question_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            interview_type: Math.random() > 0.8 ? 'Voice' : 'Text',
            updated_at: log.updated_at || log.date || new Date().toISOString(),
          }));

          setLogs(enhancedLogs);
          setFilteredLogs(enhancedLogs);
        }
      } catch (fallbackError) {
        console.error('Error with localStorage fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...logs];
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(log => 
        (log.title && log.title.toLowerCase().includes(searchLower)) ||
        (log.company_name && log.company_name.toLowerCase().includes(searchLower)) ||
        (log.interview_name && log.interview_name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').valueOf();
      const endDate = dateRange[1].endOf('day').valueOf();
      
      filtered = filtered.filter(log => {
        try {
          const logDateObj = new Date(log.updated_at || log.date);
          const now = new Date();
          
          const isInvalidFutureDate = logDateObj > now && (logDateObj.getTime() - now.getTime()) > 24 * 60 * 60 * 1000;
          
          const finalDate = isInvalidFutureDate ? now.getTime() : logDateObj.getTime();
          
          if (isNaN(finalDate)) {
            return false; 
          }
          
          return finalDate >= startDate && finalDate <= endDate;
        } catch (error) {
          console.error("Error filtering by date:", error);
          return false;
        }
      });
    }
    
    // Apply type filter
    if (typeFilter) {
      if (typeFilter === 'text' || typeFilter === 'voice') {
        filtered = filtered.filter(log => 
          log.interview_type && log.interview_type.toLowerCase() === typeFilter
        );
      } else if (typeFilter === 'technical' || typeFilter === 'behavioral') {
        filtered = filtered.filter(log => 
          log.question_type && log.question_type.toLowerCase() === typeFilter
        );
      }
    }
    
    setFilteredLogs(filtered);
  };
  
  const handleViewInterviewLog = (log: InterviewLog) => {
    if (log.interview_type?.toLowerCase() === 'voice') {
      navigate(`/voice/interview/view/${log.id}`);
      } else {
       // text or any other type => old route
      navigate(`/interview/view/${log.id}`, {
      state: {
        conversation: log.log,
        thread_id: log.thread_id,
        question_type: log.question_type
        }
        });
      }
  };
  
  const handleDeleteInterview = (log: InterviewLog) => {
    modal.confirm({
      title: 'Are you sure you want to delete this interview?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone. The interview session and any favorite questions from this session will be permanently deleted.',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          // Show loading message
          message.loading('Deleting interview...', 1);
          
          // For voice interviews, explicitly delete favorites by the numeric ID
          // This is needed because favorites might be saved with the numeric ID instead of thread_id
          if (log.interview_type?.toLowerCase() === 'voice') {
            try {
              // Delete favorites associated with the log.id (numeric ID)
              await fetch(`${API_BASE_URL}/api/favorite_questions/session/${log.id}`, {
                method: 'DELETE',
              });
              
            } catch (error) {
              console.error('Error deleting voice favorites by ID:', error);
            }
          }

          // Now delete the interview log (this also deletes favorites by thread_id in the backend)
          const response = await fetch(`${API_BASE_URL}/api/chat_history/${log.id}`, {
            method: 'DELETE',
          });
  
          if (!response.ok) {
            throw new Error('Failed to delete interview log');
          }
  
          const result = await response.json();
          message.success(result.message || 'Interview deleted successfully');
          setLogs(prevLogs => prevLogs.filter(item => item.id !== log.id));
        } catch (error) {
          console.error('Error deleting interview:', error);
          message.error('Failed to delete interview');
        }
      },
    });
  };
  
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  const handleExportInterview = async (log: InterviewLog) => {
    try {      
      if (!log.log || (Array.isArray(log.log) && log.log.length === 0)) {
        message.warning('No conversation data found for export');
        return;
      }
      
      const conversationData = Array.isArray(log.log) ? log.log : 
                              typeof log.log === 'string' ? JSON.parse(log.log) : [];
      
      message.loading('Preparing export...', 0.5);

      let strengths = ["Demonstrated communication skills", "Showed technical knowledge"];
      let improvementAreas = ["Consider providing more specific examples", "Work on structuring responses"];
      let specificFeedback = "Performance data available for this interview.";
      let performanceScores = null;
      
      try {        
        const scoresResponse = await fetch(`${API_BASE_URL}/api/interview_scores/${log.id}`);
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          
          if (scoresData.scores) {
            performanceScores = {
              confidence: scoresData.scores.confidence || 0,
              communication: scoresData.scores.communication || 0,
              technical: scoresData.scores.technical || 0,
              problem_solving: scoresData.scores.problem_solving || 0,
              resume_strength: scoresData.scores["resume strength"] || 0,
              leadership: scoresData.scores.leadership || 0
            };
          }
        }
        
        const strengthsResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_strengths/${log.id}`);
        if (strengthsResponse.ok) {
          const strengthsData = await strengthsResponse.json();
          if (strengthsData.strengths && Array.isArray(JSON.parse(strengthsData.strengths))) {
            strengths = JSON.parse(strengthsData.strengths);
          }
        }
        
        const improvementResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_improvement_areas/${log.id}`);
        if (improvementResponse.ok) {
          const improvementData = await improvementResponse.json();
          if (improvementData.improvement_areas && Array.isArray(JSON.parse(improvementData.improvement_areas))) {
            improvementAreas = JSON.parse(improvementData.improvement_areas);
          }
        }
        
        const feedbackResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_specific_feedback/${log.id}`);
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          if (feedbackData.specific_feedback) {
            specificFeedback = feedbackData.specific_feedback;
          }
        }
      } catch (err) {
        console.error('Failed to fetch complete details for export:', err);
      }

      const exportData = {
        interview: {
          title: log.title || 'Unnamed Interview',
          company: log.company_name || 'N/A',
          date: log.updated_at || log.date || new Date().toISOString(),
          type: log.interview_type || 'N/A',
          questionType: log.question_type || 'N/A',
          interviewName: log.interview_name || 'N/A',
          language: log.language || 'English',
          job_description: log.job_description || ''
        },
        conversation: conversationData,
        performance: performanceScores ? {
          scores: performanceScores
        } : null,
        feedback: {
          key_strengths: strengths,
          improvement_areas: improvementAreas,
          overall_feedback: specificFeedback
        }
      };

      try {
        exportToPDF(exportData);
        message.success('Export prepared. Use browser print dialog to save as PDF.');
      } catch (error) {
        console.error('Error exporting as PDF:', error);
        message.error('Failed to prepare export. Please check if pop-ups are blocked.');
      }
    } catch (err) {
      console.error('Error preparing export:', err);
      message.error(`Failed to prepare interview export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const handleViewDetails = async (log: InterviewLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
    
    // Fetch performance data when opening the details modal
    setLoadingPerformance(true);
    try {
      // Fetch scores
      const scoresResponse = await fetch(`${API_BASE_URL}/api/interview_scores/${log.id}`);
      
      if (!scoresResponse.ok) {
        throw new Error(`Failed to fetch performance data: ${scoresResponse.status}`);
      }
      
      const scoresData = await scoresResponse.json();
      
      // Fetch strengths
      const strengthsResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_strengths/${log.id}`);
      let strengths = ["Demonstrated communication skills", "Showed technical knowledge"];
      
      if (strengthsResponse.ok) {
        const strengthsData = await strengthsResponse.json();
        if (strengthsData.strengths && Array.isArray(JSON.parse(strengthsData.strengths))) {
          strengths = JSON.parse(strengthsData.strengths);
        }
      }
      
      // Fetch improvement areas
      const improvementResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_improvement_areas/${log.id}`);
      let improvementAreas = ["Consider providing more specific examples", "Work on structuring responses"];
      
      if (improvementResponse.ok) {
        const improvementData = await improvementResponse.json();
        if (improvementData.improvement_areas && Array.isArray(JSON.parse(improvementData.improvement_areas))) {
          improvementAreas = JSON.parse(improvementData.improvement_areas);
        }
      }
      
      // Fetch specific feedback
      const feedbackResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_specific_feedback/${log.id}`);
      let specificFeedback = "Performance data available for this interview.";
      
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        if (feedbackData.specific_feedback) {
          specificFeedback = feedbackData.specific_feedback;
        }
      }
      
      // Transform the data to match the expected format
      if (scoresData.scores) {
        setPerformanceData({
          scores: {
            confidence: scoresData.scores.confidence || 0,
            communication: scoresData.scores.communication || 0,
            technical: scoresData.scores.technical || 0,
            problem_solving: scoresData.scores.problem_solving || 0,
            resume_strength: scoresData.scores["resume strength"] || 0, // Note the different key format
            leadership: scoresData.scores.leadership || 0
          },
          feedback: {
            key_strengths: strengths,
            improvement_areas: improvementAreas,
            overall_feedback: specificFeedback
          }
        });
      } else {
        throw new Error("Invalid performance data format");
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      message.error('Failed to load performance data');
      // Set default performance data
      setPerformanceData({
        scores: {
          confidence: 0.75,
          communication: 0.75,
          technical: 0.75,
          problem_solving: 0.75,
          resume_strength: 0.75,
          leadership: 0.75
        },
        feedback: {
          key_strengths: [
            "Demonstrated communication skills",
            "Showed technical knowledge"
          ],
          improvement_areas: [
            "Consider providing more specific examples",
            "Work on structuring responses"
          ],
          overall_feedback: "Performance data not available for this interview."
        }
      });
    } finally {
      setLoadingPerformance(false);
    }
  };
  
  const parseQuestion = (text: string): string => {
    // Split the text into sentences
    const sentences = text.split(/[.!?]+/);
    
    // Find all sentences that are followed by a question mark
    const questions = sentences.filter((sentence) => {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) return false;
      
      // Get the text after this sentence
      const textAfterSentence = text.substring(text.indexOf(trimmedSentence) + trimmedSentence.length);
      return textAfterSentence.startsWith('?');
    });
    
    // If no questions found, return the last sentence with a question mark
    if (questions.length === 0) {
      return sentences[sentences.length - 1].trim() + '?';
    }
    
    // Return all questions joined with line breaks
    return questions.map(q => q.trim() + '?').join('\n');
  };

  const handleViewFavorites = async (log: InterviewLog) => {
    setSelectedLog(log);
    setFavoritesModalVisible(true);
    setLoadingFavorites(true);

    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        message.error('Please log in to view favorites');
        return;
      }

      let favoritesList = [];
      
      // For voice interviews, the session_id might be stored as the log.id
      if (log.interview_type?.toLowerCase() === 'voice') {
        // Try fetching using the log.id as session_id
        const voiceResponse = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}?session_id=${log.id}`);
        
        if (voiceResponse.ok) {
          const voiceData = await voiceResponse.json();
          favoritesList = Array.isArray(voiceData.data) ? voiceData.data : [];
        }
      }
      
      // If we didn't get any favorites from the voice method, or this is a text interview
      // try the standard thread_id method
      if (favoritesList.length === 0) {
        // Use the full thread_id
        const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}?session_id=${log.thread_id}`);
        
        if (response.ok) {
          const data = await response.json();
          favoritesList = Array.isArray(data.data) ? data.data : [];
        }
      }
      
      setFavoriteQuestions(favoritesList);
    } catch (error) {
      console.error('Error fetching favorite questions:', error);
      message.error('Failed to load favorite questions');
    } finally {
      setLoadingFavorites(false);
    }
  };
  

  const handleViewWeakest = async (log: InterviewLog) => {
    setSelectedLog(log);
    setWeakestModalVisible(true);
    setLoadingWeakest(true);

    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        message.error('Please log in to view weakest questions');
        return;
      }
      let weakestList = [];
      
      // For voice interviews, the session_id might be stored as the log.id
      if (log.interview_type?.toLowerCase() === 'voice') {
        // Try fetching using the log.id as session_id
        const voiceResponse = await fetch(`${API_BASE_URL}/api/weak_questions/${email}?session_id=${log.id}`);
        
        if (voiceResponse.ok) {
          const voiceData = await voiceResponse.json();
          weakestList = Array.isArray(voiceData.data) ? voiceData.data : [];
        }
      }
      
      // If we didn't get any favorites from the voice method, or this is a text interview
      // try the standard thread_id method
      if (weakestList.length === 0) {
        // Use the full thread_id
        const response = await fetch(`${API_BASE_URL}/api/weak_questions/${email}?session_id=${log.thread_id}`);
        
        if (response.ok) {
          const data = await response.json();
          weakestList = Array.isArray(data.data) ? data.data : [];
        }
      }
      
      setWeakestQuestions(weakestList);
    } catch (error) {
      console.error('Error fetching weakest questions:', error);
      message.error('Failed to load weakest questions');
    } finally {
      setLoadingWeakest(false);
    }
  };
  
  const columns = [
    {
      title: 'Interview',
      key: 'interview',
      width: '20%',
      render: (text: string, record: InterviewLog) => (
        <div>
          <div className={styles.interviewTitle}>{record.title}</div>
          {record.interview_name && record.interview_name !== record.title && (
            <div className={styles.interviewName}>{record.interview_name}</div>
          )}
        </div>
      )
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      width: '15%',
      render: (company: string) => (
        <div className={styles.companyName}>
          {company || 'N/A'}
        </div>
      )
    },
    {
      title: (
        <div className={styles.columnTitleWithTip}>
          Date
        </div>
      ),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: '15%',
      sorter: (a: InterviewLog, b: InterviewLog) => {
        try {
          const dateA = new Date(a.updated_at || a.date).getTime();
          const dateB = new Date(b.updated_at || b.date).getTime();
          const now = Date.now();
          const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
          const validDateA = isNaN(dateA) || (dateA > now && dateA - now > oneWeekMs) ? now : dateA;
          const validDateB = isNaN(dateB) || (dateB > now && dateB - now > oneWeekMs) ? now : dateB;
          return validDateB - validDateA;
        } catch (error) {
          console.error("Error sorting dates:", error);
          return 0;
        }
      },
      sortDirections: ['ascend', 'descend', null] as SortOrder[],
      defaultSortOrder: 'descend' as const,
      render: (date: string) => {
        try {          
          const formattedTime = formatToEasternTime(date);
          
          return (
            <div className={styles.dateInfo}>
              <div>{formattedTime.date}</div>
            </div>
          );
        } catch (error) {
          console.error("Error formatting date:", date, error);
          return <div className={styles.dateInfo}>Invalid date</div>;
        }
      }
    },
    {
      title: 'Type',
      key: 'type',
      width: '17%',
      render: (text: string, record: InterviewLog) => (
        <div className={styles.tagContainer}>
          <Space size={8}>
            <Tag color={record.interview_type?.toLowerCase() === 'voice' ? 'blue' : 'green'}>
              {record.interview_type?.toLowerCase() === 'voice' ? 'Voice' : 'Text'}
            </Tag>
            {record.question_type && record.question_type !== 'Unknown' && (
              <Tag color={record.question_type.toLowerCase() === 'technical' ? 'purple' : 'orange'}>
                {record.question_type.charAt(0).toUpperCase() + record.question_type.slice(1).toLowerCase()}
              </Tag>
            )}
          </Space>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '35%',
      render: (_: unknown, record: InterviewLog) => (
        <div className={styles.actionButtonsGrid}>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.viewButton}`}
            onClick={() => handleViewInterviewLog(record)}
          >
            <EyeOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>View</span>
          </Button>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.detailsButton}`}
            onClick={() => handleViewDetails(record)}
          >
            <BarChartOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Details</span>
          </Button>
          <Button
            type="link"
            className={`${styles.actionButtonWithLabel} ${styles.exportButton}`}
            onClick={() => handleExportInterview(record)}
          >
            <ExportOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Export</span>
          </Button>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.favoritesButton}`}
            onClick={(e) => {
              e.stopPropagation(); 
              handleViewFavorites(record);
            }}
          >
            <HeartOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Favorites</span>
          </Button>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.weakestButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleViewWeakest(record);
            }}
          >
            <WarningOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Weakest</span>
          </Button>
          <Button 
            type="link" 
            danger 
            className={`${styles.actionButtonWithLabel} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteInterview(record);
            }}
          >
            <DeleteOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Delete</span>
          </Button>
        </div>
      )
    }
  ];
  
  if (loading) {
    return (
      <div className={styles.pageLoadingContainer}>
        <div className={styles.loadingContent}>
          <Spin size="large" className={styles.loadingSpinner} />
          <h2>Loading Interview History</h2>
          <p>We're retrieving your past interviews and preparing your dashboard</p>
          
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
          
          <div className={styles.loadingText}>Analyzing your interview data...</div>
          
          <span className={styles.secondaryText}>
            This may take a few moments
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.interviewContainer}>
      {contextHolder}
      <div className={styles.interviewHeader}>
        <button 
          className={styles.backButton}
          onClick={handleBack}
        >
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Interview History</h1>
        <div className={styles.headerActions}>
          <Button 
            className={styles.actionButton}
            onClick={() => navigate('/favorites')}
            icon={<HeartOutlined />}
          >
            View All Favorite Questions
          </Button>
          
          <Button
            className={styles.actionButton}
            onClick={() => navigate('/weakest')}
            icon={<WarningOutlined />}
          >
            View All Weakest Questions
          </Button>
        </div>
      </div>

      <div className={styles.historyContent}>
        <div className={styles.filterSection}>
          <div className={styles.filterLeft}>
            <Input
              placeholder="Search interviews"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className={styles.searchInput}
              allowClear
            />
          </div>
          
          <div className={styles.filterRight}>
            <RangePicker 
              onChange={value => setDateRange(value)}
              className={styles.datePicker}
              placeholder={['Start Date', 'End Date']}
            />
            
            <Select
              placeholder="Filter by Type"
              allowClear
              onChange={value => setTypeFilter(value)}
              className={styles.typeFilter}
            >
              <Option value="technical">Technical</Option>
              <Option value="behavioral">Behavioral</Option>
              <Option value="voice">Voice</Option>
              <Option value="text">Text</Option>
            </Select>
          </div>
        </div>
        
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: false, 
            showTotal: (total) => `Total ${total} interviews`,
            position: ['bottomCenter']
          }}
          className={styles.historyTable}
          locale={{ 
            emptyText: <Empty 
              description="No interview history found" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          }}
        />
      </div>
      
      <Modal
        title={<div className={styles.modalTitle}>Interview Details</div>}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setPerformanceData(null); // Clear performance data when closing modal
        }}
        footer={[
          <Button key="back" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="continue" 
            type="primary" 
            onClick={() => {
              setDetailModalVisible(false);
              if (selectedLog) handleViewInterviewLog(selectedLog);
            }}
          >
            View Interview
          </Button>
        ]}
        width={1200}
        className={styles.detailModal}
        centered
      >
        {selectedLog && (
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <Title level={4}>{selectedLog.title}</Title>
              <Text type="secondary">
                {(() => {
                  try {                    
                    const dateStr = selectedLog.updated_at || selectedLog.date;
                    const formattedTime = formatToEasternTime(dateStr);

                    const dateObj = new Date(dateStr);
                    if (!isNaN(dateObj.getTime())) {
                      const fullFormatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/New_York',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
                      
                      return fullFormatter.format(dateObj);
                    }
                    
                    return formattedTime.date;
                  } catch (error) {
                    console.error("Error formatting detail date:", error);
                    return 'Invalid date';
                  }
                })()}
              </Text>
            </div>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <Text strong>Company:</Text>
                <Text>{selectedLog.company_name || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Question Type:</Text>
                <Text>
                  {selectedLog.question_type ? 
                    (selectedLog.question_type.charAt(0).toUpperCase() + 
                    selectedLog.question_type.slice(1).toLowerCase()) : 'N/A'}
                </Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Format:</Text>
                <Text>
                  {selectedLog.interview_type?.toLowerCase() === 'voice' ? 'Voice' : 'Text'}
                </Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Interview Name:</Text>
                <Text>{selectedLog.interview_name || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Job Description Available:</Text>
                <Text>{selectedLog.job_description ? 'Yes' : 'No'}</Text>
              </div>
              
              <div className={styles.detailItem}>
               <Text strong>Language:</Text>
               <Text>
                 {selectedLog.language 
                   ? selectedLog.language.charAt(0).toUpperCase() + selectedLog.language.slice(1).toLowerCase() 
                   : 'English'}
               </Text>
             </div>
            </div>
            
            {/* Job Description Section */}
            {selectedLog.job_description && (
              <div className={styles.detailSection}>
                <Title level={5}>Job Description</Title>
                <Text>{selectedLog.job_description}</Text>
              </div>
            )}
            
            <div className={styles.detailSection}>
              <Title level={5}>Performance Summary</Title>
              {loadingPerformance ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <div className={styles.loadingText}>Loading performance data...</div>
                  <div className={styles.loadingIndicator}>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                  </div>
                </div>
              ) : performanceData ? (
                <>
                  <div className={styles.performanceStats}>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.technical * 100)}%</div>
                      <div className={styles.statLabel}>Technical</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.communication * 100)}%</div>
                      <div className={styles.statLabel}>Communication</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.problem_solving * 100)}%</div>
                      <div className={styles.statLabel}>Problem Solving</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.confidence * 100)}%</div>
                      <div className={styles.statLabel}>Confidence</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.resume_strength * 100)}%</div>
                      <div className={styles.statLabel}>Resume Strength</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.leadership * 100)}%</div>
                      <div className={styles.statLabel}>Leadership</div>
                    </div>
                  </div>
                </>
              ) : (
                <Text>No performance data available for this interview.</Text>
              )}
            </div>
            
            {performanceData && performanceData.feedback && (
              <>
                <div className={styles.detailSection}>
                  <Title level={5}>Key Strengths</Title>
                  <ul className={styles.insightsList}>
                    {performanceData.feedback.key_strengths.map((strength: string, index: number) => (
                      <li key={`strength-${index}`}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div className={styles.detailSection}>
                  <Title level={5}>Areas for Improvement</Title>
                  <ul className={styles.insightsList}>
                    {performanceData.feedback.improvement_areas.map((area: string, index: number) => (
                      <li key={`improvement-${index}`}>{area}</li>
                    ))}
                  </ul>
                </div>
                
                <div className={styles.detailSection}>
                  <Title level={5}>Overall Feedback</Title>
                  <Text>{performanceData.feedback.overall_feedback}</Text>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      
      <Modal
        title={<div className={styles.modalTitle}>Favorite Questions</div>}
        open={favoritesModalVisible}
        onCancel={() => {
          setFavoritesModalVisible(false);
          setFavoriteQuestions([]);
        }}
        footer={[
          <Button key="back" onClick={() => setFavoritesModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
        className={styles.favoritesModal}
        centered
      >
        {selectedLog && (
          <div className={styles.favoritesContent}>
            <div className={styles.favoritesList}>
              {loadingFavorites ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <div className={styles.loadingText}>Loading favorite questions...</div>
                  <div className={styles.loadingIndicator}>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                  </div>
                </div>
              ) : favoriteQuestions.length > 0 ? (
                <ul className={styles.questionsList}>
                  {favoriteQuestions.map((question, index) => (
                    <li key={index} className={styles.questionItem}>
                      <Title level={5}>Question {index + 1}</Title>
                      <Text>{parseQuestion(question.question_text)}</Text>
                      {question.answer && (
                        <div className={styles.answerSection}>
                          <Text type="secondary" strong>Answer:</Text>
                          <Text>{question.answer}</Text>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty 
                  description="No favorite questions found for this interview" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
      
      <Modal
        title={<div className={styles.modalTitle}>Weakest Questions</div>}
        open={weakestModalVisible}
        onCancel={() => {
          setWeakestModalVisible(false);
          setWeakestQuestions([]);
        }}
        footer={[
          <Button key="back" onClick={() => setWeakestModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
        className={styles.favoritesModal}
        centered
      >
        {selectedLog && (
          <div className={styles.favoritesContent}>
            <div className={styles.favoritesList}>
              {loadingWeakest ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <div className={styles.loadingText}>Loading weakest questions...</div>
                  <div className={styles.loadingIndicator}>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                    <div className={styles.loadingDot}></div>
                  </div>
                </div>
              ) : weakestQuestions.length > 0 ? (
                <ul className={styles.questionsList}>
                  {weakestQuestions.map((question, index) => (
                    <li key={index} className={styles.questionItem}>
                      <Title level={5}>Question {index + 1}</Title>
                      <Text>{parseQuestion(question.question_text)}</Text>
                      {question.answer && (
                        <div className={styles.answerSection}>
                          <Text type="secondary" strong>Answer:</Text>
                          <Text>{question.answer}</Text>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty 
                  description="No weakest questions found for this interview" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewHistoryPage; 