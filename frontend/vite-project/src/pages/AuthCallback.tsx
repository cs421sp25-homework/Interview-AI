import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const email = Object.fromEntries(searchParams.entries())['email'];

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
    if (email) {
      localStorage.setItem('user_email', email);
      
      //if (email in profiles table)
      navigate('/dashboard');
      //else 
      // navigate('/signup')
      return;
    } else {
      console.error('No email found in URL');
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