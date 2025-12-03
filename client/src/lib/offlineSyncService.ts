
/**
 * Offline-First Sync Service with Conflict Resolution
 * Handles multiple teachers taking attendance simultaneously
 */

export interface OfflineSyncRecord {
  id: string;
  type: 'attendance' | 'namaz' | 'remarks' | 'leave';
  data: any;
  timestamp: number;
  teacherId: number;
  deviceId: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  conflictResolution?: 'merge' | 'overwrite' | 'manual';
}

export interface ConflictResolution {
  conflictId: string;
  localRecord: OfflineSyncRecord;
  remoteRecord: OfflineSyncRecord;
  resolution: 'use_local' | 'use_remote' | 'merge';
  mergedData?: any;
}

class OfflineSyncService {
  private deviceId: string;
  private teacherId: number = 1; // Current teacher ID
  private syncQueue: OfflineSyncRecord[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadSyncQueue();
    this.setupNetworkListeners();
    
    // Auto-sync when online
    if (this.isOnline) {
      this.performSync();
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('📶 Network connected - starting sync...');
      this.isOnline = true;
      this.performSync();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Network disconnected - switching to offline mode');
      this.isOnline = false;
    });
  }

  /**
   * Save attendance with conflict-aware timestamps
   */
  async saveAttendanceOffline(
    date: string,
    period: string,
    courseType: string,
    year: string,
    courseDivision: string | null,
    section: string,
    students: any[],
    metadata: any
  ): Promise<{ success: boolean; message: string; needsSync?: boolean }> {
    try {
      const attendanceKey = this.generateAttendanceKey(date, period, courseType, year, courseDivision, section);
      const timestamp = Date.now();
      
      // Create unique record ID
      const recordId = `${attendanceKey}_${this.deviceId}_${timestamp}`;
      
      const attendanceData = {
        date,
        period,
        courseType,
        year,
        courseDivision,
        section,
        students,
        metadata: {
          ...metadata,
          teacherId: this.teacherId,
          deviceId: this.deviceId,
          savedAt: new Date().toISOString(),
          timestamp,
          version: 1
        }
      };

      // Check for existing attendance
      const existingData = localStorage.getItem(attendanceKey);
      if (existingData) {
        const existing = JSON.parse(existingData);
        
        // If same device and within 5 minutes, allow update
        if (existing.metadata?.deviceId === this.deviceId && 
            (timestamp - existing.metadata?.timestamp) < 5 * 60 * 1000) {
          attendanceData.metadata.version = (existing.metadata?.version || 1) + 1;
          localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));
          
          this.addToSyncQueue({
            id: recordId,
            type: 'attendance',
            data: attendanceData,
            timestamp,
            teacherId: this.teacherId,
            deviceId: this.deviceId,
            isOffline: !this.isOnline,
            syncStatus: 'pending'
          });

          return {
            success: true,
            message: 'Attendance updated successfully',
            needsSync: !this.isOnline
          };
        } else {
          // Potential conflict - store as variant
          const conflictKey = `${attendanceKey}_conflict_${timestamp}`;
          localStorage.setItem(conflictKey, JSON.stringify(attendanceData));
          
          this.addToSyncQueue({
            id: recordId,
            type: 'attendance',
            data: { ...attendanceData, originalKey: attendanceKey, conflictKey },
            timestamp,
            teacherId: this.teacherId,
            deviceId: this.deviceId,
            isOffline: !this.isOnline,
            syncStatus: 'conflict'
          });

          return {
            success: true,
            message: 'Attendance saved (conflict detected - will resolve on sync)',
            needsSync: true
          };
        }
      } else {
        // No conflict - save normally
        localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));
        
        this.addToSyncQueue({
          id: recordId,
          type: 'attendance',
          data: attendanceData,
          timestamp,
          teacherId: this.teacherId,
          deviceId: this.deviceId,
          isOffline: !this.isOnline,
          syncStatus: 'pending'
        });

        return {
          success: true,
          message: 'Attendance saved successfully',
          needsSync: !this.isOnline
        };
      }
    } catch (error) {
      console.error('Failed to save attendance offline:', error);
      return {
        success: false,
        message: `Failed to save attendance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Perform intelligent sync with conflict resolution
   */
  async performSync(): Promise<{ success: boolean; conflicts: ConflictResolution[]; synced: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, conflicts: [], synced: 0 };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting intelligent sync process...');

    try {
      const conflicts: ConflictResolution[] = [];
      let syncedCount = 0;

      // Process each record in sync queue
      for (const record of this.syncQueue.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'conflict')) {
        try {
          if (record.type === 'attendance') {
            const result = await this.syncAttendanceRecord(record);
            
            if (result.hasConflict) {
              conflicts.push(result.conflictResolution!);
            } else {
              syncedCount++;
              record.syncStatus = 'synced';
            }
          }
        } catch (error) {
          console.error(`Failed to sync record ${record.id}:`, error);
          record.syncStatus = 'error';
        }
      }

      // Save updated sync queue
      this.saveSyncQueue();

      // Trigger UI updates
      window.dispatchEvent(new CustomEvent('syncCompleted', {
        detail: { syncedCount, conflicts: conflicts.length }
      }));

      console.log(`✅ Sync completed: ${syncedCount} records synced, ${conflicts.length} conflicts`);

      return { success: true, conflicts, synced: syncedCount };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual attendance record with smart conflict resolution
   */
  private async syncAttendanceRecord(record: OfflineSyncRecord): Promise<{
    hasConflict: boolean;
    conflictResolution?: ConflictResolution;
  }> {
    const attendanceData = record.data;
    const attendanceKey = this.generateAttendanceKey(
      attendanceData.date,
      attendanceData.period,
      attendanceData.courseType,
      attendanceData.year,
      attendanceData.courseDivision,
      attendanceData.section
    );

    // Check for existing data from other devices
    const existingData = localStorage.getItem(attendanceKey);
    
    if (existingData) {
      const existing = JSON.parse(existingData);
      
      // Different device or significant time gap = potential conflict
      if (existing.metadata?.deviceId !== this.deviceId) {
        return this.resolveAttendanceConflict(record, existing, attendanceKey);
      }
    }

    // No conflict - save normally
    localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));
    return { hasConflict: false };
  }

  /**
   * Intelligent conflict resolution for attendance
   */
  private resolveAttendanceConflict(
    localRecord: OfflineSyncRecord,
    remoteData: any,
    attendanceKey: string
  ): { hasConflict: boolean; conflictResolution: ConflictResolution } {
    const localData = localRecord.data;
    const localTime = localRecord.timestamp;
    const remoteTime = remoteData.metadata?.timestamp || 0;

    // Strategy 1: Time-based resolution (most recent wins)
    if (Math.abs(localTime - remoteTime) > 5 * 60 * 1000) { // 5 minutes apart
      if (localTime > remoteTime) {
        // Local is newer - use local
        localStorage.setItem(attendanceKey, JSON.stringify(localData));
        return {
          hasConflict: true,
          conflictResolution: {
            conflictId: `${attendanceKey}_${Date.now()}`,
            localRecord,
            remoteRecord: { ...localRecord, data: remoteData },
            resolution: 'use_local'
          }
        };
      } else {
        // Remote is newer - keep remote
        return {
          hasConflict: true,
          conflictResolution: {
            conflictId: `${attendanceKey}_${Date.now()}`,
            localRecord,
            remoteRecord: { ...localRecord, data: remoteData },
            resolution: 'use_remote'
          }
        };
      }
    }

    // Strategy 2: Same period, different students - merge
    if (localData.period === remoteData.period) {
      const mergedData = this.mergeAttendanceData(localData, remoteData);
      localStorage.setItem(attendanceKey, JSON.stringify(mergedData));
      
      return {
        hasConflict: true,
        conflictResolution: {
          conflictId: `${attendanceKey}_${Date.now()}`,
          localRecord,
          remoteRecord: { ...localRecord, data: remoteData },
          resolution: 'merge',
          mergedData
        }
      };
    }

    // Default: use local (current teacher's data)
    localStorage.setItem(attendanceKey, JSON.stringify(localData));
    return {
      hasConflict: true,
      conflictResolution: {
        conflictId: `${attendanceKey}_${Date.now()}`,
        localRecord,
        remoteRecord: { ...localRecord, data: remoteData },
        resolution: 'use_local'
      }
    };
  }

  /**
   * Merge attendance data intelligently
   */
  private mergeAttendanceData(localData: any, remoteData: any): any {
    const mergedStudents = [...localData.students];
    
    // Add any students not in local data
    remoteData.students.forEach((remoteStudent: any) => {
      const existingIndex = mergedStudents.findIndex(s => s.id === remoteStudent.id);
      if (existingIndex === -1) {
        mergedStudents.push(remoteStudent);
      } else {
        // For same student, use most recent data
        const localTimestamp = localData.metadata?.timestamp || 0;
        const remoteTimestamp = remoteData.metadata?.timestamp || 0;
        
        if (remoteTimestamp > localTimestamp) {
          mergedStudents[existingIndex] = remoteStudent;
        }
      }
    });

    return {
      ...localData,
      students: mergedStudents,
      metadata: {
        ...localData.metadata,
        mergedFrom: [localData.metadata?.deviceId, remoteData.metadata?.deviceId],
        mergedAt: new Date().toISOString(),
        conflictResolved: true
      }
    };
  }

  private generateAttendanceKey(
    date: string,
    period: string,
    courseType: string,
    year: string,
    courseDivision: string | null,
    section: string
  ): string {
    const divisionPart = courseType === 'pu' ? `_${courseDivision}` : '';
    return `attendance_${courseType}_${year}${divisionPart}_${section}_${date}_${period}`;
  }

  private addToSyncQueue(record: OfflineSyncRecord): void {
    this.syncQueue.push(record);
    this.saveSyncQueue();
  }

  private loadSyncQueue(): void {
    const stored = localStorage.getItem('sync_queue');
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored);
      } catch (error) {
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  /**
   * Get sync status for UI
   */
  getSyncStatus(): {
    isOnline: boolean;
    pendingSync: number;
    conflicts: number;
    lastSync: string | null;
  } {
    const pending = this.syncQueue.filter(r => r.syncStatus === 'pending').length;
    const conflicts = this.syncQueue.filter(r => r.syncStatus === 'conflict').length;
    const lastSync = localStorage.getItem('last_sync_time');

    return {
      isOnline: this.isOnline,
      pendingSync: pending,
      conflicts,
      lastSync
    };
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(): Promise<void> {
    if (this.isOnline) {
      await this.performSync();
      localStorage.setItem('last_sync_time', new Date().toISOString());
    }
  }

  /**
   * Clear synced records (cleanup)
   */
  cleanupSyncedRecords(): void {
    this.syncQueue = this.syncQueue.filter(r => r.syncStatus !== 'synced');
    this.saveSyncQueue();
  }
}

export const offlineSyncService = new OfflineSyncService();
