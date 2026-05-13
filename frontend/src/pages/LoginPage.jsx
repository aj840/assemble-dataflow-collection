import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('user');
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form);
      // Role check
      if (tab === 'admin' && data.user.role !== 'admin') {
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }
      login(data.user, remember);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 10 }}>
        <div className="navbar-logo" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>◇</div>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>UltraHuman Assembly</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 8, color: '#ffffff' }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Please enter your details to access your dashboard</p>
          </div>

          {/* Card */}
          <div style={{ padding: 32, background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            {/* Tab toggle */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 4, marginBottom: 28, border: '1px solid rgba(255,255,255,0.05)' }}>
              {['user', 'admin'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', borderRadius: 6,
                    background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: tab === t ? '#ffffff' : '#9ca3af',
                    fontWeight: tab === t ? 600 : 500,
                    fontSize: 13.5,
                    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <GlassIcon name={t === 'user' ? 'users' : 'security'} size={16} color={tab === t ? '#60a5fa' : '#6b7280'} />
                  {t === 'user' ? 'User Login' : 'Admin Login'}
                </button>
              ))}
            </div>

            {/* Title */}
            <h3 style={{ marginBottom: 4, color: '#ffffff' }}>{tab === 'admin' ? 'Administrator Authentication' : 'Staff Authentication'}</h3>
            <p style={{ marginBottom: 24, fontSize: 13, color: '#9ca3af' }}>
              {tab === 'admin' ? 'Sign in with admin credentials to manage the system.' : 'Sign in to manage production plans and technical SKUs.'}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ color: '#d1d5db', fontSize: 13, marginBottom: 6, display: 'block', fontWeight: 500 }}>Employee ID</label>
                <input
                  id="employeeId"
                  type="text"
                  placeholder="EMP-00000"
                  value={form.employeeId}
                  onChange={e => setForm({ ...form, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                  required
                />
              </div>

              {error && <div className="alert alert-danger" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', padding: '10px 12px', background: 'rgba(220, 38, 38, 0.1)', borderLeft: '3px solid #dc2626', fontSize: 13, borderRadius: 4 }}><GlassIcon name="alert" size={16} /> {error}</div>}
              
              <div className="form-group" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ margin: 0, color: '#d1d5db', fontSize: 13, fontWeight: 500 }}>Password</label>
                  <span style={{ color: '#60a5fa', fontSize: 13, cursor: 'pointer' }}>Forgot password?</span>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox" id="remember" checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer', accentColor: '#60a5fa' }}
                />
                <label htmlFor="remember" style={{ margin: 0, fontSize: 13.5, cursor: 'pointer', color: '#9ca3af' }}>
                  Remember me for 30 days
                </label>
              </div>

              {error && (
                <div style={{ padding: '10px 12px', background: 'rgba(220, 38, 38, 0.1)', borderLeft: '3px solid #dc2626', color: '#fca5a5', fontSize: 13, borderRadius: 4, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GlassIcon name="alert" size={16} /> {error}
                </div>
              )}

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign In →'}
              </button>
            </form>

            {/* Footer info */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}><GlassIcon name="alert" size={14} color="#9ca3af" /> Need assistance? <span style={{ color: '#60a5fa', cursor: 'pointer' }}>Contact IT Support</span></span>
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: '#d1d5db' }}>v1.0.0-LOCAL</span>
            </div>
          </div>

          {/* Bottom badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280', letterSpacing: '0.05em' }}><GlassIcon name="shield" size={14} color="#6b7280" /> 256-BIT ENCRYPTION</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280', letterSpacing: '0.05em' }}><GlassIcon name="success" size={14} color="#16a34a" /> ISO 27001 CERTIFIED</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', background: 'white' }}>
        <span className="text-sm text-muted">© 2026 UltraHuman Assembly Inc. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy Policy', 'Terms of Service', 'Support'].map(l => (
            <span key={l} className="text-sm text-muted" style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
