import React, { useState, useEffect } from 'react';
import { Table, Button, message, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './FavoriteQuestionsPage.module.css';

const { Title } = Typography;

interface FavoriteQuestion {
  id: number;
  question: string;
  interview_id: number;
  email: string;
  created_at: string;
}

const FavoriteQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavoriteQuestions();
  }, []);

  const fetchFavoriteQuestions = async () => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}`);
      if (!response.ok) {
        throw new Error('Failed to fetch favorite questions');
      }

      const data = await response.json();
      setQuestions(data.data);
    } catch (error) {
      console.error('Error fetching favorite questions:', error);
      message.error('Failed to load favorite questions');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite question');
      }

      message.success('Question removed from favorites');
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error removing favorite question:', error);
      message.error('Failed to remove question from favorites');
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const columns = [
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      width: '70%',
    },
    {
      title: 'Date Added',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '20%',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: unknown, record: FavoriteQuestion) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveFavorite(record.id)}
        />
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <Home size={18} />
          Back to Dashboard
        </button>
        <Title level={2}>Favorite Questions</Title>
      </div>

      <Table
        columns={columns}
        dataSource={questions}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} questions`,
          position: ['bottomCenter'],
        }}
        className={styles.table}
        locale={{ emptyText: 'No favorite questions found' }}
      />
    </div>
  );
};

export default FavoriteQuestionsPage; 