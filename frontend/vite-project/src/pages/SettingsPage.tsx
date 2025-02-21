import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './SettingsPage.module.css';

interface UserProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  skills: string[];
  about: string;
  linkedin: string;
  github: string;
  portfolio: string;
  photoUrl: string | undefined;
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    title: '',
    email: '',
    phone: '',
    skills: [],
    about: '',
    linkedin: '',
    github: '',
    portfolio: '',
    photoUrl: undefined
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // TODO: Get email from auth context/state
        const email = 'sarah.johnson@example.com'; // Replace with actual user email
        const response = await axios.get(`http://localhost:5001/api/profile/${email}`);
        
        if (response.data.data) {
          setProfile(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      // TODO: Get email from auth context/state
      const email = 'sarah.johnson@example.com'; // Replace with actual user email
      await axios.put(`http://localhost:5001/api/profile/${email}`, profile);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile changes');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Bot size={32} color="#ec4899" />
            <span>InterviewAI</span>
          </div>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Profile Settings</h1>
          <p>Manage your profile information</p>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              <User size={48} color="#ec4899" />
            </div>
            <button className={styles.uploadButton}>
              Change Photo
            </button>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Job Title</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>About</label>
              <textarea
                value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                className={styles.textarea}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                value={profile.skills.join(', ')}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()) })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>LinkedIn URL</label>
              <input
                type="url"
                value={profile.linkedin}
                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>GitHub URL</label>
              <input
                type="url"
                value={profile.github}
                onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Portfolio URL</label>
              <input
                type="url"
                value={profile.portfolio}
                onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
                className={styles.input}
              />
            </div>

            <button className={styles.saveButton} onClick={handleSave}>
              <Save size={20} />
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage; 