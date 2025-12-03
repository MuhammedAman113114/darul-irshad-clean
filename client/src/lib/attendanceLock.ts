/**
 * Simple Attendance Lock Service
 * Once attendance is taken for any period, lock until next day
 */

export class AttendanceLockService {
  /**
   * Generate simple lock key for attendance date
   */
  private static getLockKey(courseType: string, year: string, courseDivision: string | undefined, section: string, date: string, period: number): string {
    const divisionPart = courseDivision || 'common';
    return `attendance_lock_${courseType}_${year}_${divisionPart}_${section}_${date}_${period}`;
  }

  /**
   * Lock attendance for a specific period until next day
   */
  static lockAttendance(courseType: string, year: string, courseDivision: string | undefined, section: string, date: string, period: number): void {
    const lockKey = this.getLockKey(courseType, year, courseDivision, section, date, period);
    
    // Simple lock record with expiration at midnight next day
    const lockRecord = {
      lockedAt: new Date().toISOString(),
      lockExpires: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      period: period
    };
    
    localStorage.setItem(lockKey, JSON.stringify(lockRecord));
    console.log(`🔒 Period ${period} locked until next day for ${courseType} ${year} ${courseDivision || ''} ${section} - ${date}`);
  }

  /**
   * Check if attendance is locked for a specific period
   */
  static isAttendanceLocked(courseType: string, year: string, courseDivision: string | undefined, section: string, date: string, period: number): boolean {
    const lockKey = this.getLockKey(courseType, year, courseDivision, section, date, period);
    
    try {
      const lockData = localStorage.getItem(lockKey);
      if (!lockData) return false;
      
      const lock = JSON.parse(lockData);
      const now = new Date();
      const lockExpires = new Date(lock.lockExpires);
      
      // Check if lock has expired
      if (now >= lockExpires) {
        localStorage.removeItem(lockKey);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking attendance lock:', error);
      return false;
    }
  }

  /**
   * Get time remaining until lock expires
   */
  static getTimeUntilUnlock(courseType: string, year: string, courseDivision: string | undefined, section: string, date: string, period: number): string {
    const lockKey = this.getLockKey(courseType, year, courseDivision, section, date, period);
    
    try {
      const lockData = localStorage.getItem(lockKey);
      if (!lockData) return "Not locked";
      
      const lock = JSON.parse(lockData);
      const now = new Date();
      const lockExpires = new Date(lock.lockExpires);
      
      if (now >= lockExpires) {
        localStorage.removeItem(lockKey);
        return "Lock expired";
      }
      
      const hoursRemaining = Math.ceil((lockExpires.getTime() - now.getTime()) / (1000 * 60 * 60));
      return `${hoursRemaining} hours`;
    } catch (error) {
      console.error('Error getting unlock time:', error);
      return "Unknown";
    }
  }
}