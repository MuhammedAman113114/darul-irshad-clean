// Simple localStorage wrapper for persistent data storage

export const LocalStorage = {
  // Save data to localStorage
  saveData: <T>(key: string, data: T) => {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      return false;
    }
  },

  // Load data from localStorage
  loadData: <T>(key: string, defaultValue: T): T => {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return defaultValue;
      }
      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return defaultValue;
    }
  },

  // Remove data from localStorage
  removeData: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
      return false;
    }
  },

  // Clear all data from localStorage
  clearAllData: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all data from localStorage:', error);
      return false;
    }
  }
};

// Storage keys
export const STORAGE_KEYS = {
  STUDENTS: 'madrasa_students',
  CLASSROOMS: 'madrasa_classrooms',
  ATTENDANCE: 'madrasa_attendance',
  NAMAZ_ATTENDANCE: 'madrasa_namaz_attendance',
  LEAVES: 'madrasa_leaves',
  RESULTS: 'madrasa_results',
  REMARKS: 'madrasa_remarks',
  PERIODS: 'madrasa_periods',
  HOLIDAYS: 'madrasa_holidays'
};