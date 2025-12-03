import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { databaseSync, type NetworkStatus } from '@/lib/databaseSyncService';

export const NetworkStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<NetworkStatus & { queueSize: number }>({
    isOnline: navigator.onLine,
    lastSyncTime: 0,
    syncInProgress: false,
    queueSize: 0
  });

  useEffect(() => {
    const handleStatusUpdate = (networkStatus: NetworkStatus) => {
      setStatus({
        ...networkStatus,
        queueSize: databaseSync.getSyncStatus().queueSize
      });
    };

    databaseSync.addNetworkStatusListener(handleStatusUpdate);

    // Initial status
    setStatus(databaseSync.getSyncStatus());

    return () => {
      databaseSync.removeNetworkStatusListener(handleStatusUpdate);
    };
  }, []);

  const handleForceSync = async () => {
    if (status.isOnline && !status.syncInProgress) {
      try {
        await databaseSync.forceSyncFromDatabase();
      } catch (error) {
        console.error('Force sync failed:', error);
      }
    }
  };

  const getLastSyncText = () => {
    if (status.lastSyncTime === 0) return 'Never';
    const now = Date.now();
    const diff = now - status.lastSyncTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Network Status */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        status.isOnline 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        {status.isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span>{status.isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Sync Status */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        status.syncInProgress
          ? 'bg-blue-100 text-blue-700'
          : status.queueSize > 0
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-700'
      }`}>
        {status.syncInProgress ? (
          <RotateCcw className="h-3 w-3 animate-spin" />
        ) : status.queueSize > 0 ? (
          <CloudOff className="h-3 w-3" />
        ) : (
          <Cloud className="h-3 w-3" />
        )}
        <span>
          {status.syncInProgress 
            ? 'Syncing...' 
            : status.queueSize > 0 
            ? `${status.queueSize} pending`
            : 'Synced'
          }
        </span>
      </div>

      {/* Last Sync Time */}
      <div className="text-gray-500">
        Last: {getLastSyncText()}
      </div>

      {/* Force Sync Button */}
      {status.isOnline && !status.syncInProgress && (
        <button
          onClick={handleForceSync}
          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
          title="Force sync with database"
        >
          <RotateCcw className="h-3 w-3" />
          Sync
        </button>
      )}
    </div>
  );
};