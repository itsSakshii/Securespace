import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sn_token'));
  const [loading, setLoading] = useState(true);

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('sn_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('sn_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (data) => {
    const res = await axios.post('/api/auth/register', data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('sn_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sn_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;
  const isGuard = user?.role === 'GENERAL_GUARD' || user?.role === 'RAPID_GUARD';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, isGuard, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
