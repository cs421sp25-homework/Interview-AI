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
  
  // Track loading state to prevent multiple submissions
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    // Check if there's an error message from a redirect or other route
    if (location.state && location.state.error) {
      setError(location.state.error);
    }
    
    // Pre-fill email from localStorage if available
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [location]);

  // ----------------------------------------------------
  // Utility: Validate email format
  // ----------------------------------------------------
  const validateEmail = (email: string): { isValid: boolean; error: string } => {
    if (!email.includes('@')) {
      return { isValid: false, error: 'Please enter a valid email address.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address.' };
    }
    return { isValid: true, error: '' };
  };

  // ----------------------------------------------------
  // Utility: Sanitize input
  // ----------------------------------------------------
  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters and HTML tags
    return input.replace(/<[^>]*>?/gm, '').trim();
  };

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
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
    setError(''); 
    setEmailError('');
    
    // Prevent multiple submissions if already loading
    if (isLoading) return;

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // allow spaces in password

    // Basic required checks
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
      setIsLoading(true); // Start loading
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (response.status === 200) {
        // Successful login
        login(sanitizedEmail);
        
        // You can store email in localStorage if you want to remember next time
        localStorage.setItem('user_email', sanitizedEmail);
        
        navigate('/dashboard');
      } else {
        // Unexpected status code:
        setError('An unknown error occurred. Please try again.');
      }
    } catch (err: any) {
      console.error('Login failed:', err);

      // Check if we have a server response
      if (err.response) {
        // Handle known error responses
        const { status, data } = err.response;
        
        // 400: Usually means email not in the system or client-side error
        if (status === 400) {
          if (data.error?.includes("don't have an account")) {
            setError("No account found with that email. Please sign up.");
          } else {
            setError(data.error || 'Bad Request. Please check your credentials.');
          }
        }
        // 401: Unauthorized / Invalid password
        else if (status === 401) {
          setError('Invalid email or password. Please try again.');
        }
        // 500: Server error
        else if (status === 500) {
          setError('Internal server error. Please try again later.');
        }
        // Handle any other status code
        else {
          setError(data.error || 'An error occurred during login. Please try again.');
        }
      } else {
        // No response from server or request never left
        setError('Network error or server unreachable. Please check your connection.');
      }
    } finally {
      setIsLoading(false); // End loading
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // Navigate user to OAuth login endpoint
    window.location.href = `${API_BASE_URL}/api/oauth/${provider}`;
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
                if (email && !validateEmail(email).isValid) {
                  setEmailError('Please enter a valid email address.');
                }
              }}
              placeholder="Enter your email"
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : (
              <>
                <LogIn size={18} /> Login
              </>
            )}
          </button>
        </form>

        <div className={styles.oauthContainer}>
          <p className={styles.orText}>Or continue with</p>
          <div className={styles.oauthButtons}>
            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
            >
              <img src="/google.svg" alt="Google" className={styles.oauthIcon} />
              Google
            </button>
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
