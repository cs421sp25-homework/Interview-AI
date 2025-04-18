import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Star, TrendingDown, ArrowLeft } from 'lucide-react';
import styles from './FlashcardsPage.module.css';

const FlashcardsSelectionPage = () => {
  const navigate = useNavigate();

  const handleFavoritesClick = () => {
    navigate('/flashcards/favorites');
  };

  const handleWeakestClick = () => {
    navigate('/flashcards/weakest');
  };

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Bot size={24} color="#ec4899" />
            <span>InterviewAI</span>
          </div>
          <button
            className={styles.backButton}
            onClick={handleBackClick}
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Flashcards Study Options</h1>
        </div>

        <div className={styles.selectionContainer}>
          <div className={styles.selectionCard} onClick={handleFavoritesClick}>
            <div className={styles.selectionIconContainer}>
              <Star size={48} color="#ec4899" />
            </div>
            <h2 className={styles.selectionTitle}>Favorite Questions</h2>
            <p className={styles.selectionDescription}>
              Study the questions you've marked as favorites during your interview sessions.
            </p>
            <button className={styles.selectionButton}>Study Favorites</button>
          </div>

          <div className={styles.selectionCard} onClick={handleWeakestClick}>
            <div className={styles.selectionIconContainer}>
              <TrendingDown size={48} color="#ec4899" />
            </div>
            <h2 className={styles.selectionTitle}>Weakest Performance</h2>
            <p className={styles.selectionDescription}>
              Focus on questions where you've demonstrated the weakest performance to improve your skills.
            </p>
            <button className={styles.selectionButton}>Study Weakest</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlashcardsSelectionPage; 