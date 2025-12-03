import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  username: string;
  role: string;
  name: string;
  loginTime: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthUser();
  }, []);

  const loadAuthUser = async () => {
    try {
      const authUser = await AsyncStorage.getItem('auth_user');
      if (authUser) {
        const parsedUser = JSON.parse(authUser);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Failed to load auth user:', error);
      await AsyncStorage.removeItem('auth_user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, role: string) => {
    const userData = {
      username,
      role,
      name: username,
      loginTime: new Date().toISOString()
    };
    
    try {
      await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Failed to save auth user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_user');
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}