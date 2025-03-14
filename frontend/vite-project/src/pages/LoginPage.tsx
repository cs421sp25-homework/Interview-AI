import React, { useState, useEffect } from 'react';
import { Bot, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import styles from './LoginPage.module.css';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    // Check if there's an error message in the location state (from redirect)
    if (location.state && location.state.error) {
      setError(location.state.error);
    }
  }, [location]);

  // Add email validation function
  const validateEmail = (email: string): { isValid: boolean; error: string } => {
    if (!email.includes('@')) {
      return { isValid: false, error: 'Please enter a valid email address.' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { isValid: true, error: '' };
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail) {
      const { error } = validateEmail(newEmail);
      setEmailError(error);
    } else {
      setEmailError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setError('');
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Don't trim passwords as spaces might be intentional
    
    // Validation
    if (!sanitizedEmail || !sanitizedPassword) {
      setError('Please enter both email and password.');
      return;
    }
    
    // Email format validation
    const { isValid, error: validationError } = validateEmail(sanitizedEmail);
    if (!isValid) {
      setEmailError(validationError);
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { 
        email: sanitizedEmail, 
        password: sanitizedPassword 
      });
      
      if (response.status === 200) {
        console.log('Login successful');
        login(sanitizedEmail);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.response?.data?.message === 'Invalid email format') {
        setEmailError('Invalid email format. Please check your email address.');
      } else if (error.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `${API_BASE_URL}/api/oauth/${provider}`;
  };

  // Add sanitization function
  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters and HTML tags
    return input.replace(/<[^>]*>?/gm, '').trim();
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

        <form onSubmit={handleLogin} className={styles.formCard}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              className={`${styles.formInput} ${emailError ? styles.inputError : ''}`}
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                if (email && !email.includes('@')) {
                  setEmailError('Please enter a valid email address.');
                }
              }}
              placeholder="Enter your email"
            />
            {emailError && <p className={styles.fieldError}>{emailError}</p>}
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
        </form>

        <div className={styles.oauthContainer}>
          <p className={styles.orText}>Or continue with</p>
          <div className={styles.oauthButtons}>
            <button 
              type="button"
              className={styles.oauthButton} 
              onClick={() => handleOAuthLogin('google')}
            >
              <img src="/google.svg" alt="Google" className={styles.oauthIcon} /> Google
            </button>
            {/* <button 
              type="button"
              className={styles.oauthButton} 
              onClick={() => handleOAuthLogin('github')}
            >
              <img src="/github.svg" alt="Github" className={styles.oauthIcon} /> GitHub
            </button> */}
          </div>
        </div>
        
        <div className={styles.signupContainer}>
          <p className={styles.signupLink}>
            Don't have an account? <span onClick={() => navigate('/signup')}>Sign Up</span>
          </p>
        </div>
      </main>

      <footer className={styles.footer}>
        © 2025 InterviewAI. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;
