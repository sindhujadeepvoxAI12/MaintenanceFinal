import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginApi, logoutApi } from '../services/authService';
import { clearAuthStorage, getAccessToken, getUser as getStoredUser, saveUser as saveStoredUser } from '../services/storage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAccessToken();
      const existingUser = await getStoredUser();
      if (token && existingUser) {
        setUser(existingUser);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await loginApi({ email, password, site: 'user' });
      if (data?.user) {
        setUser(data.user);
        await saveStoredUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error?.message || error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await clearAuthStorage();
      await logoutApi().catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
