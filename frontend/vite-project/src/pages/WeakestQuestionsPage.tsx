import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Modal, Empty, Space, Tag, Select, Spin } from 'antd';
import { SearchOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon } from 'lucide-react';
import API_BASE_URL from '../config/api';
import styles from './WeakestQuestionsPage.module.css';

const { Option } = Select;

interface WeakQuestion {
  id: number;
  question_text: string;
  created_at: string;
  session_id: string;
  email: string;
  question_type: string;
  log: string;
  interview_type?: 'voice' | 'text';
}

const WeakestQuestionsPage: React.FC = () => {
  const [weakQuestions, setWeakQuestions] = useState<WeakQuestion[]>([]);
  const [filteredWeakQuestions, setFilteredWeakQuestions] = useState<WeakQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [modal, contextHolder] = Modal.useModal();
  const [loadingSession, setLoadingSession] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        navigate('/login');
        return;
      }
      
      fetchWeakQuestions();
    } catch (error) {
      console.error('Error in WeakestQuestionsPage:', error);
      navigate('/login');
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [weakQuestions, searchText, typeFilter]);

  const parseQuestion = (text: string): string => {
    const sentences = text.split(/[.!?]+/);
    
    const questions = sentences.filter((sentence) => {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) return false;
      
      const textAfterSentence = text.substring(text.indexOf(trimmedSentence) + trimmedSentence.length);
      return textAfterSentence.startsWith('?');
    });
    
    if (questions.length === 0) {
      return sentences[sentences.length - 1].trim() + '?';
    }
    
    return questions.map(q => q.trim() + '?').join('\n');
  };

  const fetchWeakQuestions = async () => {
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('user_email') || '';
      
      if (!userEmail) {
        message.error('User not logged in');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/weak_questions/${userEmail}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch weak questions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data.data)) {
        // Get a list of session IDs to check
        const sessionIds = data.data.map((weak: WeakQuestion) => weak.session_id);
        const uniqueSessionIds = [...new Set(sessionIds)] as string[];
        
        const sessionTypesMap: Record<string, 'voice' | 'text'> = {};
        const questionTypesMap: Record<string, string> = {};
        
        // First check regular interview logs
        try {
          const logsResponse = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
          if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            
            if (logsData && Array.isArray(logsData.data)) {              
              logsData.data.forEach((log: any) => {
                const threadId = log.thread_id as string;
                
                // Check for technical configurations
                const isTechnical = log.config_name?.toLowerCase().includes('technical') || 
                                  log.interview_name?.toLowerCase().includes('technical') ||
                                  log.question_type?.toLowerCase() === 'technical';
                
                if (threadId && uniqueSessionIds.includes(threadId)) {
                  sessionTypesMap[threadId] = log.interview_type?.toLowerCase() === 'voice' ? 'voice' : 'text';
                  
                  if (isTechnical) {
                    questionTypesMap[threadId] = 'technical';
                  } else if (log.question_type) {
                    questionTypesMap[threadId] = log.question_type.toLowerCase();
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('Error checking session types in logs:', error);
        }
        
        // For remaining sessions, try to determine if they're voice sessions
        const uncheckedSessionIds = uniqueSessionIds.filter(id => !sessionTypesMap[id]);
        
        // For remaining sessions, assume they're voice if they're numeric and can be fetched from chat_history
        for (const sessionId of uncheckedSessionIds) {
          // If the sessionId is numeric, it might be a voice session ID
          if (!isNaN(Number(sessionId))) {
            try {
              const voiceResponse = await fetch(`${API_BASE_URL}/api/chat_history/${sessionId}`);
              if (voiceResponse.ok) {
                sessionTypesMap[sessionId] = 'voice';
              } else {
                // Default to text if not found
                sessionTypesMap[sessionId] = 'text';
              }
            } catch (error) {
              console.error(`Error checking if ${sessionId} is a voice session:`, error);
              sessionTypesMap[sessionId] = 'text';
            }
          } else {
            // Non-numeric IDs are likely text sessions
            sessionTypesMap[sessionId] = 'text';
          }
        }
        
        const transformedWeakQuestions = data.data.map((weak: WeakQuestion) => {
          const sessionId = weak.session_id;
          const sessionQuestionType = questionTypesMap[sessionId];
          let finalQuestionType = sessionQuestionType;
          
          // If we don't have a session type, check if the question appears technical
          if (!finalQuestionType && weak.question_text) {
            const technicalKeywords = ['code', 'algorithm', 'function', 'program', 'implementation', 
              'complexity', 'database', 'sql', 'api', 'class', 'object', 'method',
              'interface', 'syntax', 'variable', 'data structure'];
              
            const questionLower = weak.question_text.toLowerCase();
            const hasTechnicalKeyword = technicalKeywords.some(keyword => questionLower.includes(keyword));
            
            if (hasTechnicalKeyword) {
              finalQuestionType = 'technical';
            }
          }
          
          // If still no type, use the original saved type
          if (!finalQuestionType) {
            finalQuestionType = weak.question_type?.toLowerCase() || 'unknown';
          }
          
          return {
            id: weak.id,
            question_text: weak.question_text,
            created_at: weak.created_at,
            session_id: weak.session_id,
            email: weak.email,
            question_type: finalQuestionType,
            log: weak.log,
            interview_type: sessionTypesMap[weak.session_id] || 'text'
          };
        });
        
        setWeakQuestions(transformedWeakQuestions);
        setFilteredWeakQuestions(transformedWeakQuestions);
      }
    } catch (error) {
      console.error('Error fetching weak questions:', error);
      message.error('Failed to load weak questions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...weakQuestions];

    // Apply search filter
    if (searchText) {
      filtered = filtered.filter(weak => 
        weak.question_text.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply question type filter
    if (typeFilter) {
      if (typeFilter === 'technical' || typeFilter === 'behavioral') {
        filtered = filtered.filter(weak => 
          weak.question_type.toLowerCase() === typeFilter.toLowerCase()
        );
      } else if (typeFilter === 'voice' || typeFilter === 'text') {
        filtered = filtered.filter(weak => 
          weak.interview_type === typeFilter
        );
      }
    }

    setFilteredWeakQuestions(filtered);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/weak_questions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete weak question');
      }

      message.success('Weak question deleted successfully');
      fetchWeakQuestions();
    } catch (error) {
      console.error('Error deleting weak question:', error);
      message.error('Failed to delete weak question');
    }
  };

  const handleBack = () => {
    navigate('/interview/history');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return 'Invalid date';
    }
  };

  const handleViewSession = async (record: WeakQuestion) => {
    setLoadingSession(record.id);
    setTransitioning(true);
  
    try {
      // Always call the unified endpoint by passing the thread_id
      const res = await fetch(
        `${API_BASE_URL}/api/chat_history/${record.session_id}`
      );
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      const conversation = data.messages;
  
      // Choose route based on type
      const route =
        record.interview_type === 'voice'
          ? `/voice/interview/view/${record.session_id}`
          : `/interview/view/${record.session_id}`;
  
      // Small delay for transition UI
      setTimeout(() => {
        navigate(route, {
          state: {
            conversation,
            thread_id: record.session_id,
            question_type: record.question_type,
          },
        });
        setLoadingSession(null);
        setTransitioning(false);
      }, 600);
  
    } catch (err) {
      console.error('Error loading interview session:', err);
      message.error('Failed to load interview session');
      setLoadingSession(null);
      setTransitioning(false);
    }
  };

  const handleViewFlashcards = () => {
    navigate('/flashcards/weakest', { 
      state: { 
        questions: weakQuestions.map(q => ({
          id: q.id,
          question: q.question_text,
          created_at: q.created_at
        }))
      }
    });
  };

  const columns = [
    {
      title: 'Question',
      dataIndex: 'question_text',
      key: 'question_text',
      width: '40%',
      sorter: (a: WeakQuestion, b: WeakQuestion) => 
        a.question_text.localeCompare(b.question_text),
      render: (text: string) => (
        <div className={styles.questionText}>{parseQuestion(text)}</div>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: '15%',
      render: (text: string, record: WeakQuestion) => {
        // Ensure question_type is properly capitalized, handle any case
        let questionType = 'Unknown';
        if (record.question_type) {
          const lowercaseType = record.question_type.toLowerCase();
          if (lowercaseType === 'technical') {
            questionType = 'Technical';
          } else if (lowercaseType === 'behavioral') {
            questionType = 'Behavioral';
          } else {
            // Just capitalize the first letter for any other type
            questionType = record.question_type.charAt(0).toUpperCase() + record.question_type.slice(1).toLowerCase();
          }
        }
        
        return (
          <div className={styles.tagContainer}>
            <Space size={8}>
              <Tag color={record.interview_type === 'voice' ? 'blue' : 'green'}>
                {record.interview_type === 'voice' ? 'Voice' : 'Text'}
              </Tag>
              <Tag color={questionType.toLowerCase() === 'technical' ? 'purple' : 'orange'}>
                {questionType}
              </Tag>
            </Space>
          </div>
        );
      },
    },
    {
      title: 'Date Added',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '15%',
      sorter: (a: WeakQuestion, b: WeakQuestion) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => (
        <div className={styles.dateInfo}>
          {formatDate(date)}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '30%',
      render: (_: unknown, record: WeakQuestion) => (
        <Space size="middle" className={styles.actionButtonsContainer}>
          <Button
            type="link"
            className={`${styles.actionButtonWithLabel} ${styles.viewButton}`}
            onClick={() => handleViewSession(record)}
            disabled={loadingSession !== null || transitioning}
          >
            {loadingSession === record.id ? (
              <>
                <div className={styles.actionIcon}>
                  <Spin size="small" />
                </div>
                <span className={styles.actionText}>Loading...</span>
              </>
            ) : (
              <>
                <div className={styles.actionIcon}>
                  <SearchOutlined />
                </div>
                <span className={styles.actionText}>View Session</span>
              </>
            )}
          </Button>
          <Button
            type="link"
            className={`${styles.actionButtonWithLabel} ${styles.deleteButton}`}
            onClick={() => {
              modal.confirm({
                title: 'Delete Weak Question',
                content: 'Are you sure you want to delete this weak question?',
                okText: 'Yes',
                okType: 'danger',
                cancelText: 'No',
                onOk: () => handleDelete(record.id),
              });
            }}
            disabled={loadingSession !== null || transitioning}
          >
            <div className={styles.actionIcon}>
              <DeleteOutlined />
            </div>
            <span className={styles.actionText}>Delete</span>
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={`${styles.interviewContainer} ${transitioning ? styles.pageTransition : ''}`}>
      {transitioning && (
        <div className={styles.transitionOverlay}>
          <div className={styles.transitionContent}>
            <Spin size="large" />
            <p className={styles.transitionMessage}>Loading session...</p>
          </div>
        </div>
      )}
      
      <div className={styles.interviewHeader}>
        <button 
          className={styles.backButton}
          onClick={handleBack}
        >
          <LeftOutlined size={18} />
          Back to Interview History
        </button>
        <h1>Weakest Questions</h1>
        <Button
          type="primary"
          icon={<BookOpenIcon />}
          onClick={handleViewFlashcards}
          className={styles.flashcardsButton}
        >
          Practice With Flashcards
        </Button>
      </div>

      {contextHolder}
      
      <div className={styles.historyContent}>
        <div className={styles.filterSection}>
          <div className={styles.filterLeft}>
            <Input
              placeholder="Search questions..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={styles.searchInput}
              allowClear
            />
          </div>
          
          <div className={styles.filterRight}>
            <Select
              placeholder="Question Type"
              allowClear
              style={{ width: 200 }}
              onChange={setTypeFilter}
              className={styles.typeSelect}
            >
              <Option value="technical">Technical</Option>
              <Option value="behavioral">Behavioral</Option>
            </Select>
          </div>
        </div>
        
        <div className={styles.historyContainer}>
          <Table
            columns={columns}
            dataSource={filteredWeakQuestions}
            rowKey="id"
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: false, 
              showTotal: (total) => `Total ${total} weak questions`,
              position: ['bottomCenter']
            }}
            className={styles.historyTable}
            locale={{
              emptyText: (
                <Empty
                  description="No weak questions yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WeakestQuestionsPage; 