import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);

  // Configure Axios Instance (memoized so we're not recreating on every render)
  const api = useMemo(() => {
    return axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // Stable logout so interceptors can reference it safely
  const logout = useCallback(async () => {
    try {
      const savedToken = localStorage.getItem('accessToken');
      if (savedToken) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
      }
    } catch (error) {
      console.error('Error reporting logout to server', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
    }
  }, []);

  // Attach interceptors once and clean up on unmount
  useEffect(() => {
    const reqId = api.interceptors.request.use(
      (config) => {
        const activeToken = localStorage.getItem('accessToken');
        if (activeToken) {
          config.headers.Authorization = `Bearer ${activeToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const resId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (!storedRefreshToken) {
              await logout();
              return Promise.reject(error);
            }

            const res = await axios.post('/api/auth/refresh', { refreshToken: storedRefreshToken });
            if (res.status === 200) {
              const { accessToken, refreshToken } = res.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);
              setToken(accessToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Refresh token expired or invalid', refreshError);
            await logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqId);
      api.interceptors.response.eject(resId);
    };
  }, [api, logout]);

  // Load User Details if token exists on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('accessToken');
      if (savedToken) {
        try {
          const res = await api.get('/auth/profile');
          setUser(res.data);
        } catch (error) {
          console.error('Failed to load user profile', error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token, api, logout]);

  // Login Handler
  const login = async (username, password, role) => {
    try {
      const res = await api.post('/auth/login', { username, password, role });
      const { accessToken, refreshToken, ...userData } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.',
      };
    }
  };

  

  // Update Profile Details
  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      setUser(res.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed.',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateProfile, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
