import { Student } from "@shared/schema";

// Sync status types
export type SyncStatus = 'pending' | 'synced' | 'failed';

// Offline record structure
export interface OfflineRecord<T = any> {
  id: string;
  data: T;
  timestamp: number;
  syncStatus: SyncStatus;
  teacherId: string;
  retryCount: number;
}

// Attendance record structure
export interface AttendanceRecord {
  studentId: number;
  name: string;
  rollNo: string;
  status: 'present' | 'absent' | 'emergency-leave';
  reason?: string;
  section: string;
  date: string;
  period: string;
}

// Namaz attendance record
export interface NamazRecord {
  studentId: number;
  name: string;
  rollNo: string;
  status: 'present' | 'absent';
  section: string;
  date: string;
  prayer: string;
}

// Leave record
export interface LeaveRecord {
  studentId: number;
  name: string;
  rollNo: string;
  fromDate: string;
  toDate: string;
  reason: string;
  section: string;
}

// Remark record
export interface RemarkRecord {
  studentId: number;
  name: string;
  rollNo: string;
  content: string;
  category: string;
  section: string;
  date: string;
}

class OfflineSyncManager {
  private readonly STORAGE_PREFIX = 'darul_irshad_offline_';
  private readonly SYNC_INTERVAL = 60000; // 60 seconds
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    this.initializeNetworkMonitoring();
    this.startAutoSync();
  }

  private initializeNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync();
      }
    }, this.SYNC_INTERVAL);
  }

  private generateKey(type: string, teacherId: string, section: string, date: string, period?: string): string {
    const baseKey = `${this.STORAGE_PREFIX}${type}_${teacherId}_${section}_${date}`;
    return period ? `${baseKey}_${period}` : baseKey;
  }

  private generateRecordId(type: string, teacherId: string, section: string, date: string, period?: string): string {
    const timestamp = Date.now();
    const baseId = `${type}_${teacherId}_${section}_${date}`;
    return period ? `${baseId}_${period}_${timestamp}` : `${baseId}_${timestamp}`;
  }

  // Save attendance data offline
  saveAttendanceOffline(
    teacherId: string,
    section: string,
    date: string,
    period: string,
    studentAttendance: AttendanceRecord[]
  ): void {
    const recordId = this.generateRecordId('attendance', teacherId, section, date, period);
    const record: OfflineRecord<AttendanceRecord[]> = {
      id: recordId,
      data: studentAttendance,
      timestamp: Date.now(),
      syncStatus: 'pending',
      teacherId,
      retryCount: 0
    };

    const key = this.generateKey('attendance', teacherId, section, date, period);
    localStorage.setItem(key, JSON.stringify(record));
  }

  // Save namaz attendance offline
  saveNamazOffline(
    teacherId: string,
    section: string,
    date: string,
    prayer: string,
    namazAttendance: NamazRecord[]
  ): void {
    const recordId = this.generateRecordId('namaz', teacherId, section, date, prayer);
    const record: OfflineRecord<NamazRecord[]> = {
      id: recordId,
      data: namazAttendance,
      timestamp: Date.now(),
      syncStatus: 'pending',
      teacherId,
      retryCount: 0
    };

    const key = this.generateKey('namaz', teacherId, section, date, prayer);
    localStorage.setItem(key, JSON.stringify(record));
  }

  // Save leave data offline
  saveLeaveOffline(teacherId: string, section: string, leaveData: LeaveRecord): void {
    const recordId = this.generateRecordId('leave', teacherId, section, leaveData.fromDate);
    const record: OfflineRecord<LeaveRecord> = {
      id: recordId,
      data: leaveData,
      timestamp: Date.now(),
      syncStatus: 'pending',
      teacherId,
      retryCount: 0
    };

    const key = `${this.STORAGE_PREFIX}leave_${recordId}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  // Save remark offline
  saveRemarkOffline(teacherId: string, section: string, remarkData: RemarkRecord): void {
    const recordId = this.generateRecordId('remark', teacherId, section, remarkData.date);
    const record: OfflineRecord<RemarkRecord> = {
      id: recordId,
      data: remarkData,
      timestamp: Date.now(),
      syncStatus: 'pending',
      teacherId,
      retryCount: 0
    };

    const key = `${this.STORAGE_PREFIX}remark_${recordId}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  // Get all pending records for sync
  getPendingRecords(): OfflineRecord[] {
    const pendingRecords: OfflineRecord[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const record = JSON.parse(localStorage.getItem(key) || '');
          if (record.syncStatus === 'pending' || record.syncStatus === 'failed') {
            pendingRecords.push({ ...record, storageKey: key });
          }
        } catch (error) {
          console.error('Error parsing offline record:', error);
        }
      }
    }

    return pendingRecords;
  }

  // Get sync status for UI display
  getSyncStatus(): { total: number; pending: number; synced: number; failed: number } {
    let total = 0;
    let pending = 0;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const record = JSON.parse(localStorage.getItem(key) || '');
          total++;
          
          switch (record.syncStatus) {
            case 'pending':
              pending++;
              break;
            case 'synced':
              synced++;
              break;
            case 'failed':
              failed++;
              break;
          }
        } catch (error) {
          console.error('Error parsing offline record:', error);
        }
      }
    }

    return { total, pending, synced, failed };
  }

  // Sync a single record to the database
  private async syncRecord(record: OfflineRecord & { storageKey: string }): Promise<boolean> {
    try {
      const recordType = record.id.split('_')[0];
      let endpoint = '';
      let payload = {};

      switch (recordType) {
        case 'attendance':
          endpoint = '/api/attendance/bulk';
          payload = {
            records: record.data.map((item: AttendanceRecord) => ({
              studentId: item.studentId,
              date: item.date,
              period: item.period,
              status: item.status,
              reason: item.reason,
              isAutoMarked: false,
              createdBy: parseInt(record.teacherId)
            }))
          };
          break;

        case 'namaz':
          endpoint = '/api/namaz-attendance/bulk';
          payload = {
            records: record.data.map((item: NamazRecord) => ({
              studentId: item.studentId,
              date: item.date,
              prayer: item.prayer,
              status: item.status,
              createdBy: parseInt(record.teacherId)
            }))
          };
          break;

        case 'leave':
          endpoint = '/api/leaves';
          payload = {
            studentId: record.data.studentId,
            fromDate: record.data.fromDate,
            toDate: record.data.toDate,
            reason: record.data.reason,
            status: 'active',
            createdBy: parseInt(record.teacherId)
          };
          break;

        case 'remark':
          endpoint = '/api/remarks';
          payload = {
            studentId: record.data.studentId,
            content: record.data.content,
            category: record.data.category,
            submittedBy: parseInt(record.teacherId)
          };
          break;

        default:
          throw new Error(`Unknown record type: ${recordType}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Mark as synced and remove from localStorage
      localStorage.removeItem(record.storageKey);
      return true;

    } catch (error) {
      console.error('Sync failed for record:', record.id, error);
      
      // Update retry count and mark as failed if too many retries
      record.retryCount++;
      if (record.retryCount >= 3) {
        record.syncStatus = 'failed';
      }
      
      // Update the record in localStorage
      const { storageKey, ...recordToStore } = record;
      localStorage.setItem(storageKey, JSON.stringify(recordToStore));
      
      return false;
    }
  }

  // Trigger sync for all pending records
  async triggerSync(): Promise<void> {
    if (!this.isOnline) {
      console.log('Device is offline, skipping sync');
      return;
    }

    const pendingRecords = this.getPendingRecords();
    console.log(`Syncing ${pendingRecords.length} pending records...`);

    const syncPromises = pendingRecords.map(record => this.syncRecord(record as any));
    const results = await Promise.allSettled(syncPromises);

    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    console.log(`Sync completed: ${successful}/${pendingRecords.length} records synced successfully`);
  }

  // Clean up synced records (optional - call periodically)
  cleanupSyncedRecords(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const record = JSON.parse(localStorage.getItem(key) || '');
          if (record.syncStatus === 'synced') {
            keysToRemove.push(key);
          }
        } catch (error) {
          console.error('Error parsing offline record:', error);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleaned up ${keysToRemove.length} synced records`);
  }

  // Get network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Manual sync trigger for UI
  async forcSync(): Promise<void> {
    await this.triggerSync();
  }

  // Destroy sync manager
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();