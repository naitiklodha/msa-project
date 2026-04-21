import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('fp_user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);
    const { accessToken } = data;
    const userInfo = { 
      email,
      id: JSON.parse(atob(accessToken.split('.')[1])).sub 
    };
    
    setToken(accessToken);
    setUser(userInfo);
    localStorage.setItem('fp_token', accessToken);
    localStorage.setItem('fp_user', JSON.stringify(userInfo));
    return data;
  };

  const register = async (email, password) => {
    const { data } = await authAPI.register(email, password);
    const { accessToken } = data;
    const userInfo = { 
      email,
      id: JSON.parse(atob(accessToken.split('.')[1])).sub 
    };
    
    setToken(accessToken);
    setUser(userInfo);
    localStorage.setItem('fp_token', accessToken);
    localStorage.setItem('fp_user', JSON.stringify(userInfo));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
