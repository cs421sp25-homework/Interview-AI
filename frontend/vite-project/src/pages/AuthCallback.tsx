import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('Search params', searchParams);
    const error = searchParams.get('error');
    const email = searchParams.get('email');
    const isNewUser = searchParams.get('is_new_user') === 'True';

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
      if (isNewUser) {  
        localStorage.setItem('user_email', email);
        navigate(`/signup-oauth`);
      } else {
        localStorage.setItem('user_email', email);
        navigate('/dashboard');
      }
      return;
    } else {
      console.error('No email found in URL');
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