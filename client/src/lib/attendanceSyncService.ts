import { queryClient } from './queryClient';

interface AttendanceRecord {
  date: string;
  period: string;
  attendanceType: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  subjectName?: string;
  students: Array<{
    id: number;
    name: string;
    rollNo: string;
    status: string;
    onLeave?: boolean;
    isAutoMarked?: boolean;
  }>;
  stats: {
    total: number;
    present: number;
    absent: number;
    onLeave?: number;
  };
  metadata: {
    savedAt: string;
    lastModified: string;
    markedBy: number;
    validationPassed: boolean;
    conflictResolved: boolean;
    auditTrail: boolean;
    markedAt: string;
    lockedUntil: string;
    isLocked: boolean;
    lockType: string;
  };
  id?: number;
  updatedAt?: string;
}

interface SyncQueueItem {
  key: string;
  data: AttendanceRecord;
  action: 'create' | 'update';
  timestamp: string;
  retries: number;
}

class AttendanceSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.initializeService();
    this.loadSyncQueue();
    this.setupNetworkListeners();
  }

  private initializeService() {
    console.log('🔄 Attendance Sync Service initialized');
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Network connection restored - starting sync');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Network connection lost - queuing for offline sync');
    });
  }

  private loadSyncQueue() {
    try {
      const queueData = localStorage.getItem('attendance_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        console.log(`🔄 Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('attendance_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async saveAttendance(attendanceKey: string, attendanceData: AttendanceRecord): Promise<{ success: boolean; stored: 'database' | 'queue' | 'localStorage'; id?: number }> {
    // Always save to localStorage first for immediate availability
    try {
      localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));
      console.log(`💾 Attendance saved to localStorage: ${attendanceKey}`);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

    // Try to save to database if online
    if (this.isOnline) {
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attendanceData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`📊 Attendance saved to database: ${attendanceKey}`);
          
          // Mark as synced in localStorage
          const syncedData = { ...attendanceData, _synced: true, _dbId: result.id };
          localStorage.setItem(attendanceKey, JSON.stringify(syncedData));
          
          return { success: true, stored: 'database', id: result.id };
        } else {
          throw new Error(`Database save failed: ${response.status}`);
        }
      } catch (error) {
        console.warn('Database save failed, queuing for sync:', error);
        this.addToSyncQueue(attendanceKey, attendanceData, 'create');
        return { success: true, stored: 'queue' };
      }
    } else {
      // Offline - add to sync queue
      this.addToSyncQueue(attendanceKey, attendanceData, 'create');
      console.log(`📴 Offline: Queued attendance for sync: ${attendanceKey}`);
      return { success: true, stored: 'queue' };
    }
  }

  private addToSyncQueue(key: string, data: AttendanceRecord, action: 'create' | 'update') {
    // Remove existing entry for the same key if it exists
    this.syncQueue = this.syncQueue.filter(item => item.key !== key);
    
    // Add new entry
    this.syncQueue.push({
      key,
      data,
      action,
      timestamp: new Date().toISOString(),
      retries: 0
    });

    this.saveSyncQueue();
    console.log(`📥 Added to sync queue: ${key} (${action})`);
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Processing sync queue: ${this.syncQueue.length} items`);

    const maxRetries = 3;
    const itemsToRemove: number[] = [];

    for (let i = 0; i < this.syncQueue.length; i++) {
      const item = this.syncQueue[i];

      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Synced to database: ${item.key}`);
          
          // Update localStorage with sync status
          const localData = localStorage.getItem(item.key);
          if (localData) {
            const parsedData = JSON.parse(localData);
            const syncedData = { ...parsedData, _synced: true, _dbId: result.id };
            localStorage.setItem(item.key, JSON.stringify(syncedData));
          }
          
          itemsToRemove.push(i);
        } else {
          throw new Error(`Sync failed: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Sync failed for ${item.key}:`, error);
        item.retries++;
        
        if (item.retries >= maxRetries) {
          console.error(`Max retries exceeded for ${item.key}, removing from queue`);
          itemsToRemove.push(i);
        }
      }
    }

    // Remove successfully synced and failed items
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      this.syncQueue.splice(itemsToRemove[i], 1);
    }

    this.saveSyncQueue();
    this.syncInProgress = false;

    console.log(`✅ Sync queue processing complete. ${this.syncQueue.length} items remaining`);
  }

  async getAttendanceFromDatabase(filters: any): Promise<AttendanceRecord[]> {
    if (!this.isOnline) {
      console.log('📴 Offline: Cannot fetch from database');
      return [];
    }

    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/attendance?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Fetched ${data.length} attendance records from database`);
        return data;
      } else {
        throw new Error(`Database fetch failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching from database:', error);
      return [];
    }
  }

  async syncWithDatabase(): Promise<void> {
    if (!this.isOnline) {
      console.log('📴 Cannot sync with database while offline');
      return;
    }

    console.log('🔄 Starting full database sync...');
    
    // Process any queued items first
    await this.processSyncQueue();

    // Fetch latest data from database and update localStorage
    try {
      const dbRecords = await this.getAttendanceFromDatabase({});
      
      for (const record of dbRecords) {
        const key = `attendance_${record.courseType}_${record.year}_${record.courseDivision || 'none'}_${record.section}_${record.date}_${record.period}_${record.attendanceType}`;
        
        // Check if local version exists and is newer
        const localData = localStorage.getItem(key);
        if (localData) {
          const localRecord = JSON.parse(localData);
          const localTime = new Date(localRecord.metadata?.lastModified || localRecord.savedAt);
          const dbTime = new Date(record.metadata?.lastModified || record.updatedAt);
          
          if (localTime > dbTime && !localRecord._synced) {
            // Local version is newer and not synced - keep local
            continue;
          }
        }
        
        // Update localStorage with database version
        const syncedRecord = { ...record, _synced: true, _dbId: record.id };
        localStorage.setItem(key, JSON.stringify(syncedRecord));
      }
      
      console.log('✅ Database sync completed');
    } catch (error) {
      console.error('Error during database sync:', error);
    }
  }

  getSyncStatus(): { queueLength: number; isOnline: boolean; syncInProgress: boolean } {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  // Force sync attempt
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
      await this.syncWithDatabase();
    } else {
      console.log('📴 Cannot force sync while offline');
    }
  }
}

export const attendanceSyncService = new AttendanceSyncService();