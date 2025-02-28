import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');
    
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
    }
  }, []);

  const login = (email: string, token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_email', email);
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
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