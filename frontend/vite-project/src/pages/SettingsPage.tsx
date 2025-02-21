import React, { useState, useRef } from 'react';
import { Bot, User, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  photoUrl?: string;
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Sarah Johnson',
    title: 'Senior Software Engineer',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 123-4567',
    skills: ['React', 'TypeScript', 'Node.js', 'Python'],
    about: 'A full stack developer with 5+ years of experience',
    linkedin: 'https://linkedin.com/in/sarah',
    github: 'https://github.com/sarah',
    portfolio: 'https://sarah.dev',
    photoUrl: undefined
  });

  const handleSave = async () => {
    try {
      // TODO: API call to save profile
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File is too large. Maximum size is 2MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setProfile(prev => ({ ...prev, photoUrl: previewUrl }));
  };

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
              {profile.photoUrl ? (
                <img 
                  src={profile.photoUrl} 
                  alt="Profile" 
                  className={styles.avatarImage}
                />
              ) : (
                <User size={48} color="#ec4899" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
            >
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