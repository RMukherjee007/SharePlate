/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const parseJwtPayload = (jwtToken) => {
  const base64Url = jwtToken.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  const payload = JSON.parse(jsonPayload);
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }
  return payload;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      try {
        return parseJwtPayload(savedToken);
      } catch (_e) {
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (token) {
      try {
        const payload = parseJwtPayload(token);
        setUser(payload);
        localStorage.setItem('token', token);

        // Sync live profile (e.g., is_verified status after admin approval, address, base_city)
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.user) {
              setUser(prev => prev ? { ...prev, ...data.user } : data.user);
            }
          })
          .catch(() => {});
      } catch (_e) {
        logout();
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return data.user;
    } else {
      const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Login failed');
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
