import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  userEmail: string | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => Promise<void>;
  setClerkEmail: (email: string | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setUserEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('user_email'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('isAuthenticated'));

  // Sync state with localStorage
  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('user_email', userEmail);
    } else {
      localStorage.removeItem('user_email');
    }
    
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
    }
  }, [userEmail, isAuthenticated]);

  const login = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    // The useEffect above will update localStorage
  };

  const logout = async () => {
    console.log("processing logout");
    // Clear all localStorage items
    localStorage.removeItem('user_email');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('has_completed_signup');
    localStorage.removeItem('user_photo_url');
    localStorage.removeItem('current_config');
    localStorage.removeItem('current_config_id');


    
    // Update state
    setUserEmail(null);
    setIsAuthenticated(false);

    console.log("localStorage items cleared");
    console.log("userEmail:", userEmail);
    console.log("isAuthenticated:", isAuthenticated);
    
    return Promise.resolve();
  };

  const setClerkEmail = (email: string | null) => {
    if (email) {
      setUserEmail(email);
      setIsAuthenticated(true);
      // The useEffect above will update localStorage
    }
  };

  return (
    <AuthContext.Provider value={{ 
      userEmail, 
      isAuthenticated, 
      login, 
      logout, 
      setClerkEmail,
      setIsAuthenticated,
      setUserEmail 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};