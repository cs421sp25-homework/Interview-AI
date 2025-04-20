import React, { useState, useEffect } from 'react';
import { Button, Input, Tooltip, message } from 'antd';
import {
  LeftOutlined,
  SaveOutlined,
  BulbOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './FlashcardsPage.module.css';

const { TextArea } = Input;

/* ──────────────────────────  types  ────────────────────────── */

interface Flashcard {
  id: number;
  question: string;
  humanAnswer?: string;  // Rename answer to humanAnswer
  aiAnswer?: string;     // Add separate field for AI answer
  created_at: string;
  question_type?: string;
  session_id: string;
}

interface ApiFlashcard {
  id: number;
  question_text: string;
  answer?: string;        // ← existing human answer stored on server (may be undefined)
  created_at: string;
  question_type?: string;
  session_id: string;
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
    session_id: string;
  }[];
}

/* ──────────────────────────  helpers  ────────────────────────── */

const parseQuestion = (txt: string): string => {
  const parts = txt.split(/[.!?]+/);
  const qs = parts.filter(p => {
    const t = p.trim();
    if (!t) return false;
    const rest = txt.slice(txt.indexOf(t) + t.length);
    return rest.startsWith('?');
  });
  if (!qs.length) return parts.at(-1)!.trim() + '?';
  return qs.map(q => q.trim() + '?').join('\n');
};

const renderBullet = (ans = '') => {
  const lines = ans
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.replace(/^•/, '').trim());
  return (
    <ul className={styles.bulletList}>
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
};

/* ──────────────────────────  component  ────────────────────────── */

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const locationState = state as LocationState;

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiIdx, setAiIdx] = useState<number | null>(null); // which row is generating

  /* ─────  fetch questions  ───── */
  useEffect(() => {
    const load = async () => {
      try {
        const email = localStorage.getItem('user_email');
        if (!email) {
          message.error('Please log in first');
          navigate('/login');
          return;
        }

        let raw: ApiFlashcard[] = [];

        // 1. came from "favorites" page with pre‑loaded questions?
        if (mode === 'favorites' && locationState?.questions) {
          raw = locationState.questions.map(q => ({
            id: q.id,
            question_text: q.question,
            created_at: q.created_at,
            question_type: q.question_type,
            answer: undefined,
            session_id: q.session_id,
          }));
        } else {
          // 2. normal fetch
          const end =
            mode === 'favorites'
              ? `/api/favorite_questions/${email}`
              : `/api/weak_questions/${email}`;
          const res = await fetch(`${API_BASE_URL}${end}`);
          if (!res.ok) throw new Error('fetch failed');
          const { data } = await res.json();
          raw = data;
        }

        const mapped: Flashcard[] = raw.map(r => ({
          id: r.id,
          question: r.question_text,
          humanAnswer: r.answer ?? '',
          created_at: r.created_at,
          question_type: r.question_type,
          session_id: r.session_id,
        }));
        setCards(mapped);
      } catch (e) {
        console.error(e);
        message.error('Unable to load flashcards');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, navigate, locationState]);

  /* ─────  navigation helpers  ───── */

  const shuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setIdx(0);
    setFlipped(false);
  };

  const next = () => {
    if (idx < cards.length - 1) {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  };

  const prev = () => {
    if (idx > 0) {
      setIdx(i => i - 1);
      setFlipped(false);
    }
  };

  /* ─────  save human answer  ───── */

  const saveAnswer = async (card: Flashcard) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/store_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: card.id,
          question: card.question,
          answer: card.humanAnswer,
          email: localStorage.getItem('user_email'),
          session_id: card.session_id,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save answer');
      }

      message.success('Answer saved successfully');
      
      // Update the card in the local state with the saved answer
      setCards(prevCards => 
        prevCards.map(c => 
          c.id === card.id ? { ...c, humanAnswer: card.humanAnswer } : c
        )
      );
    } catch (error) {
      console.error('Error saving answer:', error);
      message.error('Failed to save answer. Please try again.');
    }
  };

  const saveAiAnswer = async (card: Flashcard) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/store_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: card.id,
          question: card.question,
          answer: card.aiAnswer,
          email: localStorage.getItem('user_email'),
          session_id: card.session_id,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save AI answer');
      }

      message.success('AI answer saved successfully');
    } catch (error) {
      console.error('Error saving AI answer:', error);
      message.error('Failed to save AI answer. Please try again.');
    }   
  };

  /* ─────  AI answer generation  ───── */

  const genAI = async (i: number) => {
    const q = cards[i].question;
    try {
      setAiIdx(i);

      const res = await fetch(`${API_BASE_URL}/api/generate_flashcard_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: 'English' }),
      });
      if (!res.ok) throw new Error('gen');
      const { ideal_answer } = await res.json();

      setCards(prev => {
        const copy = [...prev];
        copy[i].aiAnswer = ideal_answer;  // Store AI answer separately
        return copy;
      });
    } catch {
      message.error('AI generation failed');
    } finally {
      setAiIdx(null);
    }
  };

  /* ─────  UI  ───── */

  if (loading) {
    return (
      <div className={styles.loaderPane}>
        <LoadingOutlined spin style={{ fontSize: 42 }} />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className={styles.emptyPane}>
        No {mode === 'favorites' ? 'favourite' : 'weak'} questions yet.
      </div>
    );
  }

  const card = cards[idx];

  return (
    <div className={styles.page}>
      {/* header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <LeftOutlined /> Back
        </button>
        <h1>
          Flashcards – {mode === 'favorites' ? 'Favourite' : 'Weakest'} Questions
        </h1>
      </div>

      {/* central flip card */}
      <div className={styles.stage}>
        <div
          className={`${styles.card} ${flipped ? styles.flipped : ''}`}
          onClick={() => setFlipped(f => !f)}
        >
          {/* front */}
          <div className={styles.face}>
            <span className={styles.tag}>Question</span>
            <p className={styles.qText}>{parseQuestion(card.question)}</p>
          </div>

          {/* back */}
          <div className={`${styles.face} ${styles.back}`}>
            <span className={styles.tag}>Answer</span>
            <p className={styles.aText}>
              {card.humanAnswer?.trim()
                ? card.humanAnswer
                : 'No answer yet.'}
            </p>
            {card.aiAnswer && (
              <div className={styles.aiBlock}>
                <span className={styles.aiLabel}>AI Answer</span>
                {renderBullet(card.aiAnswer)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <Button onClick={prev} disabled={idx === 0}>
            Previous
          </Button>
          <Button onClick={shuffle}>Shuffle</Button>
          <Button onClick={next} disabled={idx === cards.length - 1}>
            Next
          </Button>
        </div>

        <p className={styles.progress}>
          Card {idx + 1} / {cards.length} – click to flip
        </p>
      </div>

      {/* editable list */}
      <div className={styles.list}>
        {cards.map((c, i) => (
          <div key={c.id} className={styles.item}>
            <div className={styles.question}>{c.question}</div>

            <TextArea
              placeholder="Type your answer..."
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={c.humanAnswer}
              onChange={e =>
                setCards(prev => {
                  const copy = [...prev];
                  copy[i].humanAnswer = e.target.value;
                  return copy;
                })
              }
              className={styles.area}
            />

            <div className={styles.itemBtns}>
              <Tooltip title="Save my answer">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => saveAnswer(c)}
                />
              </Tooltip>

              <Tooltip title="Generate AI answer">
                <Button
                  icon={<BulbOutlined />}
                  loading={aiIdx === i}
                  onClick={() => genAI(i)}
                />
              </Tooltip>
            </div>

            {c.aiAnswer && (
              <div className={styles.aiBlock}>
                <span className={styles.aiLabel}>AI Answer</span>
                {renderBullet(c.aiAnswer)}
              </div>
            )}
            {c.aiAnswer && (
              <Tooltip title="Save AI answer">
                <Button
                  icon={<SaveOutlined />}
                loading={aiIdx === i}
                onClick={() => saveAiAnswer(c)}
              />
            </Tooltip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardsPage;
