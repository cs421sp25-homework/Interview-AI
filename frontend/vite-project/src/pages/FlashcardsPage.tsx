import React, { useState, useEffect } from 'react';
import { Button, Input, Tooltip, message, Switch, Alert } from 'antd';
import {
  LeftOutlined,
  SaveOutlined,
  BulbOutlined,
  LoadingOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
  EditOutlined,
  CheckOutlined,
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
    <>
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </>
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
  const [flashcardsOnly, setFlashcardsOnly] = useState(false); // new state for toggle
  const [aiGenerated, setAiGenerated] = useState<Record<number, boolean>>({});
  const [savingIdx, setSavingIdx] = useState<number | null>(null); // which answer is saving
  const [saveSuccess, setSaveSuccess] = useState<Record<number, boolean>>({});

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

  const saveAnswer = async (card: Flashcard, index: number) => {
    try {
      setSavingIdx(index);
      
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
      
      // Show success icon briefly
      setSaveSuccess(prev => ({...prev, [index]: true}));
      setTimeout(() => {
        setSaveSuccess(prev => {
          const newState = {...prev};
          delete newState[index];
          return newState;
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error saving answer:', error);
      message.error('Failed to save answer. Please try again.');
    } finally {
      setSavingIdx(null);
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
      
      // Mark this card as having newly generated AI content
      setAiGenerated(prev => ({...prev, [i]: true}));
      
      // Show success message with guidance
      message.success('AI answer generated! Use it as a reference to improve your answer.');
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
        <LoadingOutlined spin style={{ fontSize: 42, color: '#ec4899' }} />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className={styles.emptyPane}>
        <div>
          <p>No {mode === 'favorites' ? 'favourite' : 'weak'} questions yet.</p>
          <Button 
            type="primary" 
            onClick={() => navigate('/dashboard')}
            style={{ marginTop: '1rem', background: '#ec4899', borderColor: '#ec4899' }}
          >
            Return to Dashboard
          </Button>
        </div>
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
        <div className={styles.viewToggle}>
          <Tooltip title={flashcardsOnly ? "Show Question List" : "Flashcards Only"}>
            <Button 
              icon={flashcardsOnly ? <AppstoreOutlined /> : <CreditCardOutlined />}
              onClick={() => setFlashcardsOnly(!flashcardsOnly)}
              type={flashcardsOnly ? "default" : "primary"}
              style={flashcardsOnly ? {} : {background: '#ec4899', borderColor: '#ec4899'}}
            >
              {flashcardsOnly ? "Show List" : "Flashcards Only"}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Add spacing for header */}
      <div style={{ marginTop: '2rem' }}></div>

      {/* central flip card */}
      <div className={styles.stage}>
        <div
          className={`${styles.card} ${flipped ? styles.flipped : ''}`}
          onClick={() => setFlipped(f => !f)}
        >
          {/* front */}
          <div className={styles.face}>
            <span className={styles.tag}>Question</span>
            <div className={styles.qText}>{parseQuestion(card.question)}</div>
          </div>

          {/* back */}
          <div className={`${styles.face} ${styles.back}`}>
            <span className={styles.tag}>Answer</span>
            <div className={styles.aText}>
              {card.humanAnswer?.trim()
                ? card.humanAnswer
                : 'No answer yet.'}
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <Button 
            onClick={prev} 
            disabled={idx === 0}
            icon={<ArrowLeftOutlined />}
          >
            Previous
          </Button>
          <Button onClick={shuffle} icon={<ReloadOutlined />}>
            Shuffle
          </Button>
          <Button 
            onClick={next} 
            disabled={idx === cards.length - 1}
            icon={<ArrowRightOutlined />}
            type="primary"
            style={{ background: '#ec4899', borderColor: '#ec4899' }}
          >
            Next
          </Button>
        </div>

        <p className={styles.progress}>
          Card {idx + 1} / {cards.length} – click to flip
        </p>
      </div>

      {/* editable list - only show if not in flashcardsOnly mode */}
      {!flashcardsOnly && (
        <div className={styles.list}>
          {cards.map((c, i) => (
            <div key={c.id} className={styles.item}>
              <div className={styles.question}>{c.question}</div>

              {aiGenerated[i] && (
                <Alert
                  message="AI answer generated! Review and update your answer if needed."
                  type="info"
                  showIcon
                  icon={<EditOutlined />}
                  style={{ marginBottom: '1rem', background: '#fdf2f8', border: '1px solid #fbbfd6' }}
                  closable
                  onClose={() => {
                    setAiGenerated(prev => {
                      const newState = {...prev};
                      delete newState[i];
                      return newState;
                    });
                  }}
                />
              )}

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
                    icon={saveSuccess[i] ? <CheckOutlined /> : <SaveOutlined />}
                    onClick={() => saveAnswer(c, i)}
                    loading={savingIdx === i}
                    style={{ 
                      background: saveSuccess[i] ? '#10b981' : '#ec4899', 
                      borderColor: saveSuccess[i] ? '#10b981' : '#ec4899',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </Tooltip>

                <Tooltip title="Generate AI Suggested Answer">
                  <Button
                    icon={<BulbOutlined />}
                    loading={aiIdx === i}
                    onClick={() => genAI(i)}
                  />
                </Tooltip>
              </div>

              {c.aiAnswer && (
                <div className={styles.aiBlock}>
                  <span className={styles.aiLabel}>AI Reference</span>
                  <ul className={styles.bulletList}>
                    {renderBullet(c.aiAnswer)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardsPage;
