import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    // Get access token from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const email = params.get('email');
    
    console.log('Hash:', hash);
    console.log('Access token:', access_token);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    console.log('Email', email)

    if (error) {
      console.error('Auth Error:', error);
      const errorDescription = searchParams.get('error_description');
      navigate('/login', { 
        state: { 
          error: 'Authentication failed: ' + 
          (errorDescription?.replace(/\+/g, ' ') || 'Please try again.')
        }
      });
      return;
    }
    if (access_token) {
      console.log("hi")
      // Store tokens
      localStorage.setItem('auth_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      // Store email
      if (email) {
        localStorage.setItem('user_email', email);
      }
      console.log("hi")
      // Navigate to dashboard
      navigate('/dashboard');
      return;
    } else {
      console.error('No access token found in URL');
      navigate('/login', {
        state: { error: 'No authentication token received. Please try again.' }
      });
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.loader}>
        <p>Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 