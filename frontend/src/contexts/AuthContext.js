import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  const getToken = () => localStorage.getItem('access_token');
  const getRefreshToken = () => localStorage.getItem('refresh_token');

  const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('original_admin_token');
  };

  const api = axios.create({
    baseURL: API,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(`${API}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            
            const { access_token, refresh_token } = response.data;
            setTokens(access_token, refresh_token);
            
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          } catch (refreshError) {
            clearTokens();
            setUser(null);
            setBusiness(null);
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setBusiness(response.data.business);
      setImpersonating(response.data.impersonating || false);
    } catch (error) {
      clearTokens();
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: userData } = response.data;
    
    setTokens(access_token, refresh_token);
    setUser(userData);
    
    // Fetch full user info including business
    await fetchUser();
    
    return userData;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setBusiness(null);
    setImpersonating(false);
    window.location.href = '/login';
  };

  const checkSubscription = async () => {
    try {
      const response = await api.get('/auth/check-subscription');
      return response.data;
    } catch (error) {
      return { is_valid: false, status: 'error' };
    }
  };

  const startImpersonation = async (businessId) => {
    try {
      const response = await api.post(`/super-admin/businesses/${businessId}/impersonate`);
      const { access_token, original_admin_token } = response.data;
      
      localStorage.setItem('original_admin_token', original_admin_token);
      localStorage.setItem('access_token', access_token);
      
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Impersonation failed:', error);
      return false;
    }
  };

  const endImpersonation = async () => {
    try {
      const response = await api.post('/super-admin/end-impersonation');
      const { access_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.removeItem('original_admin_token');
      
      await fetchUser();
      return true;
    } catch (error) {
      console.error('End impersonation failed:', error);
      return false;
    }
  };

  const value = {
    user,
    business,
    loading,
    impersonating,
    api,
    login,
    logout,
    checkSubscription,
    startImpersonation,
    endImpersonation,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
