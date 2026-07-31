import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const USERS = [
  { id: 'kirolos', name: 'كيرلس', password: '739218', color: 'var(--color-kirolos)', bgColor: 'var(--color-kirolos-light)' },
  { id: 'mira', name: 'ميرا', password: '482910', color: 'var(--color-mira)', bgColor: 'var(--color-mira-light)' },
  { id: 'marina', name: 'مارينا', password: '810472', color: 'var(--color-marina)', bgColor: 'var(--color-marina-light)' },
  { id: 'maryam', name: 'مريم', password: '593821', color: 'var(--color-maryam)', bgColor: 'var(--color-maryam-light)' },
  { id: 'sherry', name: 'شيري', password: '284719', color: 'var(--color-sherry)', bgColor: 'var(--color-sherry-light)' },
  { id: 'abouna', name: 'أبونا', password: '918374', color: 'var(--color-abouna)', bgColor: 'var(--color-abouna-light)' }
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
