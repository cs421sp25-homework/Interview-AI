import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Modal, Empty, Space, Tag, Select } from 'antd';
import { SearchOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
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
  question_type?: string;
}

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [modal, contextHolder] = Modal.useModal();
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
    
    // Find the last sentence that ends with a question mark
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim();
      // Check if this sentence was followed by a question mark in the original text
      const textAfterSentence = text.substring(text.indexOf(sentence) + sentence.length);
      if (textAfterSentence.startsWith('?')) {
        return sentence + '?';
      }
    }
    
    // If no question mark sentence is found, return the last sentence with a question mark
    return sentences[sentences.length - 1].trim() + '?';
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
          question_type: favorite.question_type || 'Unknown'
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
      render: (type: string) => (
        <Tag color={type === 'Technical' ? 'blue' : 'green'}>
          {type}
        </Tag>
      ),
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
            onClick={() => navigate(`/interview/history?session=${record.session_id}`)}
          >
            <SearchOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>View Session</span>
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
          >
            <DeleteOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Delete</span>
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.interviewContainer}>
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