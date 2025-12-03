/**
 * Holiday Service - Sync Logic Across App
 * Handles integration of holidays with attendance and namaz systems
 */

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'academic' | 'emergency';
  reason?: string;
  affectedCourses: string[];
  triggeredAt?: string;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
}

export class HolidayService {
  // Check if a specific date is a holiday (instance method)
  checkHoliday(date: string): { isHoliday: boolean; holiday?: Holiday } {
    try {
      // For now, return false - will be enhanced with actual holiday data
      // This method should be synchronous for sheet generation
      return { isHoliday: false };
    } catch (error) {
      console.error('Error checking holiday status:', error);
      return { isHoliday: false };
    }
  }

  // Check if a specific date is a holiday (static method)
  static async isHoliday(date: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/holidays?isDeleted=false`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.warn(`Holiday API returned ${response.status}: ${response.statusText}`);
        return false;
      }
      
      const holidays: Holiday[] = await response.json();
      return holidays.some(holiday => holiday.date === date && !holiday.isDeleted);
    } catch (error) {
      console.error('Error checking holiday status:', error);
      return false;
    }
  }

  // Get holiday for a specific date
  static async getHolidayForDate(date: string): Promise<Holiday | null> {
    try {
      const response = await fetch(`/api/holidays?isDeleted=false`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.warn(`Holiday API response not ok: ${response.status}: ${response.statusText}`);
        return null;
      }
      
      const holidays: Holiday[] = await response.json();
      return holidays.find(holiday => holiday.date === date && !holiday.isDeleted) || null;
    } catch (error) {
      console.error('Error fetching holiday for date:', error);
      return null;
    }
  }

  // Check if attendance should be blocked for a course on a specific date
  static async shouldBlockAttendance(date: string, courseType: string): Promise<boolean> {
    const holiday = await this.getHolidayForDate(date);
    if (!holiday) return false;

    // Check if this course is affected by the holiday
    const affectedCourses = holiday.affectedCourses.map(course => course.toLowerCase());
    const checkCourse = courseType.toLowerCase();
    
    return affectedCourses.includes('all') || 
           affectedCourses.includes(checkCourse) || 
           (checkCourse === 'pu' && affectedCourses.includes('puc')) ||
           (checkCourse === 'post-pu' && affectedCourses.includes('post-puc'));
  }

  // Smart holiday integration - automatically mark H in Excel exports
  static shouldMarkHolidayInExcel(date: string, courseType: string, holidays: Holiday[]): boolean {
    // Check for weekly Friday holiday first
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 5 = Friday
    if (dayOfWeek === 5) { // Friday
      return true; // Mark Friday as holiday in Excel
    }

    // Find holiday from provided holidays array
    const holiday = holidays.find(h => h.date === date && !h.isDeleted);
    
    if (holiday) {
      // Check if this course is affected by the holiday
      const affectedCourses = holiday.affectedCourses.map(course => course.toLowerCase());
      const checkCourse = courseType ? courseType.toLowerCase() : '';
      
      return affectedCourses.includes('all') || 
             affectedCourses.includes(checkCourse) || 
             (checkCourse === 'pu' && affectedCourses.includes('puc')) ||
             (checkCourse === 'post-pu' && affectedCourses.includes('post-puc'));
    }
    
    return false;
  }

  // Get holiday by date for UI display
  static async getHolidayByDate(date: string): Promise<Holiday | null> {
    return await this.getHolidayForDate(date);
  }

  // Check if namaz tracking should be disabled for a specific date
  static async shouldBlockNamazTracking(date: string): Promise<boolean> {
    return await this.isHoliday(date);
  }

  // Get holiday message for attendance blocking
  static async getHolidayMessage(date: string): Promise<string> {
    const holiday = await this.getHolidayForDate(date);
    if (!holiday) return '';

    if (holiday.type === 'emergency') {
      return `🔒 Emergency Holiday Declared - ${holiday.name}${holiday.reason ? ': ' + holiday.reason : ''}`;
    } else {
      return `🔒 Holiday Declared - ${holiday.name}`;
    }
  }

  // Sync holiday with attendance system (mark as holiday in missed attendance)
  static async syncWithAttendanceSystem(holiday: Holiday): Promise<void> {
    try {
      // Update missed attendance status for the holiday date
      const missedAttendanceData = {
        date: holiday.date,
        status: 'holiday',
        holidayType: holiday.type,
        holidayName: holiday.name,
        affectedCourses: holiday.affectedCourses
      };

      // This would typically call an API to update missed attendance status
      console.log(`📅 Syncing holiday with attendance system:`, missedAttendanceData);
      
      // Auto-mark attendance as "Holiday" for affected courses
      await this.markAttendanceAsHoliday(holiday);
      
    } catch (error) {
      console.error('Error syncing holiday with attendance system:', error);
    }
  }

  // Mark attendance as holiday for all students in affected courses
  private static async markAttendanceAsHoliday(holiday: Holiday): Promise<void> {
    try {
      // Fetch all students for affected courses
      const response = await fetch('/api/students', {
        credentials: 'include'
      });
      if (!response.ok) return;
      
      const students = await response.json();
      
      // Filter students by affected courses
      const affectedStudents = students.filter((student: any) => {
        const courseType = student.courseType?.toLowerCase();
        const affectedCourses = holiday.affectedCourses.map(c => c.toLowerCase());
        
        return affectedCourses.includes('all') || 
               affectedCourses.includes(courseType) ||
               (courseType === 'pu' && affectedCourses.includes('puc')) ||
               (courseType === 'post-pu' && affectedCourses.includes('post-puc'));
      });

      console.log(`📅 Marking holiday attendance for ${affectedStudents.length} students on ${holiday.date}`);
      
      // Create holiday attendance records
      for (const student of affectedStudents) {
        // Determine periods for the student's course
        const periods = this.getPeriodsForCourse(student.courseType, student.year);
        
        for (const period of periods) {
          const attendanceData = {
            studentId: student.id,
            rollNo: student.rollNo,
            date: holiday.date,
            period,
            status: 'holiday',
            courseType: student.courseType,
            courseName: student.courseDivision,
            section: student.batch || 'A',
            batchYear: `${student.year}${student.courseType === 'pu' ? ' PU' : ' Year'}`,
            createdBy: holiday.createdBy
          };

          // Save to attendance API
          try {
            await fetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(attendanceData),
              credentials: 'include'
            });
          } catch (error) {
            console.error('Error saving holiday attendance:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error marking attendance as holiday:', error);
    }
  }

  // Get periods for a specific course type and year
  private static getPeriodsForCourse(courseType: string, year: string): number[] {
    if (courseType === 'pu') {
      return [1, 2, 3]; // PU has 3 periods
    } else if (courseType === 'post-pu') {
      const yearNum = parseInt(year);
      if (yearNum <= 4) {
        return [1, 2, 3, 4, 5, 6]; // Older batches have 6 periods
      } else {
        return [1, 2, 3, 4, 5, 6, 7, 8]; // Newer batches have 8 periods
      }
    }
    return [1, 2, 3];
  }

  // Get all holidays for a specific month (for calendar display)
  static async getHolidaysForMonth(year: number, month: number): Promise<Holiday[]> {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      
      const response = await fetch(`/api/holidays?startDate=${startDate}&endDate=${endDate}&isDeleted=false`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching holidays for month:', error);
      return [];
    }
  }

  // Remove holiday (undo functionality)
  static async removeHoliday(holidayId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/holidays/${holidayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log(`📅 Holiday removed: ID ${holidayId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing holiday:', error);
      return false;
    }
  }

  // Integration with export systems - exclude holidays from attendance percentage
  static async getHolidaysForExport(startDate: string, endDate: string): Promise<Holiday[]> {
    try {
      const response = await fetch(`/api/holidays?startDate=${startDate}&endDate=${endDate}&isDeleted=false`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching holidays for export:', error);
      return [];
    }
  }
}

// Utility functions for holiday checking in components
export const useHolidayCheck = () => {
  const checkIsHoliday = async (date: string): Promise<boolean> => {
    return await HolidayService.isHoliday(date);
  };

  const getHolidayMessage = async (date: string): Promise<string> => {
    return await HolidayService.getHolidayMessage(date);
  };

  const shouldBlockAttendance = async (date: string, courseType: string): Promise<boolean> => {
    return await HolidayService.shouldBlockAttendance(date, courseType);
  };

  return {
    checkIsHoliday,
    getHolidayMessage,
    shouldBlockAttendance
  };
};