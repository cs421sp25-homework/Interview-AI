import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';
import axios from 'axios';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    // Get access token from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token') || searchParams.get('access_token');
    const refresh_token = params.get('refresh_token');

    console.log('Hash:', hash);
    console.log('Access token:', access_token);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));

    if (error) {
      console.error('Auth Error:', error);
      navigate('/login', { 
        state: { error: 'Authentication failed. Please try again.' }
      });
      return;
    }

    if (access_token) {
      const handleAuth = async () => {
        try {
          // Store tokens
          localStorage.setItem('auth_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
          
          // Call backend to validate token and get user data
          const response = await axios.get('http://localhost:5001/api/auth/callback', {
            headers: {
              Authorization: `Bearer ${access_token}`
            }
          });
          
          if (response.data.user) {
            localStorage.setItem('user_email', response.data.user.email);
            localStorage.setItem('username', response.data.user.username);
            localStorage.setItem('user_id', response.data.user.id);
            navigate('/dashboard');
          } else {
            throw new Error('No user data received');
          }
        } catch (error: any) { // Type assertion for error
          console.error('Auth callback error:', error.response?.data || error.message || error);
          navigate('/login', {
            state: { error: 'Failed to complete authentication. Please try again.' }
          });
        }
      };

      handleAuth();
    } else {
      console.error('No access token found in URL');
      navigate('/login', {
        state: { error: 'No authentication token received. Please try again.' }
      });
    }
  }, [navigate, searchParams]);

  return (
    <div className={styles.container}>
      <div className={styles.loader}>
        <p>Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 