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
    joined: ''
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching profile for email:", userEmail);
        const email = localStorage.getItem('user_email') || 'test@example.com';

        const response = await axios.get(`${API_BASE_URL}/api/profile/${email}`);

        if (response.data.data) {
          const profile = response.data.data;
          setUserData({
            name: `${profile.first_name} ${profile.last_name}`,
            title: profile.job_title || '',
            email: profile.email,
            interviews: profile.interviews_completed || 0,
            resumeReviews: profile.resume_reviews || 0,
            joined: new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })
          });
        }
      } catch (error) {
        navigate('/login');
      }
    };

    fetchUserProfile();
  }, [userEmail, navigate]);

  const skillStats = [
    { subject: 'Technical Skills', A: 85 },
    { subject: 'Communication', A: 92 },
    { subject: 'Problem Solving', A: 88 },
    { subject: 'Leadership', A: 78 },
    { subject: 'Resume Strength', A: 90 },
    { subject: 'Confidence', A: 82 }
  ];

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
              <Settings 
                size={24} 
                color="#4b5563" 
                style={{ cursor: 'pointer' }} 
                onClick={() => navigate('/settings')}
              />
              <LogOut 
                size={24} 
                color="#4b5563" 
                style={{ cursor: 'pointer' }} 
                onClick={handleLogout}
              />
            </div>
          </div>
        </nav>

        <div className={styles.container}>
          <div className={styles.profileGrid}>
            {/* Left Column - Profile Info */}
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatar}>
                  <User size={48} color="#ec4899" />
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
                    Customize and start your interview
                  </p>
                  <button className={styles.button + ' ' + styles.buttonPrimary} onClick={() => navigate('/prompts')}>
                    Start Now
                  </button>
                </div>

                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>
                    <FileText size={24} color="#ec4899" />
                  </div>
                  <h3>Start Now</h3>
                  <p style={{ color: 'var(--text-light)', margin: '0.5rem 0' }}>
                    Get expert analysis on your resume
                  </p>
                  <button className={styles.button + ' ' + styles.buttonPrimary}>
                    Upload Resume
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