import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Play, 
  FileText,
  Trophy,
  Star,
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
  const [debug, setDebug] = useState(false);

  const logInfo = (message: string, data: any = null) => {
    if (debug) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  };

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
          // 未找到邮箱，重定向到登录页
          navigate('/login');
          return;
        }

        // 保存用户邮箱以供后续使用
        userIdentifierRef.current.email = currentEmail;
        logInfo('User email set:', currentEmail);

        // 获取用户资料
        const response = await axios.get(`${API_BASE_URL}/api/profile/${currentEmail}`);
        logInfo('Profile API response:', response.data);

        if (response.data.data) {
          const profile = response.data.data;

          // 保存照片URL
          if (profile.photo_url) {
            localStorage.setItem('user_photo_url', profile.photo_url);
          }

          // 处理加入日期
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

          // 保存用户名供后续使用
          const fullName = `${profile.first_name} ${profile.last_name}`.trim();
          userIdentifierRef.current.name = fullName;
          logInfo('User name set:', fullName);

          // 创建用户资料对象
          const initialUserData = {
            name: fullName,
            email: profile.email,
            interviews: profile.interviews_completed || 0,
            joined: joinedDate,
            photoUrl: profile.photo_url || null
          };
          
          setUserData(initialUserData);
          logInfo('User data set:', initialUserData);

          // 获取用户技能评分
          const userId = profile.id || profile.email;
          fetchUserScores(userId);
          
          // 获取面试次数
          fetchInterviewCount(initialUserData.email);
          
          // 获取排行榜数据
          // 移到最后确保用户标识符已经设置好
          fetchLeaderboard();
        } else {
          // 数据为空，显示错误
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
          // 可能是网络错误
          setError('Network error. Please check your connection or try again later.');
        }
      }
    };

    // Helper function to fetch user scores
    const fetchUserScores = async (userId: string) => {
      try {
        console.log('Fetching scores for user:', userId);
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
        } else {
          // If user has no scores yet, they remain at 0
          console.log('No scores found for user.');
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

    // 独立的排行榜获取函数
    const fetchLeaderboard = async () => {
      try {
        logInfo('Starting leaderboard fetch');
        setLoadingLeaderboard(true);
        setLeaderboardError('');
        
        // 获取排行榜数据
        const response = await axios.get('http://localhost:5001/api/elo/leaderboard?limit=10');
        logInfo('Leaderboard API response:', response.data);
        
        if (response.data && response.data.success && response.data.data) {
          // 格式化排行榜数据
          const formattedData = response.data.data.map((item: any) => ({
            rank: item.rank || 0,
            name: item.name || '',
            elo: item.eloscore || 0,
            email: item.email || ''
          }));
          
          logInfo('Formatted leaderboard data:', formattedData);
          
          // 只取前5名显示
          const top5Data = formattedData.slice(0, 5);
          setLeaderboardData(top5Data);
          
          // 尝试在完整排行榜(10名)中查找当前用户
          const userEmail = userIdentifierRef.current.email;
          const userName = userIdentifierRef.current.name;
          
          logInfo('Searching for user in full leaderboard with:', { userEmail, userName });
          
          // 首先尝试通过邮箱匹配
          let userInLeaderboard = formattedData.find((item: LeaderboardItem) => 
            item.email && item.email.toLowerCase() === userEmail.toLowerCase()
          );
          
          // 如果邮箱没找到，尝试通过名字匹配
          if (!userInLeaderboard) {
            userInLeaderboard = formattedData.find((item: LeaderboardItem) => 
              item.name && item.name.toLowerCase() === userName.toLowerCase()
            );
          }
          
          // 如果在排行榜中找到用户
          if (userInLeaderboard) {
            logInfo('User found in leaderboard:', userInLeaderboard);
            
            // 使用排行榜中的数据设置用户排名
            setUserRanking({
              rank: userInLeaderboard.rank,
              username: userInLeaderboard.name,
              score: userInLeaderboard.elo
            });
          } else {
            // 用户不在前10名，获取单独的排名
            logInfo('User not in top 10, fetching separate rank data');
            await fetchUserRank();
          }
        } else {
          throw new Error('Invalid leaderboard data format from server');
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardError('Failed to load leaderboard data');
        
        // 回退到静态数据
        setLeaderboardData([
          { rank: 1, name: "SophieCoder", elo: 98 },
          { rank: 2, name: "AlexTechGuru", elo: 95 },
          { rank: 3, name: "MikeDevMaster", elo: 92 },
          { rank: 4, name: "EmilyJavaPro", elo: 89 },
          { rank: 5, name: "RyanFullStack", elo: 85 }
        ]);
        
        // 尝试单独获取用户排名
        try {
          await fetchUserRank();
        } catch (e) {
          // 如果用户排名也获取失败，设置默认排名
          logInfo('Using fallback user ranking');
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
    
    // 单独获取用户排名的函数
    const fetchUserRank = async () => {
      const email = userIdentifierRef.current.email;
      if (!email) {
        logInfo('No email available for user rank fetch');
        return;
      }
      
      try {
        logInfo('Fetching user rank for email:', email);
        const response = await axios.get(`http://localhost:5001/api/elo/user/${email}`);
        logInfo('User rank API response:', response.data);
        
        // 检查响应中是否有有效数据
        if (response.data && response.data.success && response.data.data) {
          const rankData = response.data.data;
          
          // 确保排名是有效值（大于0）
          if (rankData.rank && rankData.rank > 0) {
            logInfo('Valid rank found in API response:', rankData.rank);
            setUserRanking({
              rank: rankData.rank,
              username: rankData.name || userIdentifierRef.current.name || 'You',
              score: rankData.eloscore || 0
            });
          } else if (rankData.eloscore && rankData.eloscore > 0) {
            // 有分数但没有排名的情况，设置为排名中
            logInfo('User has ELO score but no rank, using default rank');
            setUserRanking({
              rank: 99, // 使用一个大数字表示"排名中"
              username: rankData.name || userIdentifierRef.current.name || 'You',
              score: rankData.eloscore
            });
          } else {
            // 用户存在但无分数和排名
            logInfo('User exists but has no valid ELO score or rank');
            setUserRanking({
              rank: -1,
              username: userIdentifierRef.current.name || 'You',
              score: 0
            });
          }
        } else {
          // API返回但没有有效数据
          logInfo('No valid user rank data returned');
          setUserRanking({
            rank: -1,
            username: userIdentifierRef.current.name || 'You',
            score: 0
          });
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
        // 在错误情况下不改变用户排名，保留之前的值
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
                    onClick={() => setDebug(!debug)} 
                    style={{ 
                      marginLeft: '8px', 
                      fontSize: '14px', 
                      color: debug ? '#ec4899' : '#e5e7eb',
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
                    {/* 添加排名提示信息 */}
                    <div className={styles.rankingInfo}>
                      <div className={styles.yourRank}>
                        <Trophy size={16} color="#ec4899" />
                        {debug && (
                          <button 
                            onClick={() => console.log({
                              userRanking,
                              leaderboardData,
                              userIdentifiers: userIdentifierRef.current
                            })}
                            style={{marginRight: '10px', fontSize: '10px'}}
                          >
                            Debug
                          </button>
                        )}
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
                  <p style={{ color: 'var(--text-light)', margin: '0.5rem 0' }}>
                    Start With Customized Configuration
                  </p>
                  <button 
                    className={`${styles.button} ${styles.buttonPrimary}`} 
                    onClick={() => navigate('/prompts')}
                  >
                    Start Now
                  </button>
                </div>

                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <FileText size={24} color="#ec4899" />
                  </div>
                  <h3>History</h3>
                  <p style={{ color: 'var(--text-light)', margin: '0.5rem 0' }}>
                    View your past interview sessions
                  </p>
                  <button 
                    className={`${styles.button} ${styles.buttonPrimary}`} 
                    onClick={() => navigate('/interview/history')}
                  >
                    View
                  </button>
                </div>
                
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <BookOpen size={24} color="#ec4899" />
                  </div>
                  <h3>Flashcards</h3>
                  <p style={{ color: 'var(--text-light)', margin: '0.5rem 0' }}>
                    Practice with interview flashcards
                  </p>
                  <button 
                    className={`${styles.button} ${styles.buttonPrimary}`} 
                    onClick={() => navigate('/flashcards')}
                  >
                    Study
                  </button>
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
