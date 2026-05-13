import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Force clear the old token so the user is logged out right now
    localStorage.removeItem('mfg_user');
    sessionStorage.removeItem('mfg_user');
    try { 
      return JSON.parse(localStorage.getItem('mfg_auth_session')) || JSON.parse(sessionStorage.getItem('mfg_auth_session')) || null; 
    } catch { 
      return null; 
    }
  });
  const [config, setConfig] = useState({ fixedBattery: '', fixedPCBA: '' });

  const login = (userData, remember = false) => {
    setUser(userData);
    if (remember) {
      localStorage.setItem('mfg_auth_session', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('mfg_auth_session', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mfg_auth_session');
    sessionStorage.removeItem('mfg_auth_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, config, setConfig }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
