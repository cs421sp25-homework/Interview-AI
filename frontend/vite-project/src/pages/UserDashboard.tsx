import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Play, 
  FileText,
  Trophy,
  Settings,
  LogOut,
  BookOpen
} from 'lucide-react';
import {
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import styles from './UserDashboard.module.css';

// 定义接口
interface LeaderboardItem {
  rank: number;
  name: string;
  elo: number;
  email?: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();

  const userIdentifierRef = useRef({
    email: '',
    name: ''
  });

  // Store user profile data
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    interviews: 0,
    joined: '',
    photoUrl: null as string | null
  });

  // Radar chart data
  const [skillStats, setSkillStats] = useState([
    { subject: 'Technical Skills', A: 0 },
    { subject: 'Communication', A: 0 },
    { subject: 'Problem Solving', A: 0 },
    { subject: 'Leadership', A: 0 },
    { subject: 'Resume Strength', A: 0 },
    { subject: 'Confidence', A: 0 }
  ]);

  // Leaderboard data state
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');

  // User ranking in leaderboard
  const [userRanking, setUserRanking] = useState({
    rank: -1,
    username: '',
    score: 0
  });

  // Error state for display if any API call fails
  const [error, setError] = useState('');
  
  // Track if we're loading the interview count
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setError(''); // reset error before each fetch

        // 获取用户邮箱
        const currentEmail = userEmail || localStorage.getItem('user_email');
        if (!currentEmail) {
          navigate('/login');
          return;
        }

        userIdentifierRef.current.email = currentEmail;

        const response = await axios.get(`${API_BASE_URL}/api/profile/${currentEmail}`);

        if (response.data.data) {
          const profile = response.data.data;

          if (profile.photo_url) {
            localStorage.setItem('user_photo_url', profile.photo_url);
          }

          let joinedDate = '';
          try {
            if (profile.created_at) {
              const createdAtUTC = new Date(profile.created_at);
              if (!isNaN(createdAtUTC.getTime())) {
                const options: Intl.DateTimeFormatOptions = { 
                  timeZone: 'America/New_York',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour12: true
                };
                joinedDate = createdAtUTC.toLocaleString('en-US', options);
              } else {
                joinedDate = 'Invalid date';
              }
            } else {
              joinedDate = 'Not available';
            }
          } catch (dateError) {
            console.error('Error parsing date:', dateError);
            joinedDate = 'Date error';
          }

          const fullName = `${profile.first_name} ${profile.last_name}`.trim();
          userIdentifierRef.current.name = fullName;

          const initialUserData = {
            name: fullName,
            email: profile.email,
            interviews: profile.interviews_completed || 0,
            joined: joinedDate,
            photoUrl: profile.photo_url || null
          };
          
          setUserData(initialUserData);

          const userId = profile.id || profile.email;
          fetchUserScores(userId);

          fetchInterviewCount(initialUserData.email);

          fetchLeaderboard();
        } else {
          setError('Profile data not found. Please complete your profile or contact support.');
        }
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        if (err.response) {
          const { status, data } = err.response;
          if (status === 401) {
            // 未授权，强制重新登录
            logout();
            navigate('/login');
          } else if (status === 404) {
            setError('Profile not found. Please ensure your account exists.');
          } else if (status === 500) {
            setError('Server error fetching profile. Please try again later.');
          } else {
            setError(data.error || 'An error occurred fetching profile data.');
          }
        } else {
          setError('Network error. Please check your connection or try again later.');
        }
      }
    };

    // Helper function to fetch user scores
    const fetchUserScores = async (userId: string) => {
      try {
        const endpoint = userId.includes('@')
          ? `${API_BASE_URL}/api/overall_scores/email/${userId}`
          : `${API_BASE_URL}/api/overall_scores/${userId}`;
        
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
        console.error('Error fetching user scores:', error);
      }
    };
    
    // Helper function to fetch interview count
    const fetchInterviewCount = async (email: string) => {
      try {
        setLoadingInterviews(true);
        // Use the same endpoint as InterviewHistoryPage
        const response = await fetch(`${API_BASE_URL}/api/interview_logs/${email}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.data)) {
            // Update the interview count with the actual number from the API
            setUserData(prevData => ({
              ...prevData,
              interviews: data.data.length
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching interview count:', error);
        // We don't set an error here since it's not critical
      } finally {
        setLoadingInterviews(false);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        setLoadingLeaderboard(true);
        setLeaderboardError('');
        
        const response = await axios.get(`${API_BASE_URL}/api/elo/leaderboard?limit=10`);
        
        if (response.data && response.data.success && response.data.data) {
          const formattedData = response.data.data.map((item: any) => ({
            rank: item.rank || 0,
            name: item.name || '',
            elo: item.eloscore || 0,
            email: item.email || ''
          }));
          
          
          const top5Data = formattedData.slice(0, 5);
          setLeaderboardData(top5Data);
          
          const userEmail = userIdentifierRef.current.email;
          const userName = userIdentifierRef.current.name;
                    
          let userInLeaderboard = formattedData.find((item: LeaderboardItem) => 
            item.email && item.email.toLowerCase() === userEmail.toLowerCase()
          );
          
          if (!userInLeaderboard) {
            userInLeaderboard = formattedData.find((item: LeaderboardItem) => 
              item.name && item.name.toLowerCase() === userName.toLowerCase()
            );
          }
          
          if (userInLeaderboard) {            
            setUserRanking({
              rank: userInLeaderboard.rank,
              username: userInLeaderboard.name,
              score: userInLeaderboard.elo
            });
          } else {
            await fetchUserRank();
          }
        } else {
          throw new Error('Invalid leaderboard data format from server');
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardError('Failed to load leaderboard data');
        
        setLeaderboardData([
          { rank: 1, name: "SophieCoder", elo: 98 },
          { rank: 2, name: "AlexTechGuru", elo: 95 },
          { rank: 3, name: "MikeDevMaster", elo: 92 },
          { rank: 4, name: "EmilyJavaPro", elo: 89 },
          { rank: 5, name: "RyanFullStack", elo: 85 }
        ]);
        
        try {
          await fetchUserRank();
        } catch (e) {
          setUserRanking({
            rank: 8,
            username: userData.name || "You",
            score: 82
          });
        }
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    
    const fetchUserRank = async () => {
      const email = userIdentifierRef.current.email;
      if (!email) {
        return;
      }
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/elo/user/${email}`);
        
        if (response.data && response.data.success && response.data.data) {
          const rankData = response.data.data;
          
          if (rankData.rank && rankData.rank > 0) {
            setUserRanking({
              rank: rankData.rank,
              username: rankData.name || userIdentifierRef.current.name || 'You',
              score: rankData.eloscore || 0
            });
          } else if (rankData.eloscore && rankData.eloscore > 0) {
            setUserRanking({
              rank: 99,
              username: rankData.name || userIdentifierRef.current.name || 'You',
              score: rankData.eloscore
            });
          } else {
            setUserRanking({
              rank: -1,
              username: userIdentifierRef.current.name || 'You',
              score: 0
            });
          }
        } else {
          setUserRanking({
            rank: -1,
            username: userIdentifierRef.current.name || 'You',
            score: 0
          });
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
      }
    };

    fetchUserProfile();
  }, [userEmail, navigate, logout]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div>
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
                onClick={() => navigate('/settings')}
                data-testid="settings-button"
              >
                <Settings size={20} color="#4b5563" />
                <span>Profile Settings</span>
              </button>
              <button 
                className={styles.navButton}
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut size={20} color="#4b5563" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* If there's an error fetching data, show a banner or message */}
        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.container}>
          <div className={styles.profileGrid}>
            {/* Left Column - Profile Info */}
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatar}>
                  {userData.photoUrl ? (
                    <img 
                      src={userData.photoUrl} 
                      alt="Profile" 
                      className={styles.avatarImage} 
                    />
                  ) : (
                    <User size={48} color="#ec4899" />
                  )}
                </div>
                <h2>{userData.name || 'Anonymous User'}</h2>
              </div>

              <div className={styles.profileStats}>
                <div className={styles.statItem}>
                  <span>Interviews Completed</span>
                  <span>
                    {loadingInterviews ? (
                      <span className={styles.loadingDots}>...</span>
                    ) : (
                      userData.interviews
                    )}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span>Member Since</span>
                  <span>{userData.joined}</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                  Leaderboard
                  <span 
                    style={{ 
                      marginLeft: '8px', 
                      fontSize: '14px', 
                      color: '#e5e7eb',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    •
                  </span>
                </h3>
                {loadingLeaderboard ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading leaderboard...</p>
                  </div>
                ) : leaderboardError ? (
                  <div className={styles.errorMessage}>{leaderboardError}</div>
                ) : (
                  <>
                    <div className={styles.rankingInfo}>
                      <div className={styles.yourRank}>
                        <Trophy size={16} color="#ec4899" />
                        {userRanking.rank > 0 && userRanking.rank < 99 ? (
                          <span>Your current rank: <strong>#{userRanking.rank}</strong></span>
                        ) : userRanking.rank === 99 ? (
                          <span>You have an ELO score but your exact rank is still being calculated.</span>
                        ) : loadingLeaderboard ? (
                          <span>Loading your rank...</span>
                        ) : (
                          <span>You're not ranked yet. Complete at least one interview to get your first ELO score.</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.leaderboard}>
                      {leaderboardData.map((user, index) => (
                        <div 
                          key={index} 
                          className={`
                            ${styles.leaderboardItem} 
                            ${user.name === userRanking.username ? styles.currentUserRank : ''}
                          `}
                        >
                          <div className={styles.leaderboardRank}>
                            {index === 0 ? <Trophy size={16} color="gold" /> : `#${user.rank}`}
                          </div>
                          <div className={styles.leaderboardUser}>
                            {user.name}
                            {user.name === userRanking.username && (
                              <span className={styles.youBadge}>You</span>
                            )}
                          </div>
                          <div className={styles.leaderboardScore}>
                            {user.elo}
                          </div>
                        </div>
                      ))}
                      
                      {/* 如果用户不在前5名，显示分隔线和用户排名 */}
                      {userRanking.rank > 5 && (
                        <>
                          <div className={styles.leaderboardDivider}>
                            <span>• • •</span>
                          </div>
                          
                          <div className={`${styles.leaderboardItem} ${styles.currentUserRank}`}>
                            <div className={styles.leaderboardRank}>
                              #{userRanking.rank}
                            </div>
                            <div className={styles.leaderboardUser}>
                              {userRanking.username}
                              <span className={styles.youBadge}>You</span>
                            </div>
                            <div className={styles.leaderboardScore}>
                              {userRanking.score}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Actions and Stats */}
            <div>
              <div className={styles.actionCards}>
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <Play size={24} color="#ec4899" />
                  </div>
                  <h3>Start Interview</h3>
                  <p className={styles.actionDescription}>
                    Start With Customized Configuration
                  </p>
                  <div className={styles.buttonContainer}>
                    <button 
                      className={`${styles.button} ${styles.buttonPrimary}`} 
                      onClick={() => navigate('/prompts')}
                    >
                      Start Now
                    </button>
                  </div>
                </div>

                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <FileText size={24} color="#ec4899" />
                  </div>
                  <h3>History</h3>
                  <p className={styles.actionDescription}>
                    View your past interview sessions
                  </p>
                  <div className={styles.buttonContainer}>
                    <button 
                      className={`${styles.button} ${styles.buttonPrimary}`} 
                      onClick={() => navigate('/interview/history')}
                    >
                      View
                    </button>
                  </div>
                </div>
                
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <BookOpen size={24} color="#ec4899" />
                  </div>
                  <h3>Flashcards</h3>
                  <p className={styles.actionDescription}>
                    Practice with interview flashcards
                  </p>
                  <div className={styles.buttonContainer}>
                    <button 
                      className={`${styles.button} ${styles.buttonPrimary}`} 
                      onClick={() => navigate('/flashcards')}
                    >
                      Study
                    </button>
                  </div>
                </div>
              </div>

              {/* Radar Chart with Button in the top-right corner */}
              <div className={styles.profileCard}>
                <div className={styles.performanceHeader}>
                  <h3>Performance Analysis</h3>
                  <button 
                    className={styles.linkStyle}
                    onClick={() => navigate('/graph')}
                  >
                    More Graphs
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={400}>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
