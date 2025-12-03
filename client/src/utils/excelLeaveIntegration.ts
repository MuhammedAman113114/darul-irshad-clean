import * as XLSX from 'xlsx';
import { leaveSyncService } from '@/lib/leaveSyncService';

export interface ExcelExportOptions {
  type: 'attendance' | 'namaz';
  startDate: string;
  endDate: string;
  students: any[];
  classInfo?: {
    courseType: string;
    year: string;
    courseDivision?: string;
    section?: string;
  };
}

export class ExcelLeaveIntegration {
  /**
   * Generate Excel data with comprehensive leave status integration
   */
  static async generateExcelWithLeaveStatus(options: ExcelExportOptions): Promise<any[]> {
    const { type, startDate, endDate, students, classInfo } = options;
    const data: any[] = [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString();
      
      for (const student of students) {
        const isOnLeave = await leaveSyncService.isStudentOnLeave(student.id, dateStr);
        const leaveInfo = isOnLeave ? await leaveSyncService.getStudentLeaveInfo(student.id, dateStr) : null;
        
        if (type === 'attendance') {
          data.push({
            'Date': formattedDate,
            'Student Name': student.name,
            'Roll No': student.rollNo,
            'Class': this.formatClassName(student, classInfo),
            'Period 1': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period1'),
            'Period 2': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period2'),
            'Period 3': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period3'),
            'Period 4': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period4'),
            'Period 5': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period5'),
            'Period 6': isOnLeave ? 'L' : this.getStoredAttendanceStatus(student.id, dateStr, 'period6'),
            'Leave Status': isOnLeave ? 'On Leave' : 'Active',
            'Leave Reason': leaveInfo?.reason || '',
            'Leave Period': leaveInfo ? `${new Date(leaveInfo.fromDate).toLocaleDateString()} - ${new Date(leaveInfo.toDate).toLocaleDateString()}` : ''
          });
        } else if (type === 'namaz') {
          data.push({
            'Date': formattedDate,
            'Student Name': student.name,
            'Roll No': student.rollNo,
            'Class': this.formatClassName(student, classInfo),
            'Fajr': isOnLeave ? 'L' : this.getStoredNamazStatus(student.id, dateStr, 'fajr'),
            'Dhuhr': isOnLeave ? 'L' : this.getStoredNamazStatus(student.id, dateStr, 'zuhr'),
            'Asr': isOnLeave ? 'L' : this.getStoredNamazStatus(student.id, dateStr, 'asr'),
            'Maghrib': isOnLeave ? 'L' : this.getStoredNamazStatus(student.id, dateStr, 'maghrib'),
            'Isha': isOnLeave ? 'L' : this.getStoredNamazStatus(student.id, dateStr, 'isha'),
            'Leave Status': isOnLeave ? 'On Leave' : 'Active',
            'Leave Reason': leaveInfo?.reason || '',
            'Daily Summary': isOnLeave ? 'All prayers marked as Leave' : this.calculateNamazDailySummary(student.id, dateStr)
          });
        }
      }
    }
    
    return data;
  }

  /**
   * Format class name for display
   */
  private static formatClassName(student: any, classInfo?: any): string {
    const info = classInfo || student;
    const yearSuffix = info.courseType === 'pu' ? 
      (info.year === '1' ? '1st PU' : '2nd PU') : 
      `${info.year}${this.getOrdinalSuffix(info.year)} Year`;
    
    let className = yearSuffix;
    if (info.courseDivision) {
      className += ` ${info.courseDivision.charAt(0).toUpperCase() + info.courseDivision.slice(1)}`;
    }
    if (info.section || info.batch) {
      className += ` Section ${info.section || info.batch}`;
    }
    
    return className;
  }

  /**
   * Get ordinal suffix for numbers
   */
  private static getOrdinalSuffix(num: string): string {
    const n = parseInt(num);
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  }

  /**
   * Get stored attendance status from localStorage
   */
  private static getStoredAttendanceStatus(studentId: number, date: string, period: string): string {
    try {
      // This would need to be implemented based on your storage structure
      // For now, return default
      return '-';
    } catch (error) {
      return '-';
    }
  }

  /**
   * Get stored namaz status from localStorage
   */
  private static getStoredNamazStatus(studentId: number, date: string, prayer: string): string {
    try {
      const storageKey = `namaz_${prayer}_${date}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        const studentRecord = data.students?.find((s: any) => s.id === studentId);
        if (studentRecord) {
          return studentRecord.status === 'present' ? 'P' : 'A';
        }
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  }

  /**
   * Calculate daily namaz summary
   */
  private static calculateNamazDailySummary(studentId: number, date: string): string {
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    let presentCount = 0;
    let totalMarked = 0;

    for (const prayer of prayers) {
      const status = this.getStoredNamazStatus(studentId, date, prayer);
      if (status !== '-') {
        totalMarked++;
        if (status === 'P') {
          presentCount++;
        }
      }
    }

    if (totalMarked === 0) return 'No prayers marked';
    return `${presentCount}/${totalMarked} prayers present`;
  }

  /**
   * Create comprehensive Excel workbook with leave integration
   */
  static async createLeaveIntegratedWorkbook(options: ExcelExportOptions): Promise<XLSX.WorkBook> {
    const data = await this.generateExcelWithLeaveStatus(options);
    const wb = XLSX.utils.book_new();
    
    // Create main data sheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 25 }, // Student Name
      { wch: 10 }, // Roll No
      { wch: 20 }, // Class
      ...Array(options.type === 'attendance' ? 6 : 5).fill({ wch: 10 }), // Period/Prayer columns
      { wch: 15 }, // Leave Status
      { wch: 30 }, // Leave Reason
      { wch: 25 }  // Additional info
    ];
    ws['!cols'] = colWidths;
    
    // Add sheet to workbook
    const sheetName = options.type === 'attendance' ? 'Attendance Report' : 'Namaz Report';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Create summary sheet
    const summarySheet = this.createSummarySheet(data, options);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    return wb;
  }

  /**
   * Create summary sheet with leave statistics
   */
  private static createSummarySheet(data: any[], options: ExcelExportOptions): XLSX.WorkSheet {
    const summary = [];
    
    // Calculate statistics
    const totalRecords = data.length;
    const leaveRecords = data.filter(record => record['Leave Status'] === 'On Leave').length;
    const activeRecords = totalRecords - leaveRecords;
    
    summary.push(['Report Type', options.type.charAt(0).toUpperCase() + options.type.slice(1)]);
    summary.push(['Date Range', `${options.startDate} to ${options.endDate}`]);
    summary.push(['Total Records', totalRecords]);
    summary.push(['Active Students', activeRecords]);
    summary.push(['Students on Leave', leaveRecords]);
    summary.push(['Leave Percentage', `${totalRecords > 0 ? Math.round((leaveRecords / totalRecords) * 100) : 0}%`]);
    
    summary.push([]);
    summary.push(['Legend:']);
    summary.push(['P', 'Present']);
    summary.push(['A', 'Absent']);
    summary.push(['L', 'On Leave']);
    summary.push(['-', 'Not Marked']);
    
    return XLSX.utils.aoa_to_sheet(summary);
  }
}

export default ExcelLeaveIntegration;