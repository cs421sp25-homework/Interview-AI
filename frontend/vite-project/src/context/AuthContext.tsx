import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  userEmail: string | null;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => Promise<void>;
  setClerkEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('user_email'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('isAuthenticated'));

  const login = (email: string) => {
    localStorage.setItem('user_email', email);
    localStorage.setItem('isAuthenticated', 'true');
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('has_completed_signup');
    localStorage.removeItem('user_photo_url');
    localStorage.removeItem('current_config');
    localStorage.removeItem('current_config_id');
    setUserEmail(null);
    setIsAuthenticated(false);
    
    return Promise.resolve();
  };

  const setClerkEmail = (email: string | null) => {
    if (email) {
      localStorage.setItem('user_email', email);
      localStorage.setItem('isAuthenticated', 'true');
      setUserEmail(email);
      setIsAuthenticated(true);
    }
  };

  return (
    <AuthContext.Provider value={{ userEmail, isAuthenticated, login, logout, setClerkEmail }}>
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