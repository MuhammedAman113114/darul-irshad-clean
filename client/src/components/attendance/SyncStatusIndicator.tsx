
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { offlineSyncService } from "@/lib/offlineSyncService";
import { 
  Wifi, WifiOff, RefreshCw, AlertTriangle, 
  CheckCircle, Clock, Sync 
} from "lucide-react";

export default function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState(offlineSyncService.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(offlineSyncService.getSyncStatus());
    };

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    // Listen for sync completion events
    const handleSyncCompleted = (event: any) => {
      updateStatus();
      setIsManualSyncing(false);
    };

    window.addEventListener('syncCompleted', handleSyncCompleted);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('syncCompleted', handleSyncCompleted);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const handleManualSync = async () => {
    if (syncStatus.isOnline && !isManualSyncing) {
      setIsManualSyncing(true);
      try {
        await offlineSyncService.triggerManualSync();
      } catch (error) {
        console.error('Manual sync failed:', error);
      } finally {
        setIsManualSyncing(false);
      }
    }
  };

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            
            <span className="font-medium text-sm">
              {syncStatus.isOnline ? 'Online' : 'Offline Mode'}
            </span>
            
            {syncStatus.pendingSync > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {syncStatus.pendingSync} pending
              </Badge>
            )}
            
            {syncStatus.conflicts > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {syncStatus.conflicts} conflicts
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {syncStatus.lastSync && (
              <span className="text-xs text-gray-600">
                Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
              </span>
            )}
            
            {syncStatus.isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={isManualSyncing}
                className="h-7 px-2"
              >
                {isManualSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sync className="h-3 w-3" />
                )}
                <span className="ml-1 text-xs">Sync</span>
              </Button>
            )}
          </div>
        </div>

        {/* Detailed status for multiple pending items */}
        {(syncStatus.pendingSync > 0 || syncStatus.conflicts > 0) && (
          <div className="mt-2 text-xs text-gray-600">
            {syncStatus.isOnline ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Connected - data will sync automatically</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span>Attendance saved locally - will sync when online</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
