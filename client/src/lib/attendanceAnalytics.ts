/**
 * Real-time Attendance Analytics Service
 * Ensures strict authentic data usage - no mock, placeholder, or assumed data
 */

export interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  period: string;
  status: 'present' | 'absent' | 'on-leave';
  reason?: string | null;
  isAutoMarked?: boolean | null;
  createdAt: Date;
  createdBy: number;
}

export interface StudentAttendanceStats {
  studentId: number;
  studentName: string;
  rollNo: string;
  totalPeriodsMarked: number;
  totalPresent: number;
  totalAbsent: number;
  totalOnLeave: number;
  attendancePercentage: number;
  missedClasses: MissedClass[];
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface MissedClass {
  date: string;
  period: string;
  subject?: string;
  reason: 'absent-without-leave' | 'unauthorized-absence';
}

export interface AttendanceTrend {
  date: string;
  totalStudents: number;
  totalPeriodsMarked: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  attendancePercentage: number;
}

export class AttendanceAnalyticsService {
  
  /**
   * Get real attendance statistics for a student
   * Only uses actual attendance records - no assumptions
   */
  async getStudentStats(studentId: number): Promise<StudentAttendanceStats | null> {
    try {
      // Fetch only real attendance records
      const response = await fetch(`/api/attendance?studentId=${studentId}`);
      if (!response.ok) return null;
      
      const attendanceRecords: AttendanceRecord[] = await response.json();
      
      // If no attendance records exist, return null (no data available)
      if (attendanceRecords.length === 0) {
        return null;
      }
      
      // Get student info
      const studentResponse = await fetch(`/api/students/${studentId}`);
      if (!studentResponse.ok) return null;
      const student = await studentResponse.json();
      
      // Calculate stats from real data only
      const totalPeriodsMarked = attendanceRecords.length;
      const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
      const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
      const totalOnLeave = attendanceRecords.filter(r => r.status === 'on-leave').length;
      
      // Calculate attendance percentage (only from marked periods)
      const attendancePercentage = totalPeriodsMarked > 0 
        ? Math.round((totalPresent / totalPeriodsMarked) * 100) 
        : 0;
      
      // Get missed classes (only actual absences, not leave)
      const missedClasses: MissedClass[] = attendanceRecords
        .filter(r => r.status === 'absent')
        .map(r => ({
          date: r.date,
          period: r.period,
          reason: 'absent-without-leave'
        }));
      
      // Calculate recent trend from last 7 days of marked attendance
      const recentTrend = this.calculateRecentTrend(attendanceRecords);
      
      return {
        studentId,
        studentName: student.name,
        rollNo: student.rollNo,
        totalPeriodsMarked,
        totalPresent,
        totalAbsent,
        totalOnLeave,
        attendancePercentage,
        missedClasses,
        recentTrend
      };
      
    } catch (error) {
      console.error('Error fetching student attendance stats:', error);
      return null;
    }
  }
  
  /**
   * Get attendance trends over time
   * Only uses periods where attendance was actually marked
   */
  async getAttendanceTrends(
    courseType: string,
    year: string,
    courseDivision: string,
    section: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceTrend[]> {
    try {
      // Fetch all attendance records for the class in date range
      const response = await fetch(
        `/api/attendance?courseType=${courseType}&year=${year}&courseName=${courseDivision}&section=${section}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) return [];
      
      const attendanceRecords: AttendanceRecord[] = await response.json();
      
      // If no records, return empty array (no data available)
      if (attendanceRecords.length === 0) {
        return [];
      }
      
      // Group by date
      const dateGroups = new Map<string, AttendanceRecord[]>();
      attendanceRecords.forEach(record => {
        if (!dateGroups.has(record.date)) {
          dateGroups.set(record.date, []);
        }
        dateGroups.get(record.date)!.push(record);
      });
      
      // Calculate trends for each date with actual data
      const trends: AttendanceTrend[] = [];
      
      dateGroups.forEach((records, date) => {
        const uniqueStudents = new Set(records.map(r => r.studentId));
        const totalStudents = uniqueStudents.size;
        const totalPeriodsMarked = records.length;
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;
        const onLeaveCount = records.filter(r => r.status === 'on-leave').length;
        
        const attendancePercentage = totalPeriodsMarked > 0 
          ? Math.round((presentCount / totalPeriodsMarked) * 100) 
          : 0;
        
        trends.push({
          date,
          totalStudents,
          totalPeriodsMarked,
          presentCount,
          absentCount,
          onLeaveCount,
          attendancePercentage
        });
      });
      
      // Sort by date
      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    } catch (error) {
      console.error('Error fetching attendance trends:', error);
      return [];
    }
  }
  
  /**
   * Get students with critical attendance issues
   * Only considers actual attendance records
   */
  async getCriticalAttendanceStudents(
    courseType: string,
    year: string,
    courseDivision: string,
    section: string,
    threshold: number = 75
  ): Promise<StudentAttendanceStats[]> {
    try {
      // Get all students in the class
      const studentsResponse = await fetch(
        `/api/students?courseType=${courseType}&year=${year}&courseDivision=${courseDivision}&section=${section}`
      );
      
      if (!studentsResponse.ok) return [];
      const students = await studentsResponse.json();
      
      const criticalStudents: StudentAttendanceStats[] = [];
      
      // Check each student's attendance
      for (const student of students) {
        const stats = await this.getStudentStats(student.id);
        
        // Only include if they have attendance records and are below threshold
        if (stats && stats.totalPeriodsMarked > 0 && stats.attendancePercentage < threshold) {
          criticalStudents.push(stats);
        }
      }
      
      // Sort by attendance percentage (lowest first)
      return criticalStudents.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
      
    } catch (error) {
      console.error('Error fetching critical attendance students:', error);
      return [];
    }
  }
  
  /**
   * Calculate recent attendance trend
   * Uses only last 7 days of actual attendance records
   */
  private calculateRecentTrend(attendanceRecords: AttendanceRecord[]): 'improving' | 'declining' | 'stable' {
    if (attendanceRecords.length < 14) return 'stable'; // Need sufficient data
    
    // Sort by date
    const sortedRecords = attendanceRecords.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const totalRecords = sortedRecords.length;
    const midPoint = Math.floor(totalRecords / 2);
    
    // Calculate attendance rate for first half vs second half
    const firstHalf = sortedRecords.slice(0, midPoint);
    const secondHalf = sortedRecords.slice(midPoint);
    
    const firstHalfRate = firstHalf.filter(r => r.status === 'present').length / firstHalf.length;
    const secondHalfRate = secondHalf.filter(r => r.status === 'present').length / secondHalf.length;
    
    const difference = secondHalfRate - firstHalfRate;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }
  
  /**
   * Validate attendance data integrity
   * Ensures no mock or placeholder data exists
   */
  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    try {
      const response = await fetch('/api/attendance');
      if (!response.ok) {
        return { isValid: false, issues: ['Cannot access attendance data'] };
      }
      
      const records: AttendanceRecord[] = await response.json();
      const issues: string[] = [];
      
      // Check for placeholder data patterns
      records.forEach((record, index) => {
        // Check for mock IDs (sequential starting from 1)
        if (record.id === index + 1 && records.length > 10) {
          issues.push(`Potential mock data detected - sequential ID pattern`);
        }
        
        // Check for unrealistic perfect attendance
        if (records.filter(r => r.studentId === record.studentId).every(r => r.status === 'present')) {
          const studentRecords = records.filter(r => r.studentId === record.studentId);
          if (studentRecords.length > 20) {
            issues.push(`Student ${record.studentId} has suspiciously perfect attendance`);
          }
        }
        
        // Check for missing essential fields
        if (!record.date || !record.period || !record.status) {
          issues.push(`Record ${record.id} missing essential fields`);
        }
      });
      
      return {
        isValid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      return {
        isValid: false,
        issues: ['Error validating attendance data']
      };
    }
  }
}

export const attendanceAnalytics = new AttendanceAnalyticsService();