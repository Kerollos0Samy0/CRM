import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, CheckSquare, Package, PieChart, Wallet, Archive, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-container">
      {/* Header Navigation */}
      <header className="glass-panel" style={{ 
        margin: '24px 24px 0', 
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="heading-md">الحكاية CRM</h1>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: currentUser.color,
                boxShadow: `0 0 10px ${currentUser.color}`
              }} />
              <span className="text-body" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser.name}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button 
              className="btn"
              onClick={() => navigate('/')}
              style={{ 
                padding: '8px 16px', fontSize: '0.9rem',
                background: location.pathname === '/' ? 'var(--bg-glass-hover)' : 'transparent',
                color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <LayoutDashboard size={18} />
              الأوردرات
            </button>
            <button 
              className="btn"
              onClick={() => navigate('/tasks')}
              style={{ 
                padding: '8px 16px', fontSize: '0.9rem',
                background: location.pathname === '/tasks' ? 'var(--bg-glass-hover)' : 'transparent',
                color: location.pathname === '/tasks' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <CheckSquare size={18} />
              المهام
            </button>
            <button 
              className="btn"
              onClick={() => navigate('/inventory')}
              style={{ 
                padding: '8px 16px', fontSize: '0.9rem',
                background: location.pathname === '/inventory' ? 'var(--bg-glass-hover)' : 'transparent',
                color: location.pathname === '/inventory' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <Package size={18} />
              المخزن
            </button>
            <button 
              className="btn"
              onClick={() => navigate('/clients')}
              style={{ 
                padding: '8px 16px', fontSize: '0.9rem',
                background: location.pathname === '/clients' ? 'var(--bg-glass-hover)' : 'transparent',
                color: location.pathname === '/clients' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <Users size={18} />
              العملاء
            </button>
            {(currentUser.id === 'kirolos' || currentUser.id === 'marina' || currentUser.id === 'abouna') && (
              <>
                <button 
                  className="btn"
                  onClick={() => navigate('/analytics')}
                  style={{ 
                    padding: '8px 16px', fontSize: '0.9rem',
                    background: location.pathname === '/analytics' ? 'var(--bg-glass-hover)' : 'transparent',
                    color: location.pathname === '/analytics' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <PieChart size={18} />
                  الإحصائيات
                </button>
                <button 
                  className="btn"
                  onClick={() => navigate('/ledger')}
                  style={{ 
                    padding: '8px 16px', fontSize: '0.9rem',
                    background: location.pathname === '/ledger' ? 'var(--bg-glass-hover)' : 'transparent',
                    color: location.pathname === '/ledger' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <Wallet size={18} />
                  الحسابات
                </button>
                <button 
                  className="btn"
                  onClick={() => navigate('/archive')}
                  style={{ 
                    padding: '8px 16px', fontSize: '0.9rem',
                    background: location.pathname === '/archive' ? 'var(--bg-glass-hover)' : 'transparent',
                    color: location.pathname === '/archive' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <Archive size={18} />
                  الأرشيف
                </button>
              </>
            )}
          </div>
        </div>

        <button className="btn btn-secondary" onClick={logout} style={{ padding: '8px 16px' }}>
          <LogOut size={18} />
          خروج
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
