// Excel Calendar Sync Utility for Professional Monthly Attendance Sheets
import * as XLSX from 'xlsx';

interface CalendarEvent {
  date: string;
  type: 'holiday' | 'leave' | 'emergency';
  studentId?: string;
  reason?: string;
  name?: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  rollNo: string;
  date: string;
  period: number;
  status: 'present' | 'absent' | 'leave';
}

interface ClassConfig {
  courseType: 'pu' | 'post-pu';
  year: string;
  courseDivision?: string;
  section?: string;
  periodsPerDay: number;
}

interface MonthlySheetData {
  classConfig: ClassConfig;
  month: number;
  year: number;
  students: Array<{
    rollNo: string;
    name: string;
    id: string;
  }>;
  attendanceData: Map<string, Map<string, 'P' | 'A' | 'L' | 'E' | 'H'>>;
  workingDays: number;
  holidays: string[];
}

export class ExcelCalendarSync {
  private calendarEvents: CalendarEvent[] = [];
  private attendanceRecords: AttendanceRecord[] = [];

  constructor() {
    // Data will be loaded asynchronously when needed
  }

  private async loadCalendarEvents(): Promise<void> {
    try {
      this.calendarEvents = [];
      
      // Load holidays from API
      try {
        const holidaysResponse = await fetch('/api/holidays');
        if (holidaysResponse.ok) {
          const holidays = await holidaysResponse.json();
          holidays.forEach((holiday: any) => {
            this.calendarEvents.push({
              date: holiday.date,
              type: holiday.type === 'emergency' ? 'emergency' as const : 'holiday' as const,
              name: holiday.name || 'Holiday',
              reason: holiday.reason || holiday.description
            });
          });
        }
      } catch (e) {
        console.log('Could not load holidays from API');
      }

      // Load leaves from localStorage using the correct key structure
      try {
        const leavesData = localStorage.getItem('leaves_data');
        if (leavesData) {
          const leaves = JSON.parse(leavesData);
          if (Array.isArray(leaves)) {
            leaves.forEach((leave: any) => {
              if (leave.fromDate && leave.studentId) {
                // Handle single day and multi-day leaves
                const fromDate = new Date(leave.fromDate);
                const toDate = leave.toDate ? new Date(leave.toDate) : fromDate;
                
                // Add each day in the leave period
                for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                  this.calendarEvents.push({
                    date: d.toISOString().split('T')[0],
                    type: 'leave' as const,
                    studentId: leave.studentId.toString(),
                    reason: leave.reason || 'Personal Leave'
                  });
                }
              }
            });
          }
        }
      } catch (e) {
        console.log('Error loading leaves from localStorage');
      }

      console.log(`Loaded ${this.calendarEvents.length} calendar events`);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  }

  private loadAttendanceData(): void {
    // Load from localStorage attendance data
    try {
      const attendanceKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('attendance_') && key.includes('_lecture')
      );

      this.attendanceRecords = [];
      attendanceKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const keyParts = key.replace('attendance_', '').split('_');
          
          if (keyParts.length >= 7 && data.students) {
            const date = keyParts[4];
            const period = parseInt(keyParts[5]);
            
            data.students.forEach((student: any) => {
              this.attendanceRecords.push({
                studentId: student.rollNo,
                studentName: student.studentName || student.name,
                rollNo: student.rollNo,
                date,
                period,
                status: student.status
              });
            });
          }
        } catch (e) {
          console.log('Error parsing attendance key:', key);
        }
      });
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  }

  private getStatusForDate(studentId: string, date: string): 'P' | 'A' | 'L' | 'E' | 'H' {
    // Check if it's a holiday first
    const holiday = this.calendarEvents.find(e => 
      e.type === 'holiday' && e.date === date
    );
    if (holiday) return 'H';

    // Check for emergency leave (match by student roll number or ID)
    const emergencyLeave = this.calendarEvents.find(e => 
      e.type === 'emergency' && e.date === date && 
      (e.studentId === studentId || e.studentId === studentId.toString())
    );
    if (emergencyLeave) return 'E';

    // Check for regular leave (match by student roll number or ID)
    const leave = this.calendarEvents.find(e => 
      e.type === 'leave' && e.date === date && 
      (e.studentId === studentId || e.studentId === studentId.toString())
    );
    if (leave) return 'L';

    // Check attendance records for this date
    const dayAttendance = this.attendanceRecords.filter(r => 
      (r.studentId === studentId || r.rollNo === studentId) && r.date === date
    );
    
    if (dayAttendance.length === 0) return 'A'; // No record = absent
    
    // If any period shows present, mark as present
    const hasPresent = dayAttendance.some(r => r.status === 'present');
    return hasPresent ? 'P' : 'A';
  }

  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private getWorkingDays(year: number, month: number): number {
    const daysInMonth = this.getDaysInMonth(year, month);
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isHoliday = this.calendarEvents.some(e => 
        e.type === 'holiday' && e.date === date
      );
      
      if (!isHoliday) {
        workingDays++;
      }
    }
    
    return workingDays;
  }

  private getWeekdayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  private createClassSheetName(classConfig: ClassConfig): string {
    if (classConfig.courseType === 'pu') {
      const division = classConfig.courseDivision?.charAt(0).toUpperCase() || '';
      const section = classConfig.section || '';
      return `PU${classConfig.year}_${division}${section}`;
    } else {
      return `PostPUC${classConfig.year}`;
    }
  }

  private createMonthlySheet(sheetData: MonthlySheetData): XLSX.WorkSheet {
    const { classConfig, month, year, students, workingDays } = sheetData;
    const daysInMonth = this.getDaysInMonth(year, month);
    
    // Create sheet data array
    const sheetArray: any[][] = [];

    // Title and Summary Section
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
    let className = '';
    if (classConfig.courseType === 'pu') {
      const yearSuffix = classConfig.year === '1' ? 'st' : classConfig.year === '2' ? 'nd' : 'rd';
      const division = classConfig.courseDivision?.charAt(0).toUpperCase() + classConfig.courseDivision?.slice(1) || '';
      const section = classConfig.section ? ` - Section ${classConfig.section}` : '';
      className = `PU ${classConfig.year}${yearSuffix} Year - ${division}${section}`;
    } else {
      const yearSuffix = classConfig.year === '3' ? 'rd' : 'th';
      className = `Post-PUC ${classConfig.year}${yearSuffix} Year`;
    }

    // Summary Table
    sheetArray.push([`${className} - Attendance Sheet`]);
    sheetArray.push([]);
    sheetArray.push(['Month:', monthName, '', 'Year:', year]);
    sheetArray.push(['Class:', className]);
    sheetArray.push(['Working Days:', workingDays, '', 'Total Days:', daysInMonth]);
    sheetArray.push([]);

    // Legend with color descriptions
    sheetArray.push(['Legend with Color Coding:']);
    sheetArray.push(['P = Present (Green Background)', 'A = Absent (Red Background)', 'L = Leave (Yellow Background)', 'E = Emergency (Orange Background)', 'H = Holiday (Gray Background)']);
    sheetArray.push([]);

    // Header Row
    const headerRow = ['Roll No', 'Student Name'];
    
    // Add date columns
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = this.getWeekdayName(date);
      headerRow.push(`${day.toString().padStart(2, '0')} (${weekday})`);
    }
    
    // Add summary columns
    headerRow.push('Present', 'Absent', 'Leave', 'Emergency', 'Attendance %');
    sheetArray.push(headerRow);

    // Student Data Rows
    students.forEach(student => {
      const row = [student.rollNo, student.name];
      
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let emergencyCount = 0;
      let attendableDays = 0;

      // Add daily attendance
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const status = this.getStatusForDate(student.id.toString(), date);
        
        // Add status with reason if available
        let cellValue: string = status;
        const event = this.calendarEvents.find(e => 
          e.date === date && 
          (e.type === 'holiday' || (e.studentId && (e.studentId === student.id.toString() || e.studentId === student.rollNo)))
        );
        if (event && event.reason) {
          cellValue = `${status} (${event.reason})`;
        }
        
        row.push(cellValue);
        
        if (status === 'H') {
          // Holiday - doesn't count toward attendance
        } else {
          attendableDays++;
          if (status === 'P') presentCount++;
          else if (status === 'A') absentCount++;
          else if (status === 'L') leaveCount++;
          else if (status === 'E') emergencyCount++;
        }
      }

      // Calculate attendance percentage
      const attendancePercentage = attendableDays > 0 ? Math.round((presentCount / attendableDays) * 100) : 0;

      // Add summary columns
      row.push(presentCount, absentCount, leaveCount, emergencyCount, `${attendancePercentage}%`);
      sheetArray.push(row);
    });

    // Daily Summary Row
    const summaryRow = ['', 'DAILY TOTALS:'];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayTotal = students.reduce((total, student) => {
        const status = this.getStatusForDate(student.id.toString(), date);
        return status === 'P' ? total + 1 : total;
      }, 0);
      summaryRow.push(dayTotal);
    }
    summaryRow.push('', '', '', '', ''); // Empty summary columns
    sheetArray.push(summaryRow);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetArray);

    // Add cell styling for color coding
    const headerRowIndex = 9; // 0-indexed row where student data starts
    students.forEach((student, studentIndex) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const status = this.getStatusForDate(student.id, date);
        const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex + 1 + studentIndex, c: 1 + day });
        
        // Create cell style based on status
        let fill: any = {};
        switch (status) {
          case 'P':
            fill = { fgColor: { rgb: "90EE90" } }; // Light Green
            break;
          case 'A':
            fill = { fgColor: { rgb: "FFB6C1" } }; // Light Red
            break;
          case 'L':
            fill = { fgColor: { rgb: "FFFFE0" } }; // Light Yellow
            break;
          case 'E':
            fill = { fgColor: { rgb: "FFE4B5" } }; // Light Orange
            break;
          case 'H':
            fill = { fgColor: { rgb: "D3D3D3" } }; // Light Gray
            break;
        }
        
        if (ws[cellAddress]) {
          ws[cellAddress].s = { fill };
        }
      }
    });

    // Set column widths
    const colWidths = [
      { wch: 10 }, // Roll No
      { wch: 25 }, // Student Name
      ...Array(daysInMonth).fill({ wch: 12 }), // Date columns (wider for reasons)
      { wch: 10 }, // Present
      { wch: 10 }, // Absent
      { wch: 10 }, // Leave
      { wch: 12 }, // Emergency
      { wch: 15 }  // Attendance %
    ];
    ws['!cols'] = colWidths;

    // Merge title row
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }
    ];

    // Freeze panes (header + name columns)
    ws['!freeze'] = { xSplit: 2, ySplit: headerRowIndex };

    return ws;
  }

  public async exportMonthlyAttendanceSheets(year: number, month: number): Promise<void> {
    try {
      console.log(`Starting export for ${year}-${month}`);
      
      // Load data asynchronously
      console.log("Loading calendar events...");
      await this.loadCalendarEvents();
      console.log("Loading attendance data...");
      this.loadAttendanceData();

      // Get all unique class configurations from attendance data
      const classConfigs = new Map<string, ClassConfig>();
      const studentsByClass = new Map<string, Array<{ rollNo: string; name: string; id: string }>>();

      // Extract class configurations and students from attendance data
      this.attendanceRecords.forEach(record => {
        const keyParts = Object.keys(localStorage)
          .find(key => key.includes(record.date) && key.includes(record.rollNo))
          ?.replace('attendance_', '')
          ?.split('_');

        if (keyParts && keyParts.length >= 7) {
          const courseType = keyParts[0] as 'pu' | 'post-pu';
          const yearNum = keyParts[1];
          const division = keyParts[2];
          const section = keyParts[3];

          const classKey = `${courseType}_${yearNum}_${division}_${section}`;
          
          if (!classConfigs.has(classKey)) {
            const periodsPerDay = courseType === 'pu' ? (yearNum <= '2' ? 6 : 7) : 8;
            classConfigs.set(classKey, {
              courseType,
              year: yearNum,
              courseDivision: division !== 'none' ? division : undefined,
              section: section !== 'single' ? section : undefined,
              periodsPerDay
            });
            studentsByClass.set(classKey, []);
          }

          const students = studentsByClass.get(classKey)!;
          if (!students.find(s => s.id === record.studentId)) {
            students.push({
              rollNo: record.rollNo,
              name: record.studentName,
              id: record.studentId
            });
          }
        }
      });

      if (classConfigs.size === 0) {
        throw new Error('No class configurations found in attendance data');
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create sheet for each class
      Array.from(classConfigs.entries()).forEach(([classKey, classConfig]) => {
        const students = studentsByClass.get(classKey) || [];
        const workingDays = this.getWorkingDays(year, month);

        const sheetData: MonthlySheetData = {
          classConfig,
          month,
          year,
          students: students.sort((a, b) => parseInt(a.rollNo) - parseInt(b.rollNo)),
          attendanceData: new Map(),
          workingDays,
          holidays: this.calendarEvents
            .filter(e => e.type === 'holiday')
            .map(e => e.date)
        };

        const ws = this.createMonthlySheet(sheetData);
        const sheetName = this.createClassSheetName(classConfig);
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Create summary sheet
      const summaryData = [
        [`Monthly Attendance Summary - ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`],
        [],
        ['Class', 'Total Students', 'Working Days', 'Average Attendance %'],
        []
      ];

      Array.from(classConfigs.entries()).forEach(([classKey, classConfig]) => {
        const students = studentsByClass.get(classKey) || [];
        const workingDays = this.getWorkingDays(year, month);
        
        // Calculate average attendance for this class
        let totalPresent = 0;
        let totalAttendable = 0;

        students.forEach(student => {
          const daysInMonth = this.getDaysInMonth(year, month);
          for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const status = this.getStatusForDate(student.id, date);
            
            if (status !== 'H') {
              totalAttendable++;
              if (status === 'P') totalPresent++;
            }
          }
        });

        const avgAttendance = totalAttendable > 0 ? Math.round((totalPresent / totalAttendable) * 100) : 0;
        let className = '';
        if (classConfig.courseType === 'pu') {
          const yearSuffix = classConfig.year === '1' ? 'st' : classConfig.year === '2' ? 'nd' : 'rd';
          const division = classConfig.courseDivision?.charAt(0).toUpperCase() + classConfig.courseDivision?.slice(1) || '';
          const section = classConfig.section ? ` - Section ${classConfig.section}` : '';
          className = `PU ${classConfig.year}${yearSuffix} Year - ${division}${section}`;
        } else {
          const yearSuffix = classConfig.year === '3' ? 'rd' : 'th';
          className = `Post-PUC ${classConfig.year}${yearSuffix} Year`;
        }

        summaryData.push([className, students.length, workingDays, `${avgAttendance}%`]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
      summaryWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
      
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate filename
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
      const filename = `Attendance_${monthName}_${year}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      return Promise.resolve();
    } catch (error) {
      console.error('Error exporting monthly sheets:', error);
      throw error;
    }
  }
}