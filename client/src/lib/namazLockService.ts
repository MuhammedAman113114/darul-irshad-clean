/**
 * Namaz Attendance Lock Service
 * Handles prayer attendance locking mechanism with auto-unlock at midnight
 */

export interface NamazLock {
  date: string;
  prayer: string;
  locked: boolean;
  timestamp: string;
  totalStudents: number;
}

export class NamazLockService {
  private static instance: NamazLockService;
  
  public static getInstance(): NamazLockService {
    if (!NamazLockService.instance) {
      NamazLockService.instance = new NamazLockService();
    }
    return NamazLockService.instance;
  }

  /**
   * Lock attendance for a specific prayer on a specific date
   */
  public lockPrayerAttendance(date: string, prayer: string, totalStudents: number): void {
    const lockKey = this.generateLockKey(date, prayer);
    const lockData: NamazLock = {
      date,
      prayer,
      locked: true,
      timestamp: new Date().toISOString(),
      totalStudents
    };

    try {
      localStorage.setItem(lockKey, JSON.stringify(lockData));
      console.log(`🔒 Locked ${prayer} attendance for ${date} (${totalStudents} students)`);
    } catch (error) {
      console.error('Error saving namaz lock:', error);
    }
  }

  /**
   * Check if attendance is locked for a specific prayer on a specific date
   */
  public isPrayerLocked(date: string, prayer: string): boolean {
    const lockKey = this.generateLockKey(date, prayer);
    const lockData = localStorage.getItem(lockKey);

    if (!lockData) return false;

    try {
      const parsed: NamazLock = JSON.parse(lockData);
      return parsed.locked === true;
    } catch (error) {
      console.error('Error parsing namaz lock data:', error);
      return false;
    }
  }

  /**
   * Get all saved prayers for a specific date
   */
  public getSavedPrayersForDate(date: string): string[] {
    const savedPrayers: string[] = [];
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];

    prayers.forEach(prayer => {
      if (this.isPrayerLocked(date, prayer)) {
        savedPrayers.push(prayer);
      }
    });

    return savedPrayers;
  }

  /**
   * Get saved prayer map for dropdown indicators
   */
  public getSavedPrayerMap(date: string): Record<string, boolean> {
    const savedMap: Record<string, boolean> = {};
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];

    prayers.forEach(prayer => {
      savedMap[prayer] = this.isPrayerLocked(date, prayer);
    });

    return savedMap;
  }

  /**
   * Unlock attendance (for manual override if needed)
   */
  public unlockPrayerAttendance(date: string, prayer: string): void {
    const lockKey = this.generateLockKey(date, prayer);
    localStorage.removeItem(lockKey);
    console.log(`🔓 Unlocked ${prayer} attendance for ${date}`);
  }

  /**
   * Auto-cleanup expired locks (for dates before today)
   */
  public cleanupExpiredLocks(): void {
    const today = new Date().toISOString().split('T')[0];
    const keysToRemove: string[] = [];

    // Check all localStorage keys for namaz locks
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('namaz_lock_')) {
        try {
          const lockData = localStorage.getItem(key);
          if (lockData) {
            const parsed: NamazLock = JSON.parse(lockData);
            if (parsed.date < today) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid lock data, mark for removal
          keysToRemove.push(key);
        }
      }
    }

    // Remove expired locks
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🧹 Cleaned up expired namaz lock: ${key}`);
    });

    if (keysToRemove.length > 0) {
      console.log(`✅ Cleaned up ${keysToRemove.length} expired namaz locks`);
    }
  }

  /**
   * Get lock info for a specific prayer
   */
  public getLockInfo(date: string, prayer: string): NamazLock | null {
    const lockKey = this.generateLockKey(date, prayer);
    const lockData = localStorage.getItem(lockKey);

    if (!lockData) return null;

    try {
      return JSON.parse(lockData);
    } catch (error) {
      console.error('Error parsing lock info:', error);
      return null;
    }
  }

  /**
   * Initialize lock service (cleanup expired locks)
   */
  public initialize(): void {
    this.cleanupExpiredLocks();
    console.log('🔐 Namaz Lock Service initialized');
  }

  private generateLockKey(date: string, prayer: string): string {
    return `namaz_lock_${date}_${prayer}`;
  }
}

// Export singleton instance
export const namazLockService = NamazLockService.getInstance();