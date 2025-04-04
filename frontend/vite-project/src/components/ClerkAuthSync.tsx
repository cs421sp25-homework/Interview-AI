import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';

export const ClerkAuthSync = () => {
  const { user, isSignedIn } = useUser();
  const { setClerkEmail } = useAuth();

  useEffect(() => {
    const syncUserData = async () => {
      if (isSignedIn && user?.primaryEmailAddress) {
        const clerkEmail = user.primaryEmailAddress.emailAddress;
        
        try {
          // Check if user exists in Supabase
          const response = await axios.get(`${API_BASE_URL}/api/profile/${clerkEmail}`);
          
          if (response.data && response.data.data) {
            // User exists in Supabase, set email
            setClerkEmail(clerkEmail);
            localStorage.setItem('has_completed_signup', 'true');
          } else {
            // User doesn't exist in Supabase
            setClerkEmail(clerkEmail);
            localStorage.setItem('has_completed_signup', 'false');
          }
        } catch (error) {
          // Error or user not found
          console.log('User not found in database or error occurred:', error);
          setClerkEmail(clerkEmail);
          localStorage.setItem('has_completed_signup', 'false');
        }
      }
    };

    syncUserData();
  }, [isSignedIn, user, setClerkEmail]);

  return null; // This component doesn't render anything
}; 