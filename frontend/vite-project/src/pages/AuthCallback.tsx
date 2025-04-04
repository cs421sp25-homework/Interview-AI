import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AuthCallback.module.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    try {
      // We wrap all logic in a try/catch to catch unexpected issues:
      console.log('Search params', searchParams);

      const error = searchParams.get('error');
      const email = searchParams.get('email');
      const isNewUser = 
        searchParams.get('is_new_user') === 'True' ||
        searchParams.get('is_new_user') === 'true';

      // 1) Check for error param from the OAuth callback
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

      // 2) Check for the presence of `email`
      if (email) {
        try {
          // Using localStorage can throw errors in some environments (e.g. private mode).
          localStorage.setItem('user_email', email);
        } catch (storageError) {
          console.error('Failed to set user_email in localStorage:', storageError);
          // Fallback or ignore; depends on your needs
        }

        // 3) Handle new user vs existing user
        if (isNewUser) {
          navigate('/signup-oauth');
        } else {
          navigate('/dashboard');
        }
        return;
      } else {
        // If no email found at all, treat it as an error
        console.error('No email found in URL');
        navigate('/login', {
          state: { error: 'No authentication token received. Please try again.' }
        });
      }
    } catch (err) {
      // Catch any unexpected errors
      console.error('Unexpected error in AuthCallback:', err);
      navigate('/login', {
        state: { error: 'An unexpected error occurred. Please try again.' }
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
