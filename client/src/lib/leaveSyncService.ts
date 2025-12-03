/**
 * Comprehensive Leave Sync Service
 * Ensures leave status is reflected across attendance, namaz, DB, and Excel exports
 */

export interface LeaveRecord {
  id: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'active' | 'completed';
  createdBy: number;
  createdAt: string;
}

export interface AttendanceRecord {
  studentId: number;
  date: string;
  period: string;
  status: 'present' | 'absent' | 'on-leave' | 'emergency-leave';
  reason?: string;
  isAutoMarked?: boolean;
}

export interface NamazRecord {
  studentId: number;
  date: string;
  prayer: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha';
  status: 'present' | 'absent' | 'on-leave';
}

export class LeaveSyncService {
  private static instance: LeaveSyncService;
  
  public static getInstance(): LeaveSyncService {
    if (!LeaveSyncService.instance) {
      LeaveSyncService.instance = new LeaveSyncService();
    }
    return LeaveSyncService.instance;
  }

  /**
   * Check if a student is on active leave for a specific date
   */
  public async isStudentOnLeave(studentId: number, date: string): Promise<boolean> {
    try {
      const leaves = await this.getActiveLeaves();
      const checkDate = new Date(date);
      
      console.log(`🔍 Leave Check: Student ${studentId} on ${date}`, {
        studentId,
        date,
        checkDate: checkDate.toISOString(),
        totalLeaves: leaves.length,
        leaves: leaves.map(l => ({
          studentId: l.studentId,
          fromDate: l.fromDate,
          toDate: l.toDate,
          status: l.status
        }))
      });
      
      const isOnLeave = leaves.some(leave => {
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const matches = leave.studentId === studentId && 
                       leave.status === 'active' &&
                       checkDate >= fromDate && 
                       checkDate <= toDate;
        
        if (leave.studentId === studentId) {
          console.log(`📅 Leave Match Check for Student ${studentId}:`, {
            leaveFromDate: fromDate.toISOString(),
            leaveToDate: toDate.toISOString(),
            checkDate: checkDate.toISOString(),
            isInRange: checkDate >= fromDate && checkDate <= toDate,
            isActive: leave.status === 'active',
            finalMatch: matches
          });
        }
        
        return matches;
      });
      
      console.log(`✅ Leave Result: Student ${studentId} is ${isOnLeave ? 'ON LEAVE' : 'NOT ON LEAVE'} on ${date}`);
      return isOnLeave;
    } catch (error) {
      console.error('Error checking leave status:', error);
      return false;
    }
  }

  /**
   * Get all active leave records
   */
  public async getActiveLeaves(): Promise<LeaveRecord[]> {
    try {
      // Try to get from API first (database)
      const response = await fetch('/api/leaves');
      if (response.ok) {
        const leaves = await response.json();
        return leaves.filter((leave: LeaveRecord) => leave.status === 'active');
      }
    } catch (error) {
      console.warn('API not available, falling back to localStorage');
    }

    // Fallback to localStorage - find the actual leave data
    try {
      const allKeys = Object.keys(localStorage);
      console.log('🔍 Leave Sync: Checking all localStorage keys for leave data...');
      
      let foundLeaves: any[] = [];
      
      // Check every single localStorage key to find the leave data
      for (const key of allKeys) {
        try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            const data = JSON.parse(storedData);
            
            // Check if this is leave data - look for arrays with studentId, fromDate, toDate
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item && typeof item === 'object' && 
                    'studentId' in item && 'fromDate' in item && 'toDate' in item) {
                  console.log(`✅ Found leave data in localStorage key '${key}':`, data);
                  foundLeaves = data;
                  break;
                }
              }
            }
            
            // Also check if it's a single leave object
            if (data && typeof data === 'object' && 
                'studentId' in data && 'fromDate' in data && 'toDate' in data) {
              console.log(`✅ Found single leave record in localStorage key '${key}':`, data);
              foundLeaves = [data];
            }
            
            if (foundLeaves.length > 0) break;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      if (foundLeaves.length > 0) {
        console.log('🎯 Processing found leave records:', foundLeaves);
        // Ensure all leaves have proper status
        const leavesWithStatus = foundLeaves.map(leave => ({
          ...leave,
          status: leave.status || 'active' // Default to active if no status
        }));
        return this.updateLeaveStatuses(leavesWithStatus).filter((leave: LeaveRecord) => leave.status === 'active');
      }
    } catch (error) {
      console.error('Error scanning localStorage for leave data:', error);
    }

    console.log('⚠️ Leave Sync: No leave records found anywhere in localStorage');
    return [];
  }

  /**
   * Update leave statuses based on current date
   */
  private updateLeaveStatuses(leaves: LeaveRecord[]): LeaveRecord[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return leaves.map(leave => {
      const leaveEndDate = new Date(leave.toDate);
      leaveEndDate.setHours(23, 59, 59, 999);
      
      if (leave.status === 'active' && today > leaveEndDate) {
        return { ...leave, status: 'completed' as const };
      }
      return leave;
    });
  }

  /**
   * Get leave-aware attendance status for a student
   */
  public async getLeaveAwareAttendanceStatus(studentId: number, date: string, defaultStatus: string): Promise<string> {
    const isOnLeave = await this.isStudentOnLeave(studentId, date);
    return isOnLeave ? 'on-leave' : defaultStatus;
  }

  /**
   * Auto-mark attendance for students on leave
   */
  public async autoMarkLeaveAttendance(date: string, students: any[], periods: string[]): Promise<AttendanceRecord[]> {
    const attendanceRecords: AttendanceRecord[] = [];
    
    for (const student of students) {
      const isOnLeave = await this.isStudentOnLeave(student.id, date);
      
      if (isOnLeave) {
        for (const period of periods) {
          attendanceRecords.push({
            studentId: student.id,
            date,
            period,
            status: 'on-leave',
            reason: 'Student on approved leave',
            isAutoMarked: true
          });
        }
      }
    }
    
    return attendanceRecords;
  }

  /**
   * Auto-mark namaz for students on leave
   */
  public async autoMarkLeaveNamaz(date: string, students: any[]): Promise<NamazRecord[]> {
    const namazRecords: NamazRecord[] = [];
    const prayers: ('fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha')[] = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    
    for (const student of students) {
      const isOnLeave = await this.isStudentOnLeave(student.id, date);
      
      if (isOnLeave) {
        for (const prayer of prayers) {
          namazRecords.push({
            studentId: student.id,
            date,
            prayer,
            status: 'on-leave'
          });
        }
      }
    }
    
    return namazRecords;
  }

  /**
   * Get student leave info for a specific date
   */
  public async getStudentLeaveInfo(studentId: number, date: string): Promise<LeaveRecord | null> {
    try {
      const leaves = await this.getActiveLeaves();
      const checkDate = new Date(date);
      
      return leaves.find(leave => {
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        return leave.studentId === studentId && 
               leave.status === 'active' &&
               checkDate >= fromDate && 
               checkDate <= toDate;
      }) || null;
    } catch (error) {
      console.error('Error getting student leave info:', error);
      return null;
    }
  }

  /**
   * Sync leave status to attendance records
   */
  public async syncLeaveToAttendance(attendanceKey: string, students: any[]): Promise<void> {
    try {
      const existingData = localStorage.getItem(attendanceKey);
      if (!existingData) return;

      const attendance = JSON.parse(existingData);
      const date = attendance.date;
      let hasChanges = false;

      for (const student of attendance.students) {
        const isOnLeave = await this.isStudentOnLeave(student.id, date);
        
        if (isOnLeave && student.status !== 'on-leave') {
          student.status = 'on-leave';
          hasChanges = true;
        }
      }

      if (hasChanges) {
        localStorage.setItem(attendanceKey, JSON.stringify(attendance));
      }
    } catch (error) {
      console.error('Error syncing leave to attendance:', error);
    }
  }

  /**
   * Sync leave status to namaz records
   */
  public async syncLeaveToNamaz(namazKey: string): Promise<void> {
    try {
      const existingData = localStorage.getItem(namazKey);
      if (!existingData) return;

      const namaz = JSON.parse(existingData);
      const date = namaz.date;
      let hasChanges = false;

      for (const student of namaz.students) {
        const isOnLeave = await this.isStudentOnLeave(student.id, date);
        
        if (isOnLeave && student.status !== 'on-leave') {
          student.status = 'on-leave';
          hasChanges = true;
        }
      }

      if (hasChanges) {
        localStorage.setItem(namazKey, JSON.stringify(namaz));
      }
    } catch (error) {
      console.error('Error syncing leave to namaz:', error);
    }
  }

  /**
   * Generate Excel-compatible data with leave status
   */
  public async generateExcelData(type: 'attendance' | 'namaz', startDate: string, endDate: string): Promise<any[]> {
    const data: any[] = [];
    
    try {
      const students = await this.getAllStudents();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        for (const student of students) {
          const isOnLeave = await this.isStudentOnLeave(student.id, dateStr);
          
          if (type === 'attendance') {
            data.push({
              Date: dateStr,
              Name: student.name,
              Class: `${student.year}${student.courseType === 'pu' ? 'st PU' : 'th Year'} ${student.courseDivision || ''}`,
              'Period 1': isOnLeave ? 'L' : this.getAttendanceStatus(student.id, dateStr, 'period1'),
              'Period 2': isOnLeave ? 'L' : this.getAttendanceStatus(student.id, dateStr, 'period2'),
              'Period 3': isOnLeave ? 'L' : this.getAttendanceStatus(student.id, dateStr, 'period3'),
            });
          } else if (type === 'namaz') {
            data.push({
              Date: dateStr,
              Name: student.name,
              Class: `${student.year}${student.courseType === 'pu' ? 'st PU' : 'th Year'} ${student.courseDivision || ''}`,
              Fajr: isOnLeave ? 'L' : this.getNamazStatus(student.id, dateStr, 'fajr'),
              Dhuhr: isOnLeave ? 'L' : this.getNamazStatus(student.id, dateStr, 'zuhr'),
              Asr: isOnLeave ? 'L' : this.getNamazStatus(student.id, dateStr, 'asr'),
              Maghrib: isOnLeave ? 'L' : this.getNamazStatus(student.id, dateStr, 'maghrib'),
              Isha: isOnLeave ? 'L' : this.getNamazStatus(student.id, dateStr, 'isha'),
              'Emergency Leave': isOnLeave ? 'Yes' : 'No'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating Excel data:', error);
    }
    
    return data;
  }

  private async getAllStudents(): Promise<any[]> {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API not available for students');
    }
    
    // Fallback to localStorage or return empty array
    return [];
  }

  private getAttendanceStatus(studentId: number, date: string, period: string): string {
    // This would fetch from localStorage or API
    return 'P'; // Default to present for now
  }

  private getNamazStatus(studentId: number, date: string, prayer: string): string {
    // This would fetch from localStorage or API
    return 'P'; // Default to present for now
  }
}

export const leaveSyncService = LeaveSyncService.getInstance();