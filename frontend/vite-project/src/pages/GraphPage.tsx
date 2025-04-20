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
import { Bot, Home } from 'lucide-react';
import axios from 'axios';

// Adjust these imports to your actual context/API locations
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

import styles from './GraphPage.module.css';

const GraphPage = () => {
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  // Radar chart (hexagon) data (real data from API)
  const [skillStats, setSkillStats] = useState([
    { subject: 'Technical Skills', A: 0 },
    { subject: 'Communication', A: 0 },
    { subject: 'Problem Solving', A: 0 },
    { subject: 'Leadership', A: 0 },
    { subject: 'Resume Strength', A: 0 },
    { subject: 'Confidence', A: 0 }
  ]);

  // ELO history data
  const [eloData, setEloData] = useState<{ timestamp: string; elo: number }[]>([]);
  const [isLoadingElo, setIsLoadingElo] = useState(true);
  const [eloError, setEloError] = useState<string | null>(null);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<{ rank: number; name: string; elo: number }[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  // 添加调试状态
  const [debug, setDebug] = useState(false);

  // 添加调试函数
  const toggleDebug = () => {
    setDebug(!debug);
    if (!debug) {
      console.log('Debug mode enabled. Current state:', {
        skillStats,
        eloData,
        leaderboard
      });
    }
  };

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
        console.log('Skills API response:', response.data);
        
        if (response.data && response.data.scores) {
          const scores = response.data.scores;
          const formattedSkills = [
            { subject: 'Technical Skills', A: Math.round(scores.technical * 100) },
            { subject: 'Communication', A: Math.round(scores.communication * 100) },
            { subject: 'Problem Solving', A: Math.round(scores.problem_solving * 100) },
            { subject: 'Leadership', A: Math.round(scores.leadership * 100) },
            { subject: 'Resume Strength', A: Math.round(scores['resume strength'] * 100) },
            { subject: 'Confidence', A: Math.round(scores.confidence * 100) }
          ];
          console.log('Formatted skills data:', formattedSkills);
          setSkillStats(formattedSkills);
        } else {
          console.log('No skills data found, using defaults');
          setSkillStats([
            { subject: 'Technical Skills', A: 65 },
            { subject: 'Communication', A: 78 },
            { subject: 'Problem Solving', A: 72 },
            { subject: 'Leadership', A: 55 },
            { subject: 'Resume Strength', A: 85 },
            { subject: 'Confidence', A: 68 }
          ]);
        }
      } catch (error) {
        console.error('Error fetching skill scores:', error);
        console.log('Error fetching skills, using default values');
        setSkillStats([
          { subject: 'Technical Skills', A: 65 },
          { subject: 'Communication', A: 78 },
          { subject: 'Problem Solving', A: 72 },
          { subject: 'Leadership', A: 55 },
          { subject: 'Resume Strength', A: 85 },
          { subject: 'Confidence', A: 68 }
        ]);
      }
    };

    // Fetch ELO history from the API
    const fetchEloHistory = async () => {
      setIsLoadingElo(true);
      setEloError(null);
      
      try {
        const currentEmail = userEmail || localStorage.getItem('user_email');
        if (!currentEmail) {
          setIsLoadingElo(false);
          return;
        }

        console.log('Fetching ELO history for:', currentEmail);
        const response = await axios.get(`http://localhost:5001/api/elo/history/${currentEmail}`);
        console.log('ELO history API response:', response.data);
        
        if (response.data && response.data.success) {
          if (response.data.data && response.data.data.length > 0) {
            // 有历史数据，格式化并设置
            const formattedData = response.data.data.map((item: any) => ({
              timestamp: item.date,
              elo: item.score
            }));
            
            console.log('Formatted ELO history data:', formattedData);
            setEloData(formattedData);
          } else {
            // API成功但没有数据 - 用户没有ELO历史
            console.log('User has no ELO history yet');
            setEloData([]);
          }
        } else {
          console.log('Invalid ELO history data response');
          setEloError('Could not retrieve ELO history data.');
          setEloData([]);
        }
      } catch (error) {
        console.error('Error fetching ELO history:', error);
        setEloError('Failed to load ELO history. Please try again later.');
        setEloData([]);
      } finally {
        setIsLoadingElo(false);
      }
    };

    // Fetch leaderboard data
    const fetchLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      try {
        const response = await axios.get('http://localhost:5001/api/elo/leaderboard?limit=10');
        console.log('Leaderboard API response:', response.data);
        
        if (response.data && response.data.success) {
          if (response.data.data && response.data.data.length > 0) {
            // 有排行榜数据，格式化并设置
            const formattedData = response.data.data.map((item: any) => ({
              rank: item.rank,
              name: item.name,
              elo: item.eloscore // Note: using lowercase as per our Supabase schema
            }));
            
            console.log('Formatted leaderboard data:', formattedData);
            setLeaderboard(formattedData);
          } else {
            // API成功但没有数据 - 排行榜为空
            console.log('No leaderboard data available yet');
            setLeaderboard([]);
          }
        } else {
          console.log('Invalid leaderboard data response');
          setLeaderboard([]);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    // Execute all fetch operations
    fetchSkills();
    fetchEloHistory();
    fetchLeaderboard();
  }, [userEmail, navigate]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Format date for better display in the chart
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
              className={styles.backButton}
              onClick={handleBack}
            >
              <Home size={18} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>
          Performance Analytics Dashboard
          {/* 隐藏的调试开关 */}
          <span 
            onClick={toggleDebug} 
            style={{ 
              marginLeft: '8px', 
              fontSize: '12px', 
              color: debug ? '#ec4899' : '#f1f5f9',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            •
          </span>
        </h1>
        
        {/* 调试面板 */}
        {debug && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <p>Debug Info:</p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Skill Data Count: {skillStats.length}</li>
              <li>ELO History Count: {eloData.length}</li>
              <li>Leaderboard Count: {leaderboard.length}</li>
            </ul>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => console.log(skillStats)} style={{ fontSize: '12px', padding: '3px 6px' }}>
                Log Skill Data
              </button>
              <button onClick={() => console.log(eloData)} style={{ fontSize: '12px', padding: '3px 6px' }}>
                Log ELO Data
              </button>
            </div>
          </div>
        )}

        {/* Card Grid: Radar (Hexagon) & ELO Chart */}
        <div className={styles.cardGrid}>

          {/* Radar Chart (Hexagon) Card */}
          <div className={styles.profileCard}>
            <h2>Skill Breakdown</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillStats} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
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
            {isLoadingElo ? (
              <div className={styles.loadingContainer}>Loading ELO data...</div>
            ) : eloError ? (
              <div className={styles.errorContainer}>{eloError}</div>
            ) : eloData.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 6l-9.5 9.5-5-5L1 18"></path>
                      <path d="M17 6h6v6"></path>
                    </svg>
                  </div>
                  <h3 style={{ color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>No ELO History Yet</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                    Complete your first interview to start tracking your ELO score progress over time.
                  </p>
                  <button 
                    onClick={() => navigate('/prompts')} 
                    style={{
                      marginTop: '1.5rem',
                      padding: '0.5rem 1rem',
                      background: '#ec4899',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(236, 72, 153, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Start an Interview
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={[...eloData].reverse()} 
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={['dataMin - 50', 'dataMax + 50']} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}`}
                      formatter={(value) => [`ELO: ${value}`, '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="elo" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className={styles.profileCard}>
          <h2>Top 10 Leaderboard By ELO Score</h2>
          {isLoadingLeaderboard ? (
            <div className={styles.loadingContainer}>
              <div style={{ marginBottom: '0.5rem' }}>
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '24px', height: '24px' }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              Loading leaderboard...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3 style={{ color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>No Ranking Data Available</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                  Complete interviews to join the global leaderboard and compare your progress with others.
                </p>
              </div>
            </div>
          ) : (
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
                  <tr key={user.rank} className={user.name === userEmail ? styles.currentUser : ''}>
                    <td>
                      {user.rank === 1 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="gold" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {user.rank}
                        </span>
                      ) : user.rank}
                    </td>
                    <td>{user.name}</td>
                    <td>{user.elo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphPage;
