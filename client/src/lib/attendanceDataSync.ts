// Direct attendance data synchronization service
export class AttendanceDataSync {
  private static instance: AttendanceDataSync;
  
  static getInstance(): AttendanceDataSync {
    if (!AttendanceDataSync.instance) {
      AttendanceDataSync.instance = new AttendanceDataSync();
    }
    return AttendanceDataSync.instance;
  }

  async saveAttendanceData(key: string, data: any): Promise<boolean> {
    try {
      // Save to localStorage immediately
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Attendance saved to localStorage: ${key}`);

      // Try to save to database
      if (navigator.onLine) {
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
            console.log(`📊 Attendance synced to database: ${key}`);
            
            // Mark as synced
            const syncedData = { ...data, _synced: true, _dbId: result.id };
            localStorage.setItem(key, JSON.stringify(syncedData));
            return true;
          }
        } catch (error) {
          console.warn('Database sync failed, stored locally:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      return false;
    }
  }

  getAllAttendanceKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        keys.push(key);
      }
    }
    return keys;
  }

  getAttendanceData(key: string): any | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading attendance data:', error);
      return null;
    }
  }
}

export const attendanceDataSync = AttendanceDataSync.getInstance();