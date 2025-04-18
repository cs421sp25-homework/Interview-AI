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
  human_answer?: string;  // 👈 user‑typed answer
  ideal_answer?: string;  // 👈 AI answer
  created_at: string;
  question_type?: string;
}

interface ApiFlashcard {
  id: number;
  question_text: string;
  answer?: string;        // ← existing human answer stored on server (may be undefined)
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

        // 1. came from “favorites” page with pre‑loaded questions?
        if (mode === 'favorites' && locationState?.questions) {
          raw = locationState.questions.map(q => ({
            id: q.id,
            question_text: q.question,
            created_at: q.created_at,
            question_type: q.question_type,
            answer: undefined,
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
          question: parseQuestion(r.question_text),
          human_answer: r.answer ?? '',
          created_at: r.created_at,
          question_type: r.question_type,
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

  const saveHuman = async (i: number) => {
    try {
      const email = localStorage.getItem('user_email');
      if (!email) return;
      const c = cards[i];
      await fetch(`${API_BASE_URL}/api/store_human_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          question: c.question,
          answer: c.human_answer,
          email,
        }),
      });
      message.success('Saved');
    } catch {
      message.error('Save failed');
    }
  };

  /* ─────  AI answer generation  ───── */

  const genAI = async (i: number) => {
    const q = cards[i].question;
    try {
      setAiIdx(i);

      // try cache first
      const email = localStorage.getItem('user_email')!;
      const cache = await fetch(
        `${API_BASE_URL}/api/ideal_answer?question=${encodeURIComponent(
          q
        )}&email=${email}`
      );
      if (cache.ok) {
        const j = await cache.json();
        if (j.ideal_answer) {
          setCards(prev => {
            const copy = [...prev];
            copy[i].ideal_answer = j.ideal_answer;
            return copy;
          });
          return;
        }
      }

      // otherwise generate
      const res = await fetch(`${API_BASE_URL}/api/generate_flashcard_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: 'English' }),
      });
      if (!res.ok) throw new Error('gen');
      const { ideal_answer } = await res.json();

      // store on server
      await fetch(`${API_BASE_URL}/api/store_ideal_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, ideal_answer, email }),
      });

      setCards(prev => {
        const copy = [...prev];
        copy[i].ideal_answer = ideal_answer;
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
            <p className={styles.qText}>{card.question}</p>
          </div>

          {/* back */}
          <div className={`${styles.face} ${styles.back}`}>
            <span className={styles.tag}>Your Answer</span>
            <p className={styles.aText}>
              {card.human_answer?.trim()
                ? card.human_answer
                : 'No human answer yet.'}
            </p>
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
              value={c.human_answer}
              onChange={e =>
                setCards(prev => {
                  const copy = [...prev];
                  copy[i].human_answer = e.target.value;
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
                  onClick={() => saveHuman(i)}
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

            {c.ideal_answer && (
              <div className={styles.aiBlock}>
                <span className={styles.aiLabel}>AI Answer</span>
                {renderBullet(c.ideal_answer)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardsPage;
