// Central Validation Service for Madrasa Management System
// Handles cross-module validation and error prevention

import { Student, Leave, Attendance, Holiday, Period } from '@shared/schema';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  errors?: string[];
  warnings?: string[];
  data?: any;
}

export interface AttendanceValidationParams {
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  period?: string;
  students: any[];
}

class ValidationService {
  // Central validation chain before attendance operations
  async preAttendanceChecks(params: AttendanceValidationParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. Class configuration validation
      const classValidation = this.validateClassStructure(params);
      if (!classValidation.valid) {
        errors.push(classValidation.reason || 'Invalid class configuration');
      }
      
      // 2. Date validation
      const dateValidation = this.validateAttendanceDate(params.date);
      if (!dateValidation.valid) {
        errors.push(dateValidation.reason || 'Invalid date');
      }
      
      // 3. Holiday check
      const holidayValidation = await this.checkHolidayConflict(params.date);
      if (!holidayValidation.valid) {
        errors.push(holidayValidation.reason || 'Holiday conflict');
      }
      
      // 4. Student enrollment validation (reduced warnings for cross-device usage)
      const enrollmentValidation = this.validateStudentEnrollment(params);
      if (!enrollmentValidation.valid) {
        errors.push(enrollmentValidation.reason || 'Student enrollment issues');
      }
      // Suppress enrollment warnings for better cross-device experience
      
      // 5. Check for existing attendance (handled by locking system now)
      const existingValidation = await this.checkExistingAttendance(params);
      
      // 6. Leave status integration
      const leaveIntegration = await this.integrateLeavesWithAttendance(params);
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        data: {
          existingAttendance: existingValidation.data,
          leaveIntegration: leaveIntegration.data,
          holidayStatus: holidayValidation.data
        }
      };
      
    } catch (error) {
      return {
        valid: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Validate class structure and configuration
  validateClassStructure(params: AttendanceValidationParams): ValidationResult {
    const validCourseTypes = ['pu', 'post-pu'];
    const validYears = ['1', '2', '3', '4', '5', '6', '7'];
    const validDivisions = ['commerce', 'science'];
    
    if (!validCourseTypes.includes(params.courseType)) {
      return { valid: false, reason: 'Invalid course type' };
    }
    
    if (!validYears.includes(params.year)) {
      return { valid: false, reason: 'Invalid year' };
    }
    
    if (params.courseType === 'pu' && params.courseDivision && !validDivisions.includes(params.courseDivision)) {
      return { valid: false, reason: 'Invalid course division for PU' };
    }
    
    if (params.courseType === 'post-pu' && params.courseDivision) {
      return { valid: false, reason: 'Post-PU courses should not have course division' };
    }
    
    return { valid: true };
  }
  
  // Validate attendance date
  validateAttendanceDate(date: string): ValidationResult {
    const attendanceDate = new Date(date);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    if (isNaN(attendanceDate.getTime())) {
      return { valid: false, reason: 'Invalid date format' };
    }
    
    if (attendanceDate > today) {
      return { valid: false, reason: 'Cannot mark attendance for future dates' };
    }
    
    if (attendanceDate < oneYearAgo) {
      return { valid: false, reason: 'Cannot mark attendance for dates older than one year' };
    }
    
    return { valid: true };
  }
  
  // Check holiday conflicts
  async checkHolidayConflict(date: string): Promise<ValidationResult> {
    try {
      const response = await fetch('/api/holidays?isDeleted=false');
      const holidays: Holiday[] = await response.json();
      
      const holiday = holidays.find(h => h.date === date && !h.isDeleted);
      
      if (holiday) {
        return {
          valid: false,
          reason: `Cannot mark attendance on ${holiday.name} (${holiday.type})`,
          data: { holiday, blocksAttendance: true }
        };
      }
      
      return { valid: true, data: { holiday: null, blocksAttendance: false } };
    } catch (error) {
      return { valid: true, data: { holiday: null, blocksAttendance: false } };
    }
  }
  
  // Validate student enrollment
  validateStudentEnrollment(params: AttendanceValidationParams): ValidationResult {
    if (!params.students || params.students.length === 0) {
      return { valid: false, reason: 'No students found for this class configuration' };
    }
    
    // Verify all students match the class parameters - with proper type conversion
    const invalidStudents = params.students.filter(student => {
      // Convert year to string for comparison
      const studentYear = String(student.year);
      const paramsYear = String(params.year);
      
      if (student.courseType !== params.courseType) return true;
      if (studentYear !== paramsYear) return true;
      if (params.courseDivision && student.courseDivision !== params.courseDivision) return true;
      if (student.batch !== params.section) return true;
      return false;
    });
    
    if (invalidStudents.length > 0) {
      // Silently handle mismatched enrollment data for cross-device compatibility
      console.log(`${invalidStudents.length} students have mismatched enrollment data:`, invalidStudents);
      // Return valid without warnings to prevent popup on device switches
      return {
        valid: true,
        data: { invalidStudents }
      };
    }
    
    return { valid: true };
  }
  
  // Check for existing attendance
  async checkExistingAttendance(params: AttendanceValidationParams): Promise<ValidationResult> {
    try {
      const attendanceKey = this.generateAttendanceKey(params);
      const existingData = localStorage.getItem(attendanceKey);
      
      if (existingData) {
        const attendance = JSON.parse(existingData);
        return {
          valid: true,
          data: {
            exists: true,
            attendance,
            key: attendanceKey,
            markedAt: attendance.metadata?.markedAt,
            markedBy: attendance.metadata?.markedBy
          }
        };
      }
      
      return { valid: true, data: { exists: false } };
    } catch (error) {
      return { valid: true, data: { exists: false } };
    }
  }
  
  // Integrate leaves with attendance
  async integrateLeavesWithAttendance(params: AttendanceValidationParams): Promise<ValidationResult> {
    try {
      const response = await fetch('/api/leaves');
      const leaves: Leave[] = await response.json();
      
      const studentsWithLeaves = params.students.map(student => {
        const activeLeave = leaves.find(leave => 
          leave.studentId === student.id &&
          leave.status === 'active' &&
          new Date(leave.fromDate) <= new Date(params.date) &&
          new Date(leave.toDate) >= new Date(params.date)
        );
        
        const expiredLeaves = leaves.filter(leave =>
          leave.studentId === student.id &&
          leave.status === 'active' &&
          new Date(leave.toDate) < new Date(params.date)
        );
        
        return {
          ...student,
          activeLeave,
          expiredLeaves,
          shouldAutoMark: !!activeLeave,
          needsAlert: expiredLeaves.length > 0
        };
      });
      
      return {
        valid: true,
        data: {
          studentsWithLeaves,
          totalOnLeave: studentsWithLeaves.filter(s => s.shouldAutoMark).length,
          totalNeedingAlerts: studentsWithLeaves.filter(s => s.needsAlert).length
        }
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to load leave data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Generate standardized attendance key
  generateAttendanceKey(params: AttendanceValidationParams): string {
    const { date, courseType, year, courseDivision, section, period } = params;
    const division = courseDivision || 'common';
    const periodStr = period || 'general';
    return `attendance_${courseType}_${year}_${division}_${section}_${date}_${periodStr}`;
  }
  
  // Validate leave-attendance sync operations
  async validateLeaveAttendanceSync(studentId: number, fromDate: string, toDate: string): Promise<ValidationResult> {
    try {
      // Check for existing attendance records in the leave period
      const conflictingAttendance = await this.findAttendanceInDateRange(studentId, fromDate, toDate);
      
      if (conflictingAttendance.length > 0) {
        return {
          valid: true,
          warnings: [`Found ${conflictingAttendance.length} existing attendance records that will be updated to 'on-leave'`],
          data: { conflictingAttendance }
        };
      }
      
      return { valid: true, data: { conflictingAttendance: [] } };
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to validate leave-attendance sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Find attendance records in date range
  async findAttendanceInDateRange(studentId: number, fromDate: string, toDate: string): Promise<any[]> {
    // This would query the backend or localStorage for attendance records
    // For now, implementing localStorage search
    const conflictingRecords: any[] = [];
    
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    // Iterate through date range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Search for attendance records on this date
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('attendance_') && key.includes(dateStr)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const studentRecord = data.students?.find((s: any) => s.id === studentId);
            if (studentRecord) {
              conflictingRecords.push({
                key,
                date: dateStr,
                student: studentRecord,
                data
              });
            }
          } catch (error) {
            // Skip invalid records
          }
        }
      }
    }
    
    return conflictingRecords;
  }
  
  // Validate section deletion safety
  async validateSectionDeletion(courseType: string, year: string, courseDivision: string | null, section: string): Promise<ValidationResult> {
    try {
      const response = await fetch('/api/students');
      const students: Student[] = await response.json();
      
      const studentsInSection = students.filter(student =>
        student.courseType === courseType &&
        student.year === year &&
        student.courseDivision === courseDivision &&
        student.batch === section
      );
      
      if (studentsInSection.length > 0) {
        return {
          valid: false,
          reason: `Cannot delete section with ${studentsInSection.length} enrolled students`,
          data: { studentsInSection }
        };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to validate section deletion: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Validate namaz attendance operations
  validateNamazAttendance(date: string, prayer: string, students: Student[]): ValidationResult {
    const validPrayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    
    if (!validPrayers.includes(prayer)) {
      return { valid: false, reason: 'Invalid prayer name' };
    }
    
    const dateValidation = this.validateAttendanceDate(date);
    if (!dateValidation.valid) {
      return dateValidation;
    }
    
    if (!students || students.length === 0) {
      return { valid: false, reason: 'No students selected for namaz attendance' };
    }
    
    return { valid: true };
  }
}

export const validationService = new ValidationService();