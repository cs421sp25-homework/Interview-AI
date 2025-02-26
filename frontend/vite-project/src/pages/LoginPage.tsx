import React, { useState, useEffect } from 'react';
import { Bot, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if redirected from OAuth with token
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('authToken', token);
      navigate('/dashboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5001/api/auth/login',
        { email, password },
      );

      if (response.status === 200) {
        const { token, username } = response.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('username', username); 
        console.log('Login successful');
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Invalid email or password. Please try again.');
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `http://localhost:5001/api/oauth/${provider}`;
  };

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo} onClick={() => navigate('/')}>
            <Bot className={styles.logoIcon} />
            <span className={styles.logoText}>InterviewAI</span>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Login to Your Account</h1>
          <p>Access your interview practice portal</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password</label>
            <input
              type="password"
              className={styles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className={styles.buttonPrimary}>
            <LogIn size={18} /> Login
          </button>

          <div className={styles.oauthContainer}>
            <p className={styles.orText}>Or continue with</p>
            <div className={styles.oauthButtons}>
              <button className={styles.oauthButton} onClick={() => handleOAuthLogin('google')}>
                <img src="/google.svg" alt="Google" className={styles.oauthIcon} /> Google
              </button>
              <button className={styles.oauthButton} onClick={() => handleOAuthLogin('github')}>
                <img src="/github.svg" alt="Github" className={styles.oauthIcon} /> GitHub
              </button>
            </div>
          </div>

          <p className={styles.signupLink}>
            Don't have an account? <span onClick={() => navigate('/signup')}>Sign Up</span>
          </p>
        </form>
      </main>

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;