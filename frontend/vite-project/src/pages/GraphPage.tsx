import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Bot, LogOut } from 'lucide-react';
import axios from 'axios';

// Adjust these imports to your actual context/API locations
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

import styles from './GraphPage.module.css';

const GraphPage = () => {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();

  // Radar chart (hexagon) data (real data from API)
  const [skillStats, setSkillStats] = useState([
    { subject: 'Technical Skills', A: 0 },
    { subject: 'Communication', A: 0 },
    { subject: 'Problem Solving', A: 0 },
    { subject: 'Leadership', A: 0 },
    { subject: 'Resume Strength', A: 0 },
    { subject: 'Confidence', A: 0 }
  ]);

  // Dummy ELO scores
  const [eloData, setEloData] = useState<{ timestamp: string; elo: number }[]>([]);

  // Dummy leaderboard
  const [leaderboard, setLeaderboard] = useState<{ rank: number; name: string; elo: number }[]>(
    []
  );

  useEffect(() => {
    // Fetch real skill data from the 'overall_scores' endpoint
    const fetchSkills = async () => {
      try {
        const currentEmail = userEmail || localStorage.getItem('user_email');
        if (!currentEmail) {
          navigate('/login');
          return;
        }

        // Build endpoint, using user email to fetch overall scores
        const endpoint = currentEmail.includes('@')
          ? `${API_BASE_URL}/api/overall_scores/email/${currentEmail}`
          : `${API_BASE_URL}/api/overall_scores/${currentEmail}`;

        const response = await axios.get(endpoint);
        if (response.data && response.data.scores) {
          const scores = response.data.scores;
          setSkillStats([
            { subject: 'Technical Skills', A: Math.round(scores.technical * 100) },
            { subject: 'Communication', A: Math.round(scores.communication * 100) },
            { subject: 'Problem Solving', A: Math.round(scores.problem_solving * 100) },
            { subject: 'Leadership', A: Math.round(scores.leadership * 100) },
            { subject: 'Resume Strength', A: Math.round(scores['resume strength'] * 100) },
            { subject: 'Confidence', A: Math.round(scores.confidence * 100) }
          ]);
        }
      } catch (error) {
        console.error('Error fetching skill scores:', error);
        // On error, we just keep the chart at zeros
      }
    };

    fetchSkills();

    // Dummy ELO scores (static)
    const dummyEloScores = [
      { timestamp: '2025-04-01', elo: 1200 },
      { timestamp: '2025-04-02', elo: 1250 },
      { timestamp: '2025-04-03', elo: 1300 },
      { timestamp: '2025-04-04', elo: 1275 },
      { timestamp: '2025-04-05', elo: 1350 },
    ];
    setEloData(dummyEloScores);

    // Dummy leaderboard (static)
    const dummyLeaderboardData = [
      { rank: 1, name: 'Alice', elo: 1500 },
      { rank: 2, name: 'Bob', elo: 1450 },
      { rank: 3, name: 'Charlie', elo: 1420 },
      { rank: 4, name: 'David', elo: 1400 },
      { rank: 5, name: 'Eve', elo: 1390 },
      { rank: 6, name: 'Frank', elo: 1375 },
      { rank: 7, name: 'Grace', elo: 1360 },
      { rank: 8, name: 'Heidi', elo: 1350 },
      { rank: 9, name: 'Ivan', elo: 1340 },
      { rank: 10, name: 'Judy', elo: 1330 },
    ];
    setLeaderboard(dummyLeaderboardData);
  }, [userEmail, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.pageWrapper}>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={`${styles.container} ${styles.navContent}`}>
          <div className={styles.logo}>
            <Bot size={32} color="#ec4899" />
            <span>InterviewAI</span>
          </div>
          <div className={styles.navLinks}>
            <button
              className={styles.navButton}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              className={styles.navButton}
              onClick={handleLogout}
            >
              <LogOut size={20} color="#4b5563" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Detailed Graph & Stats</h1>

        {/* Card Grid: Radar (Hexagon) & ELO Chart */}
        <div className={styles.cardGrid}>

          {/* Radar Chart (Hexagon) Card */}
          <div className={styles.profileCard}>
            <h2>Skill Breakdown</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <RadarChart data={skillStats}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" stroke="#4b5563" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Skills"
                    dataKey="A"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart (ELO Over Time) Card */}
          <div className={styles.profileCard}>
            <h2>ELO Progress</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={eloData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="elo" stroke="#ec4899" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className={styles.profileCard} style={{ marginTop: '2rem' }}>
          <h2>Top 10 Leaderboard</h2>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>ELO Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user) => (
                <tr key={user.rank}>
                  <td>{user.rank}</td>
                  <td>{user.name}</td>
                  <td>{user.elo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GraphPage;
