import * as XLSX from 'xlsx';

export class WorkingCalendarExport {
  
  public async exportMonthlySheets(year: number, month: number): Promise<void> {
    try {
      console.log(`Starting export for ${year}-${month}`);
      
      // Get actual students from your app's current data
      const students = this.getCurrentStudents();
      console.log(`Found ${students.length} students for export`);
      
      if (students.length === 0) {
        console.log('No students found, checking localStorage...');
        this.debugLocalStorage();
        throw new Error('No students found for export. Please ensure students are added to the system.');
      }
      
      // Load holidays and leaves
      const holidays = await this.getHolidays();
      const leaves = this.getLeaves();
      
      console.log(`Found ${holidays.length} holidays and ${leaves.length} leaves`);
      
      // Debug attendance data availability
      this.debugAttendanceData(students[0]);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Group students by class
      const classGroups = this.groupStudentsByClass(students);
      
      // Create separate sheets for each class and period
      for (const [className, classStudents] of classGroups) {
        const periodsPerDay = this.getPeriodsPerDay(classStudents[0]);
        
        // Create a sheet for each period
        for (let period = 1; period <= periodsPerDay; period++) {
          const worksheet = this.createClassPeriodSheet(year, month, className, classStudents, holidays, leaves, period);
          const sheetName = `${className}_Period_${period}`;
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      }
      
      // Download file
      const fileName = `Attendance_${year}_${month.toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      console.log(`Export completed: ${fileName}`);
      
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
  
  private getCurrentStudents(): any[] {
    // Use the same students that are currently displayed in your attendance system
    const students: any[] = [];
    
    try {
      // Check all localStorage keys for student data
      Object.keys(localStorage).forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (!value) return;
          
          const data = JSON.parse(value);
          
          // Check if this looks like student data
          if (this.isStudentData(data)) {
            students.push(this.normalizeStudent(data));
          }
          
          // Check if it's an array containing students
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (this.isStudentData(item)) {
                students.push(this.normalizeStudent(item));
              }
            });
          }
          
        } catch (e) {
          // Skip invalid JSON
        }
      });
      
      // Remove duplicates
      const uniqueStudents = students.filter((student, index, self) => 
        index === self.findIndex(s => (s.rollNo === student.rollNo && s.rollNo) || (s.id === student.id && s.id))
      );
      
      return uniqueStudents;
      
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }
  
  private isStudentData(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           data.name && 
           (data.rollNo || data.id) &&
           typeof data.name === 'string';
  }
  
  private normalizeStudent(data: any): any {
    return {
      id: data.id || data.rollNo || 'unknown',
      name: data.name,
      rollNo: data.rollNo || data.id || 'N/A',
      courseType: data.courseType || 'pu',
      courseDivision: data.courseDivision || 'commerce',
      year: data.year || '1',
      batch: data.batch || data.section || 'A'
    };
  }
  
  private debugLocalStorage(): void {
    console.log('Debugging localStorage keys:');
    const keys = Object.keys(localStorage);
    console.log(`Total localStorage keys: ${keys.length}`);
    
    const studentKeys = keys.filter(key => 
      key.toLowerCase().includes('student') || 
      key.includes('pu_') || 
      key.includes('commerce') ||
      key.includes('science')
    );
    
    console.log(`Potential student keys: ${studentKeys.length}`, studentKeys);
    
    // Sample some data
    studentKeys.slice(0, 3).forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        console.log(`Sample data from ${key}:`, data);
      } catch (e) {
        console.log(`Invalid JSON in ${key}`);
      }
    });
  }
  
  private async getHolidays(): Promise<any[]> {
    try {
      const response = await fetch('/api/holidays');
      if (response.ok) {
        const holidays = await response.json();
        return Array.isArray(holidays) ? holidays : [];
      }
    } catch (error) {
      console.log('No holidays API available');
    }
    return [];
  }
  
  private getLeaves(): any[] {
    try {
      const leavesData = localStorage.getItem('leaves_data');
      if (leavesData) {
        const leaves = JSON.parse(leavesData);
        return Array.isArray(leaves) ? leaves : [];
      }
    } catch (error) {
      console.log('No leaves data found');
    }
    return [];
  }
  
  private groupStudentsByClass(students: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    students.forEach(student => {
      let className = 'Unknown_Class';
      
      if (student.courseType === 'pu') {
        const year = student.year || '1';
        const division = (student.courseDivision || 'general').charAt(0).toUpperCase() + (student.courseDivision || 'general').slice(1);
        const section = student.batch || 'A';
        className = `PU${year}_${division}_${section}`;
      } else if (student.courseType === 'post-pu') {
        const year = student.year || '3';
        className = `PostPUC${year}`;
      }
      
      if (!groups.has(className)) {
        groups.set(className, []);
      }
      groups.get(className)?.push(student);
    });
    
    return groups;
  }
  
  private getPeriodsPerDay(student: any): number {
    if (student.courseType === 'pu') {
      // PU 1st and 2nd year: 3 periods per day
      return 3;
    } else if (student.courseType === 'post-pu') {
      const year = parseInt(student.year);
      if (year >= 3 && year <= 5) {
        // Post PUC 3rd-5th: 6-7 periods per day (using 6 as standard)
        return 6;
      } else if (year >= 6 && year <= 7) {
        // Post PUC 6th-7th: 8 periods per day
        return 8;
      }
    }
    return 3; // Default fallback
  }

  private createClassPeriodSheet(year: number, month: number, className: string, students: any[], holidays: any[], leaves: any[], period: number): XLSX.WorkSheet {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
    
    const sheetData: any[][] = [];
    
    // Title
    sheetData.push([`${className} - Period ${period} - Monthly Attendance - ${monthName} ${year}`]);
    sheetData.push([]);
    
    // Legend with calendar integration info
    sheetData.push(['Legend: P=Present, A=Absent, L=Leave, E=Emergency, H=Holiday']);
    sheetData.push(['Calendar Integration: Holidays and leaves automatically highlighted']);
    sheetData.push([]);
    
    // Header - simple day columns
    const headerRow = ['Roll No', 'Student Name'];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      headerRow.push(`${day.toString().padStart(2, '0')}-${dayName}`);
    }
    headerRow.push('Present', 'Absent', 'Leave', 'Holiday', 'Attendance %');
    sheetData.push(headerRow);
    
    // Student rows
    students.forEach(student => {
      const row = [student.rollNo, student.name];
      
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let attendanceTakenDays = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const status = this.getStatusForDate(student, date, holidays, leaves, period);
        
        let cellValue = status;
        
        // Add reason if available
        if (status === 'H') {
          const holiday = holidays.find(h => h.date === date);
          if (holiday?.name) cellValue = `H (${holiday.name})`;
          holidayCount++;
        } else if (status === 'L' || status === 'E') {
          const leave = leaves.find(l => 
            l.studentId === student.id.toString() && 
            this.isDateInLeaveRange(date, l.fromDate, l.toDate)
          );
          if (leave?.reason) cellValue = `${status} (${leave.reason})`;
          leaveCount++;
        } else if (status === 'P') {
          presentCount++;
          attendanceTakenDays++;
        } else if (status === 'A') {
          absentCount++;
          attendanceTakenDays++;
        }
        // Empty status means no attendance was taken - don't count towards totals
        
        row.push(cellValue);
      }
      
      const attendancePercentage = attendanceTakenDays > 0 ? Math.round((presentCount / attendanceTakenDays) * 100) : 0;
      row.push(presentCount, absentCount, leaveCount, holidayCount, `${attendancePercentage}%`);
      
      sheetData.push(row);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 10 }, // Roll No
      { wch: 25 }, // Name
      ...Array(daysInMonth).fill({ wch: 10 }), // Day columns
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 } // Summary columns
    ];
    ws['!cols'] = colWidths;
    
    // Merge title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }
    ];
    
    return ws;
  }
  
  private getStatusForDate(student: any, date: string, holidays: any[], leaves: any[], period: number): string {
    // Check holidays first (only officially declared holidays)
    const isHoliday = holidays.some(h => h.date === date);
    if (isHoliday) return 'H';
    
    // Check leaves
    const studentLeave = leaves.find(l => 
      l.studentId === student.id.toString() && 
      this.isDateInLeaveRange(date, l.fromDate, l.toDate)
    );
    if (studentLeave) {
      return studentLeave.type === 'emergency' ? 'E' : 'L';
    }
    
    // Check actual attendance records from localStorage for this specific period
    const hasAttendanceRecord = this.checkRealAttendanceRecord(student, date, period);
    if (hasAttendanceRecord !== null) {
      return hasAttendanceRecord ? 'P' : 'A';
    }
    
    // If no attendance was taken for this date and period, leave blank
    return '';
  }
  
  private checkRealAttendanceRecord(student: any, date: string, period?: number): boolean | null {
    try {
      // Look for attendance records with the exact date and period pattern from your system
      const attendanceKeys = Object.keys(localStorage).filter(key => {
        if (!key.startsWith('attendance_') || !key.includes(date)) return false;
        
        // If period is specified, look for that specific period
        if (period !== undefined) {
          return key.includes(`_${period}_`) || key.endsWith(`_${period}`);
        }
        return true;
      });
      
      if (period !== undefined) {
        console.log(`🔍 Checking date ${date} period ${period} for student ${student.name} (ID: ${student.id})`);
      } else {
        console.log(`🔍 Checking date ${date} for student ${student.name} (ID: ${student.id})`);
      }
      console.log(`Found ${attendanceKeys.length} attendance keys for this date/period:`, attendanceKeys);
      
      // Check each attendance record for this date and period
      for (const key of attendanceKeys) {
        try {
          const attendanceRecord = JSON.parse(localStorage.getItem(key) || '{}');
          
          // Verify this is the correct period if specified
          if (period !== undefined && attendanceRecord.period && attendanceRecord.period !== period.toString()) {
            continue;
          }
          
          // Check if this record has students array
          if (attendanceRecord.students && Array.isArray(attendanceRecord.students)) {
            // Find this specific student in the attendance record
            const studentRecord = attendanceRecord.students.find((s: any) => 
              s.id === student.id || 
              s.id === parseInt(student.id) ||
              s.rollNo === student.rollNo
            );
            
            if (studentRecord) {
              const periodInfo = period !== undefined ? ` period ${period}` : '';
              console.log(`📍 Found attendance record for ${student.name} on ${date}${periodInfo}: ${studentRecord.status}`);
              return studentRecord.status === 'present';
            }
          }
          
        } catch (e) {
          continue;
        }
      }
      
      const periodInfo = period !== undefined ? ` period ${period}` : '';
      console.log(`❌ No attendance record found for ${student.name} on ${date}${periodInfo}`);
      
    } catch (error) {
      console.log('Error checking attendance records:', error);
    }
    
    return null; // No record found
  }
  
  private isAttendanceMatch(record: any, student: any, date: string): boolean {
    if (!record || !record.date) return false;
    
    // Check date match
    const recordDate = record.date.split('T')[0]; // Handle ISO dates
    if (recordDate !== date) return false;
    
    // Check student match
    return record.studentId === student.id.toString() || 
           record.studentId === student.rollNo ||
           record.rollNo === student.rollNo;
  }
  
  private isDateInLeaveRange(date: string, fromDate: string, toDate?: string): boolean {
    const checkDate = new Date(date);
    const startDate = new Date(fromDate);
    const endDate = toDate ? new Date(toDate) : startDate;
    
    return checkDate >= startDate && checkDate <= endDate;
  }
  
  private debugAttendanceData(sampleStudent: any): void {
    console.log('🔍 Debugging attendance data for export...');
    console.log(`Sample student: ${sampleStudent.name} (ID: ${sampleStudent.id}, Roll: ${sampleStudent.rollNo})`);
    
    // Check all localStorage keys for attendance patterns
    const allKeys = Object.keys(localStorage);
    const attendanceKeys = allKeys.filter(key => 
      key.toLowerCase().includes('attendance') ||
      key.includes('pu_') ||
      key.includes('commerce') ||
      key.includes(sampleStudent.id) ||
      key.includes(sampleStudent.rollNo)
    );
    
    console.log(`Found ${attendanceKeys.length} potential attendance keys:`, attendanceKeys);
    
    // Sample some attendance data
    attendanceKeys.slice(0, 5).forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        console.log(`📊 Data in ${key}:`, data);
      } catch (e) {
        console.log(`❌ Invalid JSON in ${key}`);
      }
    });
    
    // Check for today's date as example
    const today = new Date().toISOString().split('T')[0];
    const todayStatus = this.checkRealAttendanceRecord(sampleStudent, today);
    console.log(`Today (${today}) attendance status for ${sampleStudent.name}: ${todayStatus}`);
    
    // Check last few days
    for (let i = 1; i <= 5; i++) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - i);
      const dateStr = pastDate.toISOString().split('T')[0];
      const status = this.checkRealAttendanceRecord(sampleStudent, dateStr);
      console.log(`${dateStr} status: ${status}`);
    }
  }
}