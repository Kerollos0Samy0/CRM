import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const { login, users } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setError('');
    setPassword('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const success = login(selectedUser.id, password);
    if (success) {
      navigate('/');
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '40px', width: '100%', maxWidth: '500px', textAlign: 'center', position: 'relative' }}
      >
        <AnimatePresence mode="wait">
          {!selectedUser ? (
            <motion.div
              key="user-select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  background: 'var(--accent-primary)', margin: '0 auto 16px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
                }}>
                  <LogIn size={32} color="white" />
                </div>
                <h1 className="heading-lg" style={{ marginBottom: '8px' }}>مرحباً بك في الحكاية</h1>
                <p className="text-body">من فضلك اختر حسابك للدخول إلى النظام</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {users.map((user, index) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleUserSelect(user)}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 24px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: 'white',
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      gap: '16px'
                    }}
                    whileHover={{ 
                      scale: 1.02, 
                      backgroundColor: user.bgColor,
                      borderColor: user.color 
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div style={{ 
                      width: '16px', height: '16px', 
                      borderRadius: '50%', backgroundColor: user.color,
                      boxShadow: `0 0 10px ${user.color}`
                    }} />
                    {user.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="password-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <button 
                onClick={() => setSelectedUser(null)}
                style={{ 
                  position: 'absolute', top: '24px', right: '24px', 
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ArrowRight size={20} />
                رجوع
              </button>

              <div style={{ marginBottom: '32px', marginTop: '20px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  background: selectedUser.color, margin: '0 auto 16px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  boxShadow: `0 0 20px ${selectedUser.color}80`
                }}>
                  <Lock size={32} color="white" />
                </div>
                <h1 className="heading-md" style={{ marginBottom: '8px' }}>مرحباً {selectedUser.name}</h1>
                <p className="text-body">يرجى إدخال كلمة المرور للمتابعة</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="كلمة المرور"
                  autoFocus
                  style={{ textAlign: 'center', letterSpacing: '0.2em' }}
                />
                
                {error && <div style={{ color: 'var(--color-marina)', fontSize: '0.9rem' }}>{error}</div>}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  دخول
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;
