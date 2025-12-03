import { useState, useEffect } from "react";
import { offlineSyncManager } from "@/lib/offline-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Database
} from "lucide-react";

interface SyncStatusData {
  total: number;
  pending: number;
  synced: number;
  failed: number;
}

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({ total: 0, pending: 0, synced: 0, failed: 0 });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(offlineSyncManager.getNetworkStatus());
      setSyncStatus(offlineSyncManager.getSyncStatus());
    };

    // Initial update
    updateStatus();

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsManualSyncing(true);
    try {
      await offlineSyncManager.forcSync();
      setLastSyncTime(new Date());
      setSyncStatus(offlineSyncManager.getSyncStatus());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getConnectionStatus = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        text: "Offline",
        variant: "destructive" as const,
        tooltip: "No internet connection. Data will be saved locally and synced when online."
      };
    }

    if (syncStatus.pending > 0) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: `${syncStatus.pending} Pending`,
        variant: "secondary" as const,
        tooltip: `${syncStatus.pending} records waiting to sync to database`
      };
    }

    if (syncStatus.failed > 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: `${syncStatus.failed} Failed`,
        variant: "destructive" as const,
        tooltip: `${syncStatus.failed} records failed to sync. Will retry automatically.`
      };
    }

    return {
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Synced",
      variant: "default" as const,
      tooltip: "All data synced to database successfully"
    };
  };

  const status = getConnectionStatus();

  return (
    <div className="flex items-center gap-2">
      {/* Network Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnline ? "Connected to internet" : "No internet connection"}</p>
        </TooltipContent>
      </Tooltip>

      {/* Sync Status Badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            <span className="text-xs">{status.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>{status.tooltip}</p>
            {syncStatus.total > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t">
                <div>Total Records: {syncStatus.total}</div>
                <div className="text-green-600">Synced: {syncStatus.synced}</div>
                <div className="text-yellow-600">Pending: {syncStatus.pending}</div>
                <div className="text-red-600">Failed: {syncStatus.failed}</div>
              </div>
            )}
            {lastSyncTime && (
              <div className="text-xs pt-2 border-t">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Manual Sync Button */}
      {isOnline && syncStatus.pending > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="h-6 px-2"
            >
              {isManualSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Database className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sync pending data to database</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}