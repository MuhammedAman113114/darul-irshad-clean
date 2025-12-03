import React, { createContext, useContext, ReactNode } from 'react';
import { showMessage } from 'react-native-flash-message';

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const colorMapping = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    showMessage({
      message,
      type: type === 'error' ? 'danger' : type,
      backgroundColor: colorMapping[type],
      duration: 3000,
      floating: true,
    });
  };

  const value = {
    showNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}