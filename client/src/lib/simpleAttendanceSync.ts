import { AttendanceLockService } from './attendanceLock';

// Simplified attendance synchronization service
class SimpleAttendanceSync {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: any[] = [];

  constructor() {
    this.setupNetworkListeners();
    this.loadQueue();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private loadQueue() {
    try {
      const queueData = localStorage.getItem('attendance_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('attendance_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async saveAttendance(key: string, data: any): Promise<{ success: boolean; stored: string }> {
    // Always save to localStorage first
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Attendance saved to localStorage: ${key}`);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

    // Create attendance lock after successful save to enforce "1 day, 1 attendance" policy
    try {
      if (data.courseType && data.year && data.date && data.period) {
        // CRITICAL FIX: Science has no sections, Commerce has sections A & B
        let sectionForLock = '';
        if (data.courseType === 'pu' && data.courseDivision === 'commerce') {
          sectionForLock = data.section || 'A';  // Commerce has sections
        } else {
          sectionForLock = '';  // Science and Post-PU have no sections
        }
        
        AttendanceLockService.lockAttendance(
          data.courseType,
          data.year,
          data.courseDivision,
          sectionForLock,
          data.date,
          parseInt(data.period)
        );
        console.log(`🔒 Attendance locked until midnight for ${data.courseType} ${data.year} ${data.courseDivision || ''} ${sectionForLock} - ${data.date} Period ${data.period}`);
      }
    } catch (lockError) {
      console.error('Error creating attendance lock:', lockError);
    }

    // Try to save to database if online
    if (this.isOnline) {
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`📊 Attendance saved to database: ${key}`);
          
          // Mark as synced in localStorage
          const syncedData = { ...data, _synced: true, _dbId: result.id };
          localStorage.setItem(key, JSON.stringify(syncedData));
          
          return { success: true, stored: 'database' };
        } else {
          throw new Error(`Database save failed: ${response.status}`);
        }
      } catch (error) {
        console.warn('Database save failed, queuing for sync:', error);
        this.addToQueue(key, data);
        return { success: true, stored: 'queue' };
      }
    } else {
      // Offline - add to sync queue
      this.addToQueue(key, data);
      console.log(`📴 Offline: Queued attendance for sync: ${key}`);
      return { success: true, stored: 'queue' };
    }
  }

  private addToQueue(key: string, data: any) {
    // Remove existing entry for the same key if it exists
    this.syncQueue = this.syncQueue.filter(item => item.key !== key);
    
    // Add new entry
    this.syncQueue.push({
      key,
      data,
      timestamp: new Date().toISOString(),
      retries: 0
    });

    this.saveQueue();
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    console.log(`🔄 Processing sync queue: ${this.syncQueue.length} items`);

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
        
        if (item.retries >= 3) {
          console.error(`Max retries exceeded for ${item.key}, removing from queue`);
          itemsToRemove.push(i);
        }
      }
    }

    // Remove successfully synced and failed items
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      this.syncQueue.splice(itemsToRemove[i], 1);
    }

    this.saveQueue();
  }

  getSyncStatus() {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline
    };
  }
}

export const simpleAttendanceSync = new SimpleAttendanceSync();