import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, List, message } from 'antd';
import { HeartFilled, EyeOutlined } from '@ant-design/icons';
import API_BASE_URL from '../config/api';
import styles from './FavoritesPage.module.css';

interface FavoriteQuestion {
  id: number;
  question_text: string;
  session_id: string;
  created_at: string;
  interview_name?: string;
  company_name?: string;
}

const FavoritesPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [sessionId]);

  const fetchFavorites = async () => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) {
        message.error('Please log in to view favorites');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}`);
      if (!response.ok) throw new Error('Failed to fetch favorites');

      const data = await response.json();
      let favoritesData = data.data || [];

      // Filter by session if sessionId is provided
      if (sessionId) {
        favoritesData = favoritesData.filter((q: FavoriteQuestion) => 
          q.session_id === sessionId
        );
      }

      // Fetch interview details for each favorite
      const enhancedFavorites = await Promise.all(
        favoritesData.map(async (fav: FavoriteQuestion) => {
          try {
            const logResponse = await fetch(`${API_BASE_URL}/api/interview_logs/${email}`);
            const logData = await logResponse.json();
            const interview = logData.data.find((log: any) => 
              log.id === parseInt(fav.session_id)
            );
            return {
              ...fav,
              interview_name: interview?.config_name || 'Unknown Interview',
              company_name: interview?.company_name || 'Unknown Company'
            };
          } catch (error) {
            console.error('Error fetching interview details:', error);
            return fav;
          }
        })
      );

      setFavorites(enhancedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      message.error('Failed to load favorite questions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInterview = (sessionId: string) => {
    navigate(`/interview/view/${sessionId}`);
  };

  return (
    <div className={styles.favoritesContainer}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => navigate('/interview/history')}
        >
          Back to History
        </button>
        <h1>
          {sessionId ? 'Interview Session Favorites' : 'All Favorite Questions'}
        </h1>
      </div>

      <List
        loading={loading}
        itemLayout="vertical"
        dataSource={favorites}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Button
                type="link"
                onClick={() => handleViewInterview(item.session_id)}
                icon={<EyeOutlined />}
              >
                View Interview
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<HeartFilled style={{ color: '#ec4899' }} />}
              title={item.interview_name}
              description={`From ${item.company_name} interview`}
            />
            {item.question_text}
          </List.Item>
        )}
        locale={{ emptyText: 'No favorite questions found' }}
      />
    </div>
  );
};

export default FavoritesPage;