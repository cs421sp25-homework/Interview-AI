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

interface Question {
  question_text: string;
  ideal_answer?: string;
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

const renderAnswer = (answer: string | undefined) => {
  if (!answer) return 'Click to generate ideal answer';
  
  // Split the answer into bullet points and render as list
  const bulletPoints = answer.split('\n').filter(point => point.trim().startsWith('•'));
  
  return (
    <ul>
      {bulletPoints.map((point, index) => (
        <li key={index}>{point.trim().substring(1).trim()}</li>
      ))}
    </ul>
  );
};

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ mode }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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
            const transformedCards = locationState.questions.map(question => ({
              id: question.id,
              question: parseQuestion(question.question),
              answer: 'No answer available',
              created_at: question.created_at,
              question_type: question.question_type
            }));
            setCards(transformedCards);
            setLoading(false);
            return;
          }
          
          response = await fetch(`${API_BASE_URL}/api/favorite_questions/${email}`);
        } else {
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
      setLoading(true);
      const userEmail = localStorage.getItem('user_email');
      
      if (!userEmail) {
        throw new Error('User not logged in');
      }

      // First check if we already have an ideal answer in the database
      const checkResponse = await fetch(`${API_BASE_URL}/api/weak_questions/${userEmail}`);
      const checkData = await checkResponse.json();
      
      if (checkData.data) {
        const existingQuestion = checkData.data.find((q: Question) => q.question_text === question);
        if (existingQuestion && existingQuestion.ideal_answer) {
          return existingQuestion.ideal_answer;
        }
      }

      // If no existing answer, generate a new one
      const response = await fetch(`${API_BASE_URL}/api/generate_flashcard_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          language: 'English'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate ideal answer');
      }

      const data = await response.json();
      const idealAnswer = data.ideal_answer;

      // Store the generated answer in the database
      await fetch(`${API_BASE_URL}/api/store_ideal_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          ideal_answer: idealAnswer,
          email: userEmail
        }),
      });

      return idealAnswer;
    } catch (error) {
      console.error('Error generating ideal answer:', error);
      return 'Failed to generate ideal answer. Please try again later.';
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = async () => {
    if (!isFlipped && cards[currentIndex] && !cards[currentIndex].ideal_answer) {
      const idealAnswer = await fetchIdealAnswer(cards[currentIndex].question);
      setCards(prev => {
        const newCards = [...prev];
        newCards[currentIndex] = { ...newCards[currentIndex], ideal_answer: idealAnswer };
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
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handleBack}>
            <LeftOutlined />
            Back
          </button>
          <h1>Flashcards - {mode === 'favorites' ? 'Favorite Questions' : 'Weakest Questions'} </h1>
        </div>
        <div className={styles.flashcardContainer}>
          <div className={styles.flashcard}>
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>
                <span>Question</span>
              </div>
              <div className={styles.questionText}>
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner}></div>
                </div>
              </div>
            </div>
          </div>
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
          <h1>Flashcards - {mode === 'favorites' ? 'Favorite Questions' : 'Weakest Questions'} </h1>
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
        <h1>Flashcards - {mode === 'favorites' ? 'Favorite Questions' : 'Weakest Questions'} </h1>
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
              {loading ? (
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner}></div>
                </div>
              ) : (
                renderAnswer(currentCard.ideal_answer)
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