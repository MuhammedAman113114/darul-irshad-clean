import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  // Attendance storage methods - identical logic to web version
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return [];
    }
  }

  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Error setting multiple items:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Helper methods for attendance data
  static async saveAttendance(key: string, attendanceData: any): Promise<void> {
    await this.setItem(key, JSON.stringify(attendanceData));
  }

  static async getAttendance(key: string): Promise<any | null> {
    const data = await this.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Helper methods for namaz data
  static async saveNamaz(key: string, namazData: any): Promise<void> {
    await this.setItem(key, JSON.stringify(namazData));
  }

  static async getNamaz(key: string): Promise<any | null> {
    const data = await this.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Get all attendance records
  static async getAllAttendanceRecords(): Promise<any[]> {
    const allKeys = await this.getAllKeys();
    const attendanceKeys = allKeys.filter(key => 
      key.startsWith('attendance_') && !key.includes('history_')
    );
    
    const records = [];
    for (const key of attendanceKeys) {
      const data = await this.getAttendance(key);
      if (data) {
        records.push({ key, ...data });
      }
    }
    
    return records;
  }

  // Get all namaz records
  static async getAllNamazRecords(): Promise<any[]> {
    const allKeys = await this.getAllKeys();
    const namazKeys = allKeys.filter(key => key.startsWith('namaz_'));
    
    const records = [];
    for (const key of namazKeys) {
      const data = await this.getNamaz(key);
      if (data) {
        records.push({ key, ...data });
      }
    }
    
    return records;
  }

  // Sync queue management
  static async addToSyncQueue(data: any): Promise<void> {
    const queueKey = 'sync_queue';
    const existingQueue = await this.getItem(queueKey);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    
    queue.push({
      id: Date.now().toString(),
      data,
      timestamp: new Date().toISOString()
    });
    
    await this.setItem(queueKey, JSON.stringify(queue));
  }

  static async getSyncQueue(): Promise<any[]> {
    const queueKey = 'sync_queue';
    const data = await this.getItem(queueKey);
    return data ? JSON.parse(data) : [];
  }

  static async clearSyncQueue(): Promise<void> {
    await this.removeItem('sync_queue');
  }

  static async removeSyncQueueItem(id: string): Promise<void> {
    const queueKey = 'sync_queue';
    const existingQueue = await this.getItem(queueKey);
    if (existingQueue) {
      const queue = JSON.parse(existingQueue);
      const filteredQueue = queue.filter((item: any) => item.id !== id);
      await this.setItem(queueKey, JSON.stringify(filteredQueue));
    }
  }
}