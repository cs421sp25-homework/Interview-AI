import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Modal, Empty, Space, Tag, Select, Spin } from 'antd';
import { SearchOutlined, DeleteOutlined, LeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './FavoriteQuestionsPage.module.css';

const { Option } = Select;

interface FavoriteQuestion {
  id: number;
  question_text: string;
  created_at: string;
  session_id: string;
  email: string;
  question_type: string;
  log: string;
}

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [modal, contextHolder] = Modal.useModal();
  const [loadingSession, setLoadingSession] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading session...");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        console.log("User not logged in, redirecting to login page");
        navigate('/login');
        return;
      }
      
      fetchFavorites();
    } catch (error) {
      console.error('Error in FavoritesPage:', error);
      navigate('/login');
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [favorites, searchText, typeFilter]);

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

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('user_email') || '';
      
      if (!userEmail) {
        message.error('User not logged in');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${userEmail}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched favorites:', data);
      
      if (data && Array.isArray(data.data)) {
        const transformedFavorites = data.data.map((favorite: FavoriteQuestion) => ({
          id: favorite.id,
          question_text: favorite.question_text,
          created_at: favorite.created_at,
          session_id: favorite.session_id,
          email: favorite.email,
          question_type: favorite.question_type || 'Unknown',
          log: favorite.log
        }));
        
        setFavorites(transformedFavorites);
        setFilteredFavorites(transformedFavorites);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      message.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...favorites];

    // Apply search filter
    if (searchText) {
      filtered = filtered.filter(favorite => 
        favorite.question_text.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply question type filter
    if (typeFilter) {
      filtered = filtered.filter(favorite => favorite.question_type === typeFilter);
    }

    setFilteredFavorites(filtered);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete favorite');
      }

      message.success('Favorite question deleted successfully');
      fetchFavorites();
    } catch (error) {
      console.error('Error deleting favorite:', error);
      message.error('Failed to delete favorite question');
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

  const handleViewSession = async (record: FavoriteQuestion) => {
    try {
      // 设置当前问题ID为加载状态
      setLoadingSession(record.id);
      
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) {
        throw new Error('User not logged in');
      }

      const response = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interview log');
      }
      const data = await response.json();
      
      if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid interview log data');
      }

      // Find the log with matching session_id
      const matchingLog = data.data.find((log: any) => log.thread_id === record.session_id);
      if (!matchingLog || !matchingLog.log) {
        throw new Error('Interview log not found');
      }

      const conversation = typeof matchingLog.log === 'string' ? JSON.parse(matchingLog.log) : matchingLog.log;
      
      // 开始页面过渡动画
      setTransitioning(true);
      
      // 使用较短的延迟，保持用户体验流畅
      setTimeout(() => {
        // 导航到目标页面
        navigate(`/interview/view/${record.session_id}`, { 
          state: { conversation, thread_id: matchingLog.thread_id } 
        });
      }, 600);
    } catch (error) {
      console.error('Error loading interview session:', error);
      message.error('Failed to load interview session');
      // 重置加载状态
      setLoadingSession(null);
      setTransitioning(false);
    }
  };

  const columns = [
    {
      title: 'Question',
      dataIndex: 'question_text',
      key: 'question_text',
      width: '40%',
      sorter: (a: FavoriteQuestion, b: FavoriteQuestion) => 
        a.question_text.localeCompare(b.question_text),
      render: (text: string) => (
        <div className={styles.questionText}>{parseQuestion(text)}</div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'question_type',
      key: 'question_type',
      width: '15%',
      render: (type: string) => {
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        return (
          <Tag color={capitalizedType === 'Technical' ? 'blue' : 'green'}>
            {capitalizedType}
          </Tag>
        );
      },
    },
    {
      title: 'Date Added',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '15%',
      sorter: (a: FavoriteQuestion, b: FavoriteQuestion) => 
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
      render: (_: unknown, record: FavoriteQuestion) => (
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
                title: 'Delete Favorite',
                content: 'Are you sure you want to delete this favorite question?',
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
      {/* 简化的过渡覆盖层 */}
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
        <h1>Favorite Questions</h1>
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
              <Option value="Technical">Technical</Option>
              <Option value="Behavioral">Behavioral</Option>
            </Select>
          </div>
        </div>
        
        <div className={styles.historyContainer}>
          <Table
            columns={columns}
            dataSource={filteredFavorites}
            rowKey="id"
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: false, 
              showTotal: (total) => `Total ${total} favorites`,
              position: ['bottomCenter']
            }}
            className={styles.historyTable}
            locale={{
              emptyText: (
                <Empty
                  description="No favorite questions yet"
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

export default FavoritesPage; 