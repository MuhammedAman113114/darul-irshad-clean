import React, { useState, useEffect } from 'react';
import { hybridStorage } from '@/lib/hybridStorage';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';

interface SyncStatusProps {
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState({ isOnline: false, queueSize: 0, lastSync: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(hybridStorage.getStatus());
    };

    // Update status immediately
    updateStatus();

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = async () => {
    setIsRefreshing(true);
    try {
      await hybridStorage.forceSync();
      setStatus(hybridStorage.getStatus());
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getLastSyncText = () => {
    if (status.lastSync === 0) return 'Never synced';
    const diff = Date.now() - status.lastSync;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {status.isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className="text-xs text-gray-600">
          {status.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      <div className="flex items-center space-x-1">
        {status.isOnline ? (
          <Cloud className="h-4 w-4 text-blue-600" />
        ) : (
          <CloudOff className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-xs text-gray-600">
          {status.isOnline ? 'DB Connected' : 'Local Only'}
        </span>
      </div>

      {/* Queue Status */}
      {status.queueSize > 0 && (
        <Badge variant="secondary" className="text-xs">
          {status.queueSize} pending
        </Badge>
      )}

      {/* Last Sync */}
      <span className="text-xs text-gray-500">
        {getLastSyncText()}
      </span>

      {/* Force Sync Button */}
      {status.isOnline && status.queueSize > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleForceSync}
          disabled={isRefreshing}
          className="h-6 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};