import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, User, ArrowLeft, BookOpen } from 'lucide-react';
import styles from './FlashcardsPage.module.css';
import API_BASE_URL from '../config/api';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface FavoriteQuestion {
  id: number;
  question_text: string;
  created_at: string;
  session_id: string;
  email: string;
  question_type: string;
  answer?: string;
  interview_type?: 'voice' | 'text';
}

const FlashcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [favoriteQuestions, setFavoriteQuestions] = useState<FavoriteQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 标准化问题类型，确保与FavoritesQuestionsPage使用相同的逻辑
  const normalizeQuestionType = (rawType: string): string => {
    if (!rawType) return 'Unknown';
    
    const lowerType = rawType.toLowerCase();
    if (lowerType === 'technical') {
      return 'Technical';
    } else if (lowerType === 'behavioral') {
      return 'Behavioral';
    } else {
      return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
    }
  };

  useEffect(() => {
    // Fetch favorite questions from the API
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const userEmail = localStorage.getItem('user_email') || '';
        
        if (!userEmail) {
          setError('User not logged in');
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/favorite_questions/${userEmail}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch favorites: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("原始收藏问题数据:", data.data);
        
        if (data && Array.isArray(data.data)) {
          // 使用标准化函数处理问题类型
          const processedData = data.data.map((fav: FavoriteQuestion) => {
            const normalizedType = normalizeQuestionType(fav.question_type || '');
            console.log(`问题类型: "${fav.question_type}" -> "${normalizedType}"`);
            
            return {
              ...fav,
              question_type: normalizedType,
              // 如果没有答案字段，添加默认答案
              answer: fav.answer || '这个问题没有提供示例答案。尝试自己思考一个答案!'
            };
          });
          
          console.log("处理后的收藏问题:", processedData);
          setFavoriteQuestions(processedData);
        } else {
          setFavoriteQuestions([]);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setError('无法加载收藏的问题');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [navigate]);
  
  // 用于显示的类别是固定的: All, Technical, Behavioral
  const displayCategories = ['All', 'Technical', 'Behavioral'];
  
  // 获取实际数据中存在的分类，确保UI更新
  useEffect(() => {
    console.log("更新可用的分类，当前收藏问题:", favoriteQuestions.length);
    const availableTypes = new Set(favoriteQuestions.map(q => q.question_type));
    console.log("数据中的问题类型:", Array.from(availableTypes));
  }, [favoriteQuestions]);
  
  // 根据选择的分类过滤问题卡片
  const filteredCards = selectedCategory === 'All' 
    ? favoriteQuestions 
    : favoriteQuestions.filter(card => card.question_type === selectedCategory);
  
  console.log(`当前分类 "${selectedCategory}" 的问题数量:`, filteredCards.length);

  const handleNextCard = () => {
    if (filteredCards.length === 0) return;
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % filteredCards.length);
    setShowAnswer(false);
  };

  const handlePreviousCard = () => {
    if (filteredCards.length === 0) return;
    setCurrentCardIndex((prevIndex) => {
      const newIndex = prevIndex - 1;
      return newIndex < 0 ? filteredCards.length - 1 : newIndex;
    });
    setShowAnswer(false);
  };

  const handleFlipCard = () => {
    setShowAnswer(!showAnswer);
  };

  const handleCategoryChange = (category: string) => {
    console.log(`切换分类 从 "${selectedCategory}" 到 "${category}"`);
    setSelectedCategory(category);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleBackToDashboard = () => {
    // Check if we came from favorites page
    if (location.state && location.state.fromFavorites) {
      navigate('/favorites');
    } else {
      navigate('/dashboard');
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

  return (
    <div>
      {/* Header Navigation */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <Bot size={32} color="#ec4899" />
              <span>InterviewAI</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button 
              className={styles.backButton}
              onClick={handleBackToDashboard}
            >
              <ArrowLeft size={20} color="#4b5563" />
              <span>Back to {location.state && location.state.fromFavorites ? 'Favorites' : 'Dashboard'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.title}>
          <BookOpen size={32} color="#ec4899" style={{ marginRight: '12px' }} />
          Favorite Questions Flashcards
        </div>
        
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading your favorite questions...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className={styles.categoryContainer}>
              {displayCategories.map(category => (
                <button 
                  key={category}
                  className={`${styles.categoryButton} ${selectedCategory === category ? styles.activeCategory : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {filteredCards.length > 0 ? (
              <>
                <div className={styles.cardContainer} onClick={handleFlipCard}>
                  <div className={`${styles.card} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={styles.cardFront}>
                      <p className={styles.questionNumber}>Card {currentCardIndex + 1} of {filteredCards.length}</p>
                      <p className={styles.categoryTag}>{filteredCards[currentCardIndex].question_type}</p>
                      <h2 className={styles.question}>{parseQuestion(filteredCards[currentCardIndex].question_text)}</h2>
                      <p className={styles.flipHint}>(Click to flip)</p>
                    </div>
                    <div className={styles.cardBack}>
                      <p className={styles.categoryTag}>{filteredCards[currentCardIndex].question_type}</p>
                      <p className={styles.answer}>{filteredCards[currentCardIndex].answer}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.controls}>
                  <button className={styles.controlButton} onClick={handlePreviousCard}>
                    Previous
                  </button>
                  <button className={styles.controlButton} onClick={handleNextCard}>
                    Next
                  </button>
                </div>
              </>
            ) : selectedCategory !== 'All' ? (
              <div className={styles.noCards}>
                <p>No favorite questions available for {selectedCategory} category.</p>
                <p>Go to your interview sessions and mark some {selectedCategory} questions as favorites to see them here.</p>
              </div>
            ) : (
              <div className={styles.noCards}>
                <p>No favorite questions found.</p>
                <p>Go to your interview sessions and mark questions as favorites to see them here.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FlashcardsPage; 