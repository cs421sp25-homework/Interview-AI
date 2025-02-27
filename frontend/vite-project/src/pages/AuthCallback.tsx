import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const token = searchParams.get('access_token');

    if (error) {
      console.error('Auth Error:', error);
      navigate('/login', { 
        state: { 
          error: 'Authentication failed. Please try again.' 
        }
      });
      return;
    }

    if (token) {
      // Store the token
      localStorage.setItem('auth_token', token);
      navigate('/dashboard');
    } else {
      navigate('/login');
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