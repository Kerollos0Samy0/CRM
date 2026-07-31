import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const USERS = [
  { id: 'kirolos', name: 'كيرلس', password: '739218', color: '#334155', bgColor: '#f1f5f9' },
  { id: 'mira', name: 'ميرا', password: '482910', color: '#a855f7', bgColor: '#faf5ff' },
  { id: 'marina', name: 'مارينا', password: '810472', color: '#ef4444', bgColor: '#fef2f2' },
  { id: 'maryam', name: 'مريم', password: '593821', color: '#ec4899', bgColor: '#fdf2f8' },
  { id: 'sherry', name: 'شيري', password: '284719', color: '#22c55e', bgColor: '#f0fdf4' },
  { id: 'abouna', name: 'أبونا', password: '918374', color: '#eab308', bgColor: '#fefce8' }
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for saved user
    const savedUserId = localStorage.getItem('crm_user_id');
    if (savedUserId) {
      const user = USERS.find(u => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
      }
    }
    setLoading(false);
  }, []);

  const login = (userId, password) => {
    const user = USERS.find(u => u.id === userId);
    if (user && user.password === password) {
      setCurrentUser(user);
      localStorage.setItem('crm_user_id', user.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crm_user_id');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, users: USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
