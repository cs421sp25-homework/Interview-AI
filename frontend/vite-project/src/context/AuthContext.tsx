import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const email = localStorage.getItem('user_email');
    
    if (email) {
      setIsAuthenticated(true);
      setUserEmail(email);
    }
  }, []);

  const login = (email: string) => {
    localStorage.setItem('user_email', email);
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const logout = () => {
    // Clear all localStorage items
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_photo_url');
    localStorage.removeItem('current_config');
    localStorage.removeItem('current_config_id');
    
    // For complete cleanup, clear any other potential localStorage items
    // that might be added in the future
    localStorage.clear();
    
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};