/**
 * System Sync Service - Single Login Real-Time Sync
 * Ensures data integrity across all modules with leave-aware logic
 */

import { StudentData } from './studentService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SectionKey {
  courseType: 'pu' | 'post-pu';
  year: string;
  courseDivision?: string; // Only for PU
  section: string;
}

export interface LeaveRecord {
  id: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  status: string;
  reason: string;
}

export interface HolidayRecord {
  id: number;
  date: string;
  name: string;
  type: 'academic' | 'emergency';
  reason?: string;
}

export interface SyncedStudent {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  courseDivision: string | null;
  year: string;
  batch: string | null;
  dob: string;
  bloodGroup: string | null;
  fatherName: string | null;
  motherName: string | null;
  address: string | null;
  aadharNumber: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: Date;
  // Dynamic fields based on current context
  onLeave?: boolean;
  leaveReason?: string;
  attendanceStatus?: 'present' | 'absent' | 'on-leave';
}

class SystemSyncService {
  private queryClient: any = null;

  setQueryClient(client: any) {
    this.queryClient = client;
  }

  /**
   * Generate section key for consistent student fetching
   */
  generateSectionKey(courseType: string, year: string, courseDivision?: string, section?: string): string {
    if (courseType === 'pu') {
      return `pu_${year}_${courseDivision || 'commerce'}_${section || 'A'}`;
    }
    return `post-pu_${year}_${section || 'A'}`;
  }

  /**
   * Fetch students for a specific section with real-time sync
   */
  async fetchStudentsForSection(sectionKey: SectionKey): Promise<SyncedStudent[]> {
    try {
      const key = this.generateSectionKey(
        sectionKey.courseType,
        sectionKey.year,
        sectionKey.courseDivision,
        sectionKey.section
      );

      console.log(`🔍 Fetching students for section: ${key}`);
      
      // Fetch students from API or localStorage
      const response = await fetch(`/api/students?courseType=${sectionKey.courseType}&year=${sectionKey.year}&courseDivision=${sectionKey.courseDivision || 'commerce'}&section=${sectionKey.section}`);
      const students = response.ok ? await response.json() : [];
      
      // Also check localStorage for section-specific data
      const localStudents = localStorage.getItem(key);
      if (localStudents && students.length === 0) {
        const parsedStudents = JSON.parse(localStudents);
        students.push(...parsedStudents);
      }

      console.log(`📚 Found ${students.length} students in section ${key}`);
      
      // Validate students exist in current section
      const validatedStudents = students.filter(student => {
        const studentKey = this.generateSectionKey(
          student.courseType,
          student.year,
          student.courseDivision,
          student.batch
        );
        return studentKey === key;
      });

      return validatedStudents;
      
    } catch (error) {
      console.error('Failed to fetch students for section:', error);
      return [];
    }
  }

  /**
   * Get students with leave-aware status for a specific date
   */
  async getStudentsWithLeaveStatus(
    sectionKey: SectionKey, 
    targetDate: string
  ): Promise<SyncedStudent[]> {
    try {
      // Get base students
      const students = await this.fetchStudentsForSection(sectionKey);
      
      // Fetch active leaves for the date
      const leavesResponse = await fetch(`/api/leaves?date=${targetDate}`);
      const leaves: LeaveRecord[] = leavesResponse.ok ? await leavesResponse.json() : [];
      
      // Map students with leave status
      return students.map(student => {
        const activeLeave = leaves.find(leave => 
          leave.studentId === student.id &&
          leave.status === 'approved' &&
          targetDate >= leave.fromDate &&
          targetDate <= leave.toDate
        );

        return {
          ...student,
          onLeave: !!activeLeave,
          leaveReason: activeLeave?.reason,
          attendanceStatus: activeLeave ? 'on-leave' : undefined
        };
      });
      
    } catch (error) {
      console.error('Failed to fetch students with leave status:', error);
      return await this.fetchStudentsForSection(sectionKey);
    }
  }

  /**
   * Validate if date is a holiday
   */
  async validateDate(date: string): Promise<{
    isHoliday: boolean;
    holidayInfo?: HolidayRecord;
  }> {
    try {
      const response = await fetch(`/api/holidays?date=${date}`);
      if (!response.ok) return { isHoliday: false };
      
      const holidays: HolidayRecord[] = await response.json();
      const holiday = holidays.find(h => h.date === date);
      
      return {
        isHoliday: !!holiday,
        holidayInfo: holiday
      };
      
    } catch (error) {
      console.error('Failed to validate date:', error);
      return { isHoliday: false };
    }
  }

  /**
   * Sync student changes across all modules
   */
  async syncStudentChanges(action: 'add' | 'edit' | 'delete', studentData?: any) {
    if (!this.queryClient) return;

    try {
      console.log(`🔄 Syncing student ${action} across all modules`);
      
      // Invalidate all student-related queries
      await this.queryClient.invalidateQueries({ 
        predicate: (query: any) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && (
            key.includes('/api/students') ||
            key.includes('student-section') ||
            key.includes('attendance') ||
            key.includes('namaz') ||
            key.includes('leaves') ||
            key.includes('remarks')
          );
        }
      });

      // Update localStorage sync timestamp
      localStorage.setItem('systemSyncLastUpdate', Date.now().toString());
      
      console.log('✅ Student sync completed across all modules');
      
    } catch (error) {
      console.error('Failed to sync student changes:', error);
    }
  }

  /**
   * Sync leave changes with attendance auto-marking
   */
  async syncLeaveChanges(leaveData: LeaveRecord) {
    if (!this.queryClient) return;

    try {
      console.log(`🔄 Syncing leave changes for student ${leaveData.studentId}`);
      
      // Auto-mark attendance for leave period if approved
      if (leaveData.status === 'approved') {
        await this.autoMarkAttendanceForLeave(leaveData);
      }
      
      // Invalidate relevant queries
      await this.queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      await this.queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      
      console.log('✅ Leave sync completed with attendance auto-marking');
      
    } catch (error) {
      console.error('Failed to sync leave changes:', error);
    }
  }

  /**
   * Auto-mark attendance for approved leave periods
   */
  private async autoMarkAttendanceForLeave(leaveData: LeaveRecord) {
    try {
      const startDate = new Date(leaveData.fromDate);
      const endDate = new Date(leaveData.toDate);
      
      // Generate dates in leave period
      const dates: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
      
      // Auto-mark attendance for each date
      for (const date of dates) {
        const holidayCheck = await this.validateDate(date);
        if (holidayCheck.isHoliday) continue; // Skip holidays
        
        // Check if attendance already exists
        const existingResponse = await fetch(
          `/api/attendance?studentId=${leaveData.studentId}&date=${date}`
        );
        
        if (existingResponse.ok) {
          const existing = await existingResponse.json();
          if (existing.length === 0) {
            // Create attendance record for leave
            await fetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: leaveData.studentId,
                date: date,
                period: 'all-day',
                status: 'on-leave',
                reason: `Approved leave: ${leaveData.reason}`,
                isAutoMarked: true,
                createdBy: 1
              })
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to auto-mark attendance for leave:', error);
    }
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(sectionKey: SectionKey) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get students with leave status
      const students = await this.getStudentsWithLeaveStatus(sectionKey, today);
      
      // Get today's attendance
      const attendanceResponse = await fetch(`/api/attendance?date=${today}`);
      const attendance = attendanceResponse.ok ? await attendanceResponse.json() : [];
      
      // Get today's namaz records
      const namazResponse = await fetch(`/api/namaz-attendance?date=${today}`);
      const namaz = namazResponse.ok ? await namazResponse.json() : [];
      
      // Calculate statistics
      const totalStudents = students.length;
      const presentCount = attendance.filter((a: any) => a.status === 'present').length;
      const onLeaveCount = students.filter(s => s.onLeave).length;
      const absentCount = totalStudents - presentCount - onLeaveCount;
      
      return {
        totalStudents,
        presentCount,
        absentCount,
        onLeaveCount,
        attendancePercentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
        students,
        attendance,
        namaz,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      return null;
    }
  }

  /**
   * Validate student exists in selected section
   */
  validateStudentInSection(studentId: number, sectionKey: SectionKey): boolean {
    const key = this.generateSectionKey(
      sectionKey.courseType,
      sectionKey.year,
      sectionKey.courseDivision,
      sectionKey.section
    );
    
    const sectionData = localStorage.getItem(key);
    if (!sectionData) return false;
    
    try {
      const students = JSON.parse(sectionData);
      return students.some((student: any) => student.id === studentId);
    } catch {
      return false;
    }
  }

  /**
   * Get missed classes with authentic data only
   */
  async getMissedClasses(sectionKey: SectionKey, studentId?: number) {
    try {
      const studentsToCheck = studentId 
        ? await this.fetchStudentsForSection(sectionKey).then(students => 
            students.filter(s => s.id === studentId)
          )
        : await this.fetchStudentsForSection(sectionKey);
      
      const missedClasses: any[] = [];
      
      for (const student of studentsToCheck) {
        // Get attendance records
        const attendanceResponse = await fetch(`/api/attendance?studentId=${student.id}`);
        const attendance = attendanceResponse.ok ? await attendanceResponse.json() : [];
        
        // Get leave records
        const leavesResponse = await fetch(`/api/leaves?studentId=${student.id}&status=approved`);
        const leaves = leavesResponse.ok ? await leavesResponse.json() : [];
        
        // Find actual missed classes (absent but not on approved leave)
        const missed = attendance.filter((record: any) => {
          if (record.status !== 'absent') return false;
          
          // Check if student was on approved leave
          const onLeave = leaves.some((leave: any) => 
            record.date >= leave.fromDate && record.date <= leave.toDate
          );
          
          return !onLeave; // Only count as missed if not on approved leave
        });
        
        missedClasses.push(...missed.map((record: any) => ({
          ...record,
          studentName: student.name,
          rollNo: student.rollNo,
          reason: 'Unauthorized absence'
        })));
      }
      
      return missedClasses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    } catch (error) {
      console.error('Failed to get missed classes:', error);
      return [];
    }
  }
}

export const systemSyncService = new SystemSyncService();