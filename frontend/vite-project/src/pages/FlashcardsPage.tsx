import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './FlashcardsPage.module.css';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  ideal_answer?: string;
  question_type?: string;
}

interface ApiFlashcard {
  id: number;
  question_text: string;
  answer?: string;
  created_at: string;
  question_type?: string;
}

interface FlashcardsPageProps {
  mode: 'favorites' | 'weakest';
}

interface LocationState {
  questions?: {
    id: number;
    question: string;
    created_at: string;
    question_type: string;
  }[];
}

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

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ mode }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingIdealAnswer, setLoadingIdealAnswer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const email = localStorage.getItem('user_email');
        if (!email) {
          message.error('Please log in to view flashcards');
          navigate('/login');
          return;
        }

        setLoading(true);
        let response;
        
        if (mode === 'favorites') {
          if (locationState?.questions) {
            // Use the selected questions passed from favorites page
            const transformedCards = locationState.questions.map(question => ({
              id: question.id,
              question: parseQuestion(question.question),
              answer: 'No answer available',
              created_at: question.created_at,
              question_type: question.question_type
            }));
            console.log('Transformed cards from favorites:', transformedCards);
            setCards(transformedCards);
            setLoading(false);
            return;
          }
          
          response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}`);
        } else {
          // Fetch weakest questions
          response = await fetch(`${API_BASE_URL}/api/weak_questions/${email}`);
        }

        if (!response.ok) {
          throw new Error('Failed to fetch cards');
        }

        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          const transformedCards = data.data.map((card: ApiFlashcard) => ({
            id: card.id,
            question: parseQuestion(card.question_text),
            answer: card.answer || 'No answer available',
            created_at: card.created_at,
            question_type: card.question_type
          }));
          console.log('Transformed cards from API:', transformedCards);
          setCards(transformedCards);
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
        message.error('Failed to load flashcards');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [mode, navigate, locationState]);

  const fetchIdealAnswer = async (question: string) => {
    try {
      setLoadingIdealAnswer(true);
      const response = await fetch(`${API_BASE_URL}/api/generate_good_response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
          ai_question: question
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate ideal answer');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating ideal answer:', error);
      message.error('Failed to generate ideal answer');
      return 'Failed to generate ideal answer';
    } finally {
      setLoadingIdealAnswer(false);
    }
  };

  const handleFlip = async () => {
    if (!isFlipped && !cards[currentIndex].ideal_answer) {
      const idealAnswer = await fetchIdealAnswer(cards[currentIndex].question);
      setCards(prevCards => {
        const newCards = [...prevCards];
        newCards[currentIndex] = {
          ...newCards[currentIndex],
          ideal_answer: idealAnswer
        };
        return newCards;
      });
    }
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleBack = () => {
    if (mode === 'favorites') {
      navigate('/favorites');
    } if (mode === 'weakest') {
      navigate('/weakest');
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <h2>Loading Flashcards</h2>
          <p>Please wait while we prepare your {mode === 'favorites' ? 'favorite questions' : 'weakest questions'}...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handleBack}>
            <LeftOutlined />
            Back
          </button>
          <h1>{mode === 'favorites' ? 'Favorite Questions' : 'Weakest Questions'} Flashcards</h1>
        </div>
        <div className={styles.emptyState}>
          <h2>No Flashcards Available</h2>
          <p>You don't have any {mode === 'favorites' ? 'favorite questions' : 'weakest questions'} to study yet.</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <LeftOutlined />
          Back
        </button>
        <h1>{mode === 'favorites' ? 'Favorite Questions' : 'Weakest Questions'} Flashcards</h1>
      </div>

      <div className={styles.flashcardContainer}>
        <div 
          className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`}
          onClick={handleFlip}
        >
          <div className={styles.cardFront}>
            <div className={styles.cardHeader}>
              <span>Question</span>
            </div>
            <div className={styles.questionText}>
              {currentCard.question}
            </div>
          </div>
          <div className={styles.cardBack}>
            <div className={styles.cardHeader}>
              <span>Ideal Answer</span>
            </div>
            <div className={styles.answerText}>
              {loadingIdealAnswer ? (
                <div className={styles.loadingAnswer}>
                  <div className={styles.spinner}></div>
                  <p>Generating ideal answer...</p>
                </div>
              ) : (
                currentCard.ideal_answer || 'Click to generate ideal answer'
              )}
            </div>
          </div>
        </div>

        <div className={styles.flipHint}>
          Click the card to flip
        </div>

        <div className={styles.controls}>
          <Button onClick={handlePrevious} disabled={currentIndex === 0}>
            Previous
          </Button>
          <Button onClick={handleShuffle}>
            Shuffle
          </Button>
          <Button onClick={handleNext} disabled={currentIndex === cards.length - 1}>
            Next
          </Button>
        </div>

        <div className={styles.progress}>
          Card {currentIndex + 1} of {cards.length}
        </div>
      </div>
    </div>
  );
};

export default FlashcardsPage; 