import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  USER: 'user',
  AUTH_TOKEN: 'authToken',
  ATTENDANCE_CACHE: 'attendanceCache',
  NAMAZ_CACHE: 'namazCache',
  STUDENTS_CACHE: 'studentsCache',
  LEAVES_CACHE: 'leavesCache',
} as const;

// Generic storage functions
export const storage = {
  // Set item
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting storage item ${key}:`, error);
      throw error;
    }
  },

  // Get item
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error getting storage item ${key}:`, error);
      return null;
    }
  },

  // Remove item
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing storage item ${key}:`, error);
      throw error;
    }
  },

  // Clear all storage
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  // Get multiple items
  getMultiple: async (keys: string[]): Promise<Record<string, any>> => {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      values.forEach(([key, value]) => {
        result[key] = value ? JSON.parse(value) : null;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting multiple storage items:', error);
      return {};
    }
  },
};

// Specific storage functions for app data
export const authStorage = {
  setUser: (user: any) => storage.setItem(STORAGE_KEYS.USER, user),
  getUser: () => storage.getItem(STORAGE_KEYS.USER),
  removeUser: () => storage.removeItem(STORAGE_KEYS.USER),
  
  setToken: (token: string) => storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
  getToken: () => storage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN),
  removeToken: () => storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
};

export const cacheStorage = {
  setAttendance: (data: any) => storage.setItem(STORAGE_KEYS.ATTENDANCE_CACHE, data),
  getAttendance: () => storage.getItem(STORAGE_KEYS.ATTENDANCE_CACHE),
  
  setNamaz: (data: any) => storage.setItem(STORAGE_KEYS.NAMAZ_CACHE, data),
  getNamaz: () => storage.getItem(STORAGE_KEYS.NAMAZ_CACHE),
  
  setStudents: (data: any) => storage.setItem(STORAGE_KEYS.STUDENTS_CACHE, data),
  getStudents: () => storage.getItem(STORAGE_KEYS.STUDENTS_CACHE),
  
  setLeaves: (data: any) => storage.setItem(STORAGE_KEYS.LEAVES_CACHE, data),
  getLeaves: () => storage.getItem(STORAGE_KEYS.LEAVES_CACHE),
};