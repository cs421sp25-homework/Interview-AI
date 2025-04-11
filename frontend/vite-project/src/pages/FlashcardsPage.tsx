import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User, ArrowLeft, BookOpen } from 'lucide-react';
import styles from './FlashcardsPage.module.css';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const sampleFlashcards: Flashcard[] = [
  {
    id: 1,
    question: "What is React?",
    answer: "React is a JavaScript library for building user interfaces, particularly single-page applications.",
    category: "Technical"
  },
  {
    id: 2,
    question: "What is JSX?",
    answer: "JSX is a syntax extension for JavaScript that looks similar to HTML and makes it easier to write React components.",
    category: "Technical"
  },
  {
    id: 3,
    question: "Describe a time when you had to work with a difficult team member.",
    answer: "When working with difficult team members, I focus on open communication, understanding their perspective, finding common ground, and focusing on shared goals. I once had a teammate who seemed resistant to collaboration, but by scheduling one-on-one discussions and showing genuine interest in their ideas, we developed a productive working relationship.",
    category: "Behavioral"
  },
  {
    id: 4,
    question: "What is a hook in React?",
    answer: "Hooks are functions that let you use state and other React features in functional components.",
    category: "Technical"
  },
  {
    id: 5,
    question: "Tell me about a time you had to meet a tight deadline.",
    answer: "I approach tight deadlines by prioritizing tasks, creating a detailed timeline, communicating with stakeholders, and staying focused. For example, on a recent project, I broke down the work into daily milestones, eliminated non-essential tasks, and successfully delivered the project on time by maintaining consistent progress.",
    category: "Behavioral"
  },
  {
    id: 6,
    question: "What is CSS-in-JS?",
    answer: "CSS-in-JS is a styling technique where JavaScript is used to style components, allowing for dynamic styling based on props or state.",
    category: "Technical"
  },
  {
    id: 7,
    question: "How do you handle conflicts in a team?",
    answer: "I handle conflicts by addressing them directly but respectfully, listening actively to all perspectives, focusing on the facts rather than personalities, and working collaboratively toward a solution. I believe conflicts, when handled properly, can lead to better outcomes and stronger team relationships.",
    category: "Behavioral"
  },
  {
    id: 8,
    question: "What is TypeScript?",
    answer: "TypeScript is a superset of JavaScript that adds static typing to the language.",
    category: "Technical"
  },
  {
    id: 9,
    question: "Describe a situation where you had to learn something new quickly.",
    answer: "When faced with learning something new quickly, I break down the subject into manageable parts, focus on the most essential aspects first, use various learning resources, and apply the knowledge immediately. For instance, when I needed to learn a new framework for a project, I started with basic concepts, followed tutorials, and built small components to reinforce my understanding.",
    category: "Behavioral"
  },
  {
    id: 10,
    question: "What are RESTful APIs?",
    answer: "RESTful APIs are architectural style for designing networked applications that use HTTP requests to access and manipulate data. They are stateless, cacheable, and follow a client-server model with a uniform interface.",
    category: "Technical"
  }
];

const FlashcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Get unique categories
  const categories = ['All', ...new Set(sampleFlashcards.map(card => card.category))];
  
  // Filter cards by category
  const filteredCards = selectedCategory === 'All' 
    ? sampleFlashcards 
    : sampleFlashcards.filter(card => card.category === selectedCategory);

  const handleNextCard = () => {
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % filteredCards.length);
    setShowAnswer(false);
  };

  const handlePreviousCard = () => {
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
    setSelectedCategory(category);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
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
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.title}>
          <BookOpen size={32} color="#ec4899" style={{ marginRight: '12px' }} />
          Interview Flashcards
        </div>
        
        <div className={styles.categoryContainer}>
          {categories.map(category => (
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
                  <p className={styles.categoryTag}>{filteredCards[currentCardIndex].category}</p>
                  <h2 className={styles.question}>{filteredCards[currentCardIndex].question}</h2>
                  <p className={styles.flipHint}>(Click to flip)</p>
                </div>
                <div className={styles.cardBack}>
                  <p className={styles.categoryTag}>{filteredCards[currentCardIndex].category}</p>
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
        ) : (
          <div className={styles.noCards}>
            <p>No flashcards available for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardsPage; 