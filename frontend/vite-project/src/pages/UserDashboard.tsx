import React, { useState, useEffect } from 'react';
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

const UserDashboard = () => {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();

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

  // Error state for display if any API call fails
  const [error, setError] = useState('');
  
  // Track if we're loading the interview count
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setError(''); // reset error before each fetch

        // If we have userEmail from context, otherwise fallback to localStorage
        const currentEmail = userEmail || localStorage.getItem('user_email');
        if (!currentEmail) {
          // If absolutely no email is found, force login
          navigate('/login');
          return;
        }

        console.log('Fetching profile for email:', currentEmail);
        const response = await axios.get(`${API_BASE_URL}/api/profile/${currentEmail}`);

        if (response.data.data) {
          const profile = response.data.data;

          // Save photo in local storage if desired
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

          // Create initial user data with profile info
          const initialUserData = {
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            email: profile.email,
            interviews: profile.interviews_completed || 0, // Initial count from profile
            joined: joinedDate,
            photoUrl: profile.photo_url || null
          };
          
          setUserData(initialUserData);

          // Fetch user's interview scores after we have an ID or email
          const userId = profile.id || profile.email;
          fetchUserScores(userId);
          
          // Fetch actual interview count
          fetchInterviewCount(initialUserData.email);
        } else {
          // If data is null or missing, show an error
          setError('Profile data not found. Please complete your profile or contact support.');
        }
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        if (err.response) {
          const { status, data } = err.response;
          if (status === 401) {
            // Unauthorized -> force re-login
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
          // Possibly a network error
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

    fetchUserProfile();
  }, [userEmail, navigate, logout]);

  // Static leaderboard data
  const leaderboardData = [
    { username: "SophieCoder", score: 98 },
    { username: "AlexTechGuru", score: 95 },
    { username: "MikeDevMaster", score: 92 },
    { username: "EmilyJavaPro", score: 89 },
    { username: "RyanFullStack", score: 85 }
  ];

  // Static user ranking data
  const userRanking = {
    rank: 8,
    username: userData.name || "You",
    score: 82
  };

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
                <h3 style={{ marginBottom: '1rem' }}>Leaderboard</h3>
                <div className={styles.leaderboard}>
                  {leaderboardData.map((user, index) => (
                    <div key={index} className={styles.leaderboardItem}>
                      <div className={styles.leaderboardRank}>
                        {index === 0 ? <Trophy size={16} color="gold" /> : `#${index + 1}`}
                      </div>
                      <div className={styles.leaderboardUser}>
                        {user.username}
                      </div>
                      <div className={styles.leaderboardScore}>
                        {user.score}
                      </div>
                    </div>
                  ))}
                  
                  {/* Divider between top users and current user */}
                  <div className={styles.leaderboardDivider}>
                    <span>• • •</span>
                  </div>
                  
                  {/* Current user ranking */}
                  <div className={`${styles.leaderboardItem} ${styles.currentUserRank}`}>
                    <div className={styles.leaderboardRank}>
                      #{userRanking.rank}
                    </div>
                    <div className={styles.leaderboardUser}>
                      {userRanking.username}
                    </div>
                    <div className={styles.leaderboardScore}>
                      {userRanking.score}
                    </div>
                  </div>
                </div>
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
