import * as XLSX from 'xlsx';

export class SimpleCalendarExport {
  
  public async exportMonthlySheets(year: number, month: number): Promise<void> {
    try {
      console.log(`Starting simple export for ${year}-${month}`);
      
      // Get students from localStorage
      const students = this.getStudentsFromStorage();
      console.log(`Found ${students.length} students`);
      
      // Load holidays from database
      const holidays = await this.loadHolidaysFromAPI();
      console.log(`Found ${holidays.length} holidays`);
      
      if (students.length === 0) {
        throw new Error('No students found for export');
      }
      
      // Group students by class
      const classSections = this.groupStudentsByClass(students);
      console.log(`Found ${classSections.size} class sections`);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Create a sheet for each class section
      for (const [className, classStudents] of classSections) {
        const worksheet = this.createMonthlySheet(year, month, className, classStudents);
        XLSX.utils.book_append_sheet(workbook, worksheet, className);
      }
      
      // Download the file
      const fileName = `Attendance_${year}_${month.toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      console.log(`Export completed: ${fileName}`);
      
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
  
  private getStudentsFromStorage(): any[] {
    const students: any[] = [];
    
    // Use the same method as your attendance system
    try {
      // Check localStorage for student data using your app's storage pattern
      const keys = Object.keys(localStorage);
      
      // Look for students in various storage patterns your app uses
      keys.forEach(key => {
        try {
          if (key.includes('student') || key.includes('pu_') || key.includes('commerce') || key.includes('science')) {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Check if it's student data
            if (data.name && (data.rollNo || data.id)) {
              students.push({
                id: data.id || data.rollNo,
                name: data.name,
                rollNo: data.rollNo || data.id,
                courseType: data.courseType || 'pu',
                courseDivision: data.courseDivision || 'commerce',
                year: data.year || '1',
                batch: data.batch || data.section || 'A'
              });
            }
            
            // Check if it's an array of students
            if (Array.isArray(data)) {
              data.forEach(student => {
                if (student.name && (student.rollNo || student.id)) {
                  students.push({
                    id: student.id || student.rollNo,
                    name: student.name,
                    rollNo: student.rollNo || student.id,
                    courseType: student.courseType || 'pu',
                    courseDivision: student.courseDivision || 'commerce',
                    year: student.year || '1',
                    batch: student.batch || student.section || 'A'
                  });
                }
              });
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      });
      
      // Remove duplicates based on rollNo or id
      const uniqueStudents = students.filter((student, index, self) => 
        index === self.findIndex(s => s.rollNo === student.rollNo || s.id === student.id)
      );
      
      console.log(`Found ${uniqueStudents.length} unique students`);
      return uniqueStudents;
      
    } catch (e) {
      console.log('Error loading students from storage');
      return [];
    }
  }
  
  private groupStudentsByClass(students: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    students.forEach(student => {
      let className = 'Unknown_Class';
      
      if (student.courseType === 'pu') {
        const year = student.year || '1';
        const division = student.courseDivision || 'general';
        const section = student.batch || student.section || 'A';
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
  
  private createMonthlySheet(year: number, month: number, className: string, students: any[]): XLSX.WorkSheet {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
    
    // Create sheet data
    const sheetData: any[][] = [];
    
    // Title row
    sheetData.push([`${className} - Monthly Attendance - ${monthName} ${year}`]);
    sheetData.push([]);
    
    // Legend
    sheetData.push(['Legend: P = Present, A = Absent, L = Leave, E = Emergency, H = Holiday']);
    sheetData.push([]);
    
    // Header row
    const headerRow = ['Roll No', 'Student Name'];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      headerRow.push(`${day.toString().padStart(2, '0')} (${weekday})`);
    }
    headerRow.push('Present', 'Absent', 'Attendance %');
    sheetData.push(headerRow);
    
    // Student rows
    students.forEach(student => {
      const row = [student.rollNo || 'N/A', student.name || 'Unknown'];
      
      let presentCount = 0;
      let totalDays = 0;
      
      // Add daily attendance (simplified - using current date as reference)
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const status = this.getAttendanceStatus(student, date);
        row.push(status);
        
        if (status !== 'H') { // Not a holiday
          totalDays++;
          if (status === 'P') presentCount++;
        }
      }
      
      // Add summary columns
      const absentCount = totalDays - presentCount;
      const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
      row.push(presentCount, absentCount, `${percentage}%`);
      
      sheetData.push(row);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 10 }, // Roll No
      { wch: 25 }, // Name
      ...Array(daysInMonth).fill({ wch: 8 }), // Days
      { wch: 10 }, // Present
      { wch: 10 }, // Absent
      { wch: 15 }  // Percentage
    ];
    ws['!cols'] = colWidths;
    
    // Merge title row
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }
    ];
    
    return ws;
  }
  
  private getAttendanceStatus(student: any, date: string): string {
    // Check if it's a weekend (simplified)
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0) return 'H'; // Sunday
    
    // Check for leaves
    const leaves = this.getStudentLeaves(student.id || student.rollNo);
    const isOnLeave = leaves.some((leave: any) => {
      const fromDate = new Date(leave.fromDate);
      const toDate = leave.toDate ? new Date(leave.toDate) : fromDate;
      const checkDate = new Date(date);
      return checkDate >= fromDate && checkDate <= toDate;
    });
    
    if (isOnLeave) return 'L';
    
    // Check attendance records
    const hasAttendance = this.checkAttendanceRecord(student.id || student.rollNo, date);
    return hasAttendance ? 'P' : 'A';
  }
  
  private getStudentLeaves(studentId: string): any[] {
    try {
      const leavesData = localStorage.getItem('leaves_data');
      if (leavesData) {
        const leaves = JSON.parse(leavesData);
        return Array.isArray(leaves) ? leaves.filter((leave: any) => 
          leave.studentId === studentId || leave.studentId === studentId.toString()
        ) : [];
      }
    } catch (e) {
      console.log('Error loading leaves');
    }
    return [];
  }
  
  private checkAttendanceRecord(studentId: string, date: string): boolean {
    // Check localStorage for attendance records
    try {
      const attendanceKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('attendance_') && key.includes(date)
      );
      
      for (const key of attendanceKeys) {
        try {
          const attendance = JSON.parse(localStorage.getItem(key) || '{}');
          if (attendance.studentId === studentId && attendance.status === 'present') {
            return true;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('Error checking attendance');
    }
    
    return false;
  }
  
  private async loadHolidaysFromAPI(): Promise<any[]> {
    try {
      const response = await fetch('/api/holidays');
      if (response.ok) {
        const holidays = await response.json();
        return Array.isArray(holidays) ? holidays : [];
      }
    } catch (error) {
      console.log('Could not load holidays from API');
    }
    return [];
  }
}