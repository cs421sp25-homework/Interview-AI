import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Play, 
  FileText,
  Award,
  Star,
  Settings,
  LogOut
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
import styles from './UserDashboard.module.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();
  const [userData, setUserData] = useState({
    name: '',
    title: '',
    email: '',
    interviews: 0,
    resumeReviews: 0,
    joined: '',
    photoUrl: null as string | null
  });
  
  // Add state for skill stats
  const [skillStats, setSkillStats] = useState([
    { subject: 'Technical Skills', A: 0 },
    { subject: 'Communication', A: 0 },
    { subject: 'Problem Solving', A: 0 },
    { subject: 'Leadership', A: 0 },
    { subject: 'Resume Strength', A: 0 },
    { subject: 'Confidence', A: 0 }
  ]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching profile for email:", userEmail);
        const email = localStorage.getItem('user_email') || 'test@example.com';

        const response = await axios.get(`${API_BASE_URL}/api/profile/${email}`);
        
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
                
                joinedDate = `${createdAtUTC.toLocaleString('en-US', options)} `;
              } else {
                joinedDate = 'Invalid date';
              }
            } else {
              joinedDate = 'Not available';
            }
          } catch (error) {
            console.error("Error parsing date:", error);
            joinedDate = 'Date error';
          }
          
          setUserData({
            name: `${profile.first_name} ${profile.last_name}`,
            title: profile.job_title || '',
            email: profile.email,
            interviews: profile.interviews_completed || 0,
            resumeReviews: profile.resume_reviews || 0,
            joined: joinedDate,
            photoUrl: profile.photo_url || null
          });
          
          // Fetch user's interview scores
          fetchUserScores(profile.id || email);
        }
      } catch (error) {
        navigate('/login');
      }
    };

    fetchUserProfile();
  }, [userEmail, navigate]);
  
  // Add function to fetch user scores
  const fetchUserScores = async (userId: string) => {
    try {
      console.log("Fetching scores for user:", userId);
      // Use the email-specific endpoint if the userId looks like an email
      const endpoint = userId.includes('@') 
        ? `${API_BASE_URL}/api/overall_scores/email/${userId}`
        : `${API_BASE_URL}/api/overall_scores/${userId}`;
      
      const response = await axios.get(endpoint);
      
      if (response.data && response.data.scores) {
        const scores = response.data.scores;
        
        // Update skill stats with actual scores
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
      console.error("Error fetching user scores:", error);
      // Keep default values if there's an error
    }
  };

  const achievements = [
    'Technical Expert',
    'Communication Pro',
    'Quick Learner'
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div>
        {/* Navigation */}
        <nav className={styles.nav}>
          <div className={styles.container + ' ' + styles.navContent}>
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
                <h2>{userData.name}</h2>
                <p style={{ color: 'var(--text-light)' }}>{userData.title}</p>
              </div>

              <div className={styles.profileStats}>
                <div className={styles.statItem}>
                  <span>Interviews Completed</span>
                  <span>{userData.interviews}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Resume Reviews</span>
                  <span>{userData.resumeReviews}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Member Since</span>
                  <span>{userData.joined}</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Achievements</h3>
                <div className={styles.achievements}>
                  {achievements.map((achievement, index) => (
                    <div key={index} className={styles.badge}>
                      <Award size={16} />
                      {achievement}
                    </div>
                  ))}
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
                  <button className={styles.button + ' ' + styles.buttonPrimary} onClick={() => navigate('/prompts')}>
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
                  <button className={styles.button + ' ' + styles.buttonPrimary} onClick={() => navigate('/interview/history')}>
                    View
                  </button>
                </div>
              </div>

              {/* Radar Chart */}
              <div className={styles.profileCard}>
                <h3 style={{ marginBottom: '1.5rem' }}>Performance Analysis</h3>
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