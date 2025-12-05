/**
 * Comprehensive Database Sync Service
 * Handles offline-first localStorage with automatic database synchronization
 * for all modules: attendance, namaz, leave, remarks, results, calendar
 */

export interface SyncQueueItem {
  id: string;
  module: 'attendance' | 'namaz' | 'leave' | 'remarks' | 'results' | 'calendar' | 'students';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
}

export class DatabaseSyncService {
  private static instance: DatabaseSyncService;
  private syncQueue: SyncQueueItem[] = [];
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastSyncTime: 0,
    syncInProgress: false
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Set<(status: NetworkStatus) => void> = new Set();

  public static getInstance(): DatabaseSyncService {
    if (!DatabaseSyncService.instance) {
      DatabaseSyncService.instance = new DatabaseSyncService();
    }
    return DatabaseSyncService.instance;
  }

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Load sync queue from localStorage
    this.loadSyncQueue();
    
    // Setup network event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic sync checks
    this.startPeriodicSync();
    
    // Initial sync if online
    if (this.networkStatus.isOnline) {
      this.performSync();
    }
  }

  private loadSyncQueue() {
    try {
      const stored = localStorage.getItem('syncQueue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
      
      const lastSync = localStorage.getItem('lastSyncTime');
      if (lastSync) {
        this.networkStatus.lastSyncTime = parseInt(lastSync);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
      localStorage.setItem('lastSyncTime', this.networkStatus.lastSyncTime.toString());
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private handleOnline() {
    this.networkStatus.isOnline = true;
    this.notifyListeners();
    console.log('🌐 Network restored - starting sync');
    this.performSync();
  }

  private handleOffline() {
    this.networkStatus.isOnline = false;
    this.notifyListeners();
    console.log('📴 Network lost - switching to offline mode');
  }

  private startPeriodicSync() {
    // Check for sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.networkStatus.isOnline && !this.networkStatus.syncInProgress) {
        this.performSync();
      }
    }, 30000);
  }

  private notifyListeners() {
    this.eventListeners.forEach(listener => listener(this.networkStatus));
  }

  public addNetworkStatusListener(callback: (status: NetworkStatus) => void) {
    this.eventListeners.add(callback);
    // Immediately notify with current status
    callback(this.networkStatus);
  }

  public removeNetworkStatusListener(callback: (status: NetworkStatus) => void) {
    this.eventListeners.delete(callback);
  }

  /**
   * Add item to sync queue and immediately sync if online
   */
  public queueSync(module: SyncQueueItem['module'], action: SyncQueueItem['action'], data: any): string {
    const id = `${module}_${action}_${Date.now()}_${Math.random()}`;
    
    const syncItem: SyncQueueItem = {
      id,
      module,
      action,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    console.log(`📝 Queued ${action} for ${module}:`, data);

    // Attempt immediate sync if online
    if (this.networkStatus.isOnline) {
      this.performSync();
    }

    return id;
  }

  /**
   * Perform sync operation
   */
  private async performSync() {
    if (this.networkStatus.syncInProgress || !this.networkStatus.isOnline) {
      return;
    }

    this.networkStatus.syncInProgress = true;
    this.notifyListeners();

    try {
      console.log(`🔄 Starting sync - ${this.syncQueue.filter(item => !item.synced).length} items to sync`);

      const unsyncedItems = this.syncQueue.filter(item => !item.synced);
      
      for (const item of unsyncedItems) {
        try {
          await this.syncItem(item);
          item.synced = true;
          console.log(`✅ Synced ${item.module} ${item.action}`);
        } catch (error) {
          item.retryCount++;
          console.error(`❌ Sync failed for ${item.module} ${item.action}:`, error);
          
          // Remove items that have failed too many times
          if (item.retryCount > 5) {
            console.warn(`🗑️ Removing failed sync item after 5 retries:`, item);
            this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
          }
        }
      }

      // Remove successfully synced items older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      this.syncQueue = this.syncQueue.filter(item => 
        !item.synced || item.timestamp > oneDayAgo
      );

      this.networkStatus.lastSyncTime = Date.now();
      this.saveSyncQueue();

    } catch (error) {
      console.error('Sync operation failed:', error);
    } finally {
      this.networkStatus.syncInProgress = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync individual item to database
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = this.getEndpoint(item.module, item.action);
    const method = this.getHttpMethod(item.action);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(item.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Database sync result for ${item.module}:`, result);
  }

  private getEndpoint(module: string, action: string): string {
    const baseEndpoints = {
      attendance: '/api/attendance',
      namaz: '/api/namaz-attendance',
      leave: '/api/leaves',
      remarks: '/api/remarks',
      results: '/api/results',
      calendar: '/api/holidays',
      students: '/api/students'
    };

    return baseEndpoints[module as keyof typeof baseEndpoints] || '/api/sync';
  }

  private getHttpMethod(action: string): string {
    switch (action) {
      case 'create': return 'POST';
      case 'update': return 'PUT';
      case 'delete': return 'DELETE';
      default: return 'POST';
    }
  }

  /**
   * Force sync all modules from database to localStorage
   */
  public async forceSyncFromDatabase(): Promise<void> {
    if (!this.networkStatus.isOnline) {
      throw new Error('Cannot sync from database while offline');
    }

    try {
      console.log('🔄 Force syncing all data from database...');

      // Sync only essential modules with working endpoints
      // Skip localStorage caching to avoid quota issues
      await Promise.all([
        this.syncModuleFromDatabase('namaz'),
        this.syncModuleFromDatabase('leave'),
        this.syncModuleFromDatabase('attendance'),
      ]);

      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }

  private async syncModuleFromDatabase(module: string): Promise<void> {
    const endpoint = this.getEndpoint(module, 'read');
    
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(`db_${module}`, JSON.stringify(data));
        console.log(`✅ Synced ${module} from database:`, data.length, 'records');
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${module} from database:`, error);
    }
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): NetworkStatus & { queueSize: number } {
    return {
      ...this.networkStatus,
      queueSize: this.syncQueue.filter(item => !item.synced).length
    };
  }

  /**
   * Clear sync queue (use with caution)
   */
  public clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    console.log('🗑️ Sync queue cleared');
  }

  /**
   * Destroy service and cleanup
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const databaseSync = DatabaseSyncService.getInstance();