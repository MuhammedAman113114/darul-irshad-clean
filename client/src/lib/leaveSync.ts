/**
 * Leave Synchronization Service
 * Automatically syncs leave records with attendance and namaz tracking
 */

interface LeaveRecord {
  id: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'active' | 'cancelled';
  createdBy?: string;
  createdAt?: string;
}

interface AttendanceRecord {
  id?: number;
  studentId: number;
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  period: number;
  status: 'present' | 'absent' | 'on-leave';
  remarks?: string;
}

interface NamazRecord {
  studentId: number;
  date: string;
  fajr: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  remarks?: string;
}

export class LeaveSyncService {
  /**
   * Check if a student is on leave for a specific date
   */
  static isStudentOnLeave(studentId: number, date: string): boolean {
    try {
      // Debug localStorage keys
      const allKeys = Object.keys(localStorage).filter(key => key.includes('leave'));
      console.log('🔍 All leave-related localStorage keys:', allKeys);
      
      // Try multiple possible storage keys
      let leaves = [];
      const possibleKeys = ['leaves_data', 'leaves', 'student_leaves', 'leave_records'];
      
      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data && data !== '[]') {
          console.log(`📋 Found leave data in key '${key}':`, data);
          leaves = JSON.parse(data);
          break;
        }
      }
      
      const checkDate = new Date(date);
      
      console.log('🔍 Leave Check: Student', studentId, 'on', date, {
        studentId,
        date,
        checkDate: checkDate.toISOString(),
        totalLeaves: leaves.length,
        allLeaveKeys: allKeys,
        leaves: leaves.filter((leave: LeaveRecord) => leave.studentId === studentId)
      });
      
      const isOnLeave = leaves.some((leave: LeaveRecord) => {
        if (leave.studentId !== studentId || leave.status !== 'active') {
          return false;
        }
        
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        
        return checkDate >= fromDate && checkDate <= toDate;
      });
      
      console.log(isOnLeave ? '🚫 Leave Result: Student is ON LEAVE' : '✅ Leave Result: Student is NOT ON LEAVE on', date);
      
      return isOnLeave;
    } catch (error) {
      console.error('Error checking leave status:', error);
      return false;
    }
  }

  /**
   * Get leave details for a student on a specific date
   */
  static getLeaveDetails(studentId: number, date: string): LeaveRecord | null {
    try {
      // Check both 'leaves' and 'leaves_data' keys for leave records
      const leavesData = localStorage.getItem('leaves_data') || localStorage.getItem('leaves') || '[]';
      const leaves = JSON.parse(leavesData);
      const checkDate = new Date(date);
      
      return leaves.find((leave: LeaveRecord) => {
        if (leave.studentId !== studentId || leave.status !== 'active') {
          return false;
        }
        
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        
        return checkDate >= fromDate && checkDate <= toDate;
      }) || null;
    } catch (error) {
      console.error('Error getting leave details:', error);
      return null;
    }
  }

  /**
   * Sync attendance records with leave status
   */
  static syncAttendanceWithLeave(
    studentId: number,
    date: string,
    courseType: string,
    year: string,
    courseDivision: string,
    section: string,
    period: number
  ): void {
    try {
      const isOnLeave = this.isStudentOnLeave(studentId, date);
      
      if (isOnLeave) {
        const leaveDetails = this.getLeaveDetails(studentId, date);
        const attendanceKey = `attendance_${date}_${courseType}_${year}_${courseDivision || ''}_${section}_${period}`;
        
        // Get existing attendance records
        const existingRecords = JSON.parse(localStorage.getItem(attendanceKey) || '[]');
        
        // Remove any existing record for this student
        const filteredRecords = existingRecords.filter((record: AttendanceRecord) => 
          record.studentId !== studentId
        );
        
        // Add leave record
        const leaveRecord: AttendanceRecord = {
          studentId,
          date,
          courseType,
          year,
          courseDivision,
          section,
          period,
          status: 'on-leave',
          remarks: leaveDetails ? `On Leave: ${leaveDetails.reason}` : 'On Leave'
        };
        
        filteredRecords.push(leaveRecord);
        localStorage.setItem(attendanceKey, JSON.stringify(filteredRecords));
        
        console.log(`✅ Synced attendance: Student ${studentId} marked as on-leave for ${date}`);
      }
    } catch (error) {
      console.error('Error syncing attendance with leave:', error);
    }
  }

  /**
   * Sync namaz records with leave status
   */
  static syncNamazWithLeave(studentId: number, date: string): void {
    try {
      const isOnLeave = this.isStudentOnLeave(studentId, date);
      
      if (isOnLeave) {
        const leaveDetails = this.getLeaveDetails(studentId, date);
        const namazKey = `namaz_${date}_${studentId}`;
        
        // Create leave record for namaz
        const leaveRecord: NamazRecord = {
          studentId,
          date,
          fajr: 'on-leave',
          zuhr: 'on-leave',
          asr: 'on-leave',
          maghrib: 'on-leave',
          isha: 'on-leave',
          remarks: leaveDetails ? `On Leave: ${leaveDetails.reason}` : 'On Leave'
        };
        
        localStorage.setItem(namazKey, JSON.stringify(leaveRecord));
        
        console.log(`✅ Synced namaz: Student ${studentId} marked as on-leave for ${date}`);
      }
    } catch (error) {
      console.error('Error syncing namaz with leave:', error);
    }
  }

  /**
   * Auto-sync leave records when a new leave is created
   */
  static autoSyncNewLeave(leave: LeaveRecord): void {
    try {
      const startDate = new Date(leave.fromDate);
      const endDate = new Date(leave.toDate);
      
      // Get student details to determine course info
      const student = this.getStudentDetails(leave.studentId);
      if (!student) {
        console.warn(`Student ${leave.studentId} not found for leave sync`);
        return;
      }
      
      // Iterate through all dates in the leave period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Sync attendance for all periods (assuming 7 periods per day)
        for (let period = 1; period <= 7; period++) {
          this.syncAttendanceWithLeave(
            leave.studentId,
            dateString,
            student.courseType,
            student.year,
            student.courseDivision || '',
            student.batch,
            period
          );
        }
        
        // Sync namaz
        this.syncNamazWithLeave(leave.studentId, dateString);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`🔄 Auto-synced leave for student ${leave.studentId} from ${leave.fromDate} to ${leave.toDate}`);
    } catch (error) {
      console.error('Error auto-syncing leave:', error);
    }
  }

  /**
   * Remove leave sync when leave is cancelled
   */
  static removeLeaveSyncRecords(leave: LeaveRecord): void {
    try {
      const startDate = new Date(leave.fromDate);
      const endDate = new Date(leave.toDate);
      
      // Get student details
      const student = this.getStudentDetails(leave.studentId);
      if (!student) return;
      
      // Iterate through all dates in the leave period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Remove attendance leave records for all periods
        for (let period = 1; period <= 7; period++) {
          const attendanceKey = `attendance_${dateString}_${student.courseType}_${student.year}_${student.courseDivision || ''}_${student.batch}_${period}`;
          const existingRecords = JSON.parse(localStorage.getItem(attendanceKey) || '[]');
          const filteredRecords = existingRecords.filter((record: AttendanceRecord) => 
            !(record.studentId === leave.studentId && record.status === 'on-leave')
          );
          
          if (filteredRecords.length !== existingRecords.length) {
            localStorage.setItem(attendanceKey, JSON.stringify(filteredRecords));
          }
        }
        
        // Remove namaz leave records
        const namazKey = `namaz_${dateString}_${leave.studentId}`;
        const namazRecord = localStorage.getItem(namazKey);
        if (namazRecord) {
          const record = JSON.parse(namazRecord);
          if (record.fajr === 'on-leave') {
            localStorage.removeItem(namazKey);
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`🗑️ Removed leave sync records for student ${leave.studentId}`);
    } catch (error) {
      console.error('Error removing leave sync records:', error);
    }
  }

  /**
   * Get student details from localStorage
   */
  private static getStudentDetails(studentId: number): any {
    const sectionKeys = [
      'pu_1_commerce_A', 'pu_1_commerce_B', 'pu_2_commerce_A', 'pu_2_commerce_B',
      'pu_1_science_A', 'pu_2_science_A',
      'post-pu_3_A', 'post-pu_4_A', 'post-pu_5_A', 'post-pu_6_A', 'post-pu_7_A'
    ];
    
    for (const sectionKey of sectionKeys) {
      const stored = localStorage.getItem(sectionKey);
      if (stored) {
        try {
          const students = JSON.parse(stored);
          const student = students.find((s: any) => s.id === studentId);
          if (student) {
            return student;
          }
        } catch (error) {
          console.error(`Error parsing students from ${sectionKey}:`, error);
        }
      }
    }
    
    return null;
  }

  /**
   * Batch sync all active leaves
   */
  static batchSyncAllLeaves(): void {
    try {
      // Use the correct storage key 'leaves_data'
      const leavesData = localStorage.getItem('leaves_data') || localStorage.getItem('leaves') || '[]';
      const leaves = JSON.parse(leavesData);
      const activeLeaves = leaves.filter((leave: LeaveRecord) => leave.status === 'active');
      
      console.log(`🔄 Batch syncing ${activeLeaves.length} active leaves...`);
      console.log('📋 Active leaves found:', activeLeaves);
      
      activeLeaves.forEach((leave: LeaveRecord) => {
        this.autoSyncNewLeave(leave);
      });
      
      console.log(`✅ Batch sync completed for all active leaves`);
    } catch (error) {
      console.error('Error batch syncing leaves:', error);
    }
  }

  /**
   * Check and sync leave status for attendance display
   */
  static getAttendanceStatusWithLeave(studentId: number, date: string, originalStatus?: string): string {
    const isOnLeave = this.isStudentOnLeave(studentId, date);
    
    if (isOnLeave) {
      return 'on-leave';
    }
    
    return originalStatus || 'not-marked';
  }

  /**
   * Check and sync leave status for namaz display
   */
  static getNamazStatusWithLeave(studentId: number, date: string, prayer: string, originalStatus?: string): string {
    const isOnLeave = this.isStudentOnLeave(studentId, date);
    
    if (isOnLeave) {
      return 'on-leave';
    }
    
    return originalStatus || 'not-marked';
  }
}

// Export singleton instance
export const leaveSyncService = LeaveSyncService;