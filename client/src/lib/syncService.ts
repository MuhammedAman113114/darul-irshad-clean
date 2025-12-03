// Sync Service for Leave-Attendance Integration
// Handles bidirectional sync and prevents race conditions

import { validationService } from './validationService';
import { Student, Leave, Attendance } from '@shared/schema';

export interface SyncResult {
  success: boolean;
  message: string;
  updatedRecords?: number;
  errors?: string[];
}

export interface AttendanceOverwriteOptions {
  confirmed: boolean;
  preserveManualEntries?: boolean;
  auditTrail?: boolean;
}

class SyncService {
  // Sync leave approval with existing attendance records
  async syncLeaveWithPastAttendance(
    studentId: number, 
    fromDate: string, 
    toDate: string,
    leaveReason: string,
    approvedBy: number
  ): Promise<SyncResult> {
    try {
      // Find conflicting attendance records
      const conflicts = await validationService.findAttendanceInDateRange(studentId, fromDate, toDate);
      
      if (conflicts.length === 0) {
        return {
          success: true,
          message: 'No conflicting attendance records found',
          updatedRecords: 0
        };
      }
      
      const updatedRecords: string[] = [];
      const errors: string[] = [];
      
      // Update each conflicting record
      for (const conflict of conflicts) {
        try {
          const updatedData = { ...conflict.data };
          
          // Find and update the student's attendance status
          const studentIndex = updatedData.students.findIndex(
            (s: any) => s.id === studentId
          );
          
          if (studentIndex !== -1) {
            // Preserve original status for audit trail
            const originalStatus = updatedData.students[studentIndex].status;
            
            updatedData.students[studentIndex] = {
              ...updatedData.students[studentIndex],
              status: 'on-leave',
              isAutoMarked: true,
              leaveReason: leaveReason,
              originalStatus: originalStatus,
              syncedAt: new Date().toISOString(),
              syncedBy: approvedBy
            };
            
            // Update metadata
            updatedData.metadata = {
              ...updatedData.metadata,
              lastSynced: new Date().toISOString(),
              syncReason: 'Leave approved after attendance marked',
              originalAttendancePreserved: true
            };
            
            // Save back to localStorage
            localStorage.setItem(conflict.key, JSON.stringify(updatedData));
            updatedRecords.push(conflict.key);
          }
        } catch (error) {
          errors.push(`Failed to update ${conflict.key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        success: errors.length === 0,
        message: `Updated ${updatedRecords.length} attendance records`,
        updatedRecords: updatedRecords.length,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Handle attendance overwrite with confirmation
  async handleAttendanceOverwrite(
    attendanceKey: string,
    newAttendanceData: any,
    options: AttendanceOverwriteOptions
  ): Promise<SyncResult> {
    try {
      if (!options.confirmed) {
        const existingData = localStorage.getItem(attendanceKey);
        if (existingData) {
          return {
            success: false,
            message: 'Attendance already exists. Confirmation required to overwrite.'
          };
        }
      }
      
      // Preserve audit trail
      if (options.auditTrail) {
        const existingData = localStorage.getItem(attendanceKey);
        if (existingData) {
          const backupKey = `${attendanceKey}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, existingData);
          
          newAttendanceData.metadata = {
            ...newAttendanceData.metadata,
            previousVersion: backupKey,
            overwrittenAt: new Date().toISOString()
          };
        }
      }
      
      localStorage.setItem(attendanceKey, JSON.stringify(newAttendanceData));
      
      return {
        success: true,
        message: 'Attendance updated successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to update attendance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Check for leave-attendance conflicts in real-time
  async checkLeaveConflicts(
    date: string,
    courseType: string,
    year: string,
    courseDivision: string | null,
    section: string,
    period: string
  ): Promise<{hasConflicts: boolean; conflicts: any[]}> {
    try {
      const attendanceKey = validationService.generateAttendanceKey({
        date, courseType, year, courseDivision, section, period, students: []
      });
      
      const existingData = localStorage.getItem(attendanceKey);
      if (!existingData) {
        return { hasConflicts: false, conflicts: [] };
      }
      
      const attendance = JSON.parse(existingData);
      const response = await fetch('/api/leaves');
      const leaves: Leave[] = await response.json();
      
      const conflicts = attendance.students.filter((student: any) => {
        const hasActiveLeave = leaves.some(leave =>
          leave.studentId === student.id &&
          leave.status === 'active' &&
          new Date(leave.fromDate) <= new Date(date) &&
          new Date(leave.toDate) >= new Date(date)
        );
        
        return hasActiveLeave && student.status !== 'on-leave';
      });
      
      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
      
    } catch (error) {
      return { hasConflicts: false, conflicts: [] };
    }
  }
  
  // Update notification counts after sync operations
  async updateNotificationCounts(): Promise<void> {
    try {
      const response = await fetch('/api/leaves');
      const leaves: Leave[] = await response.json();
      
      const today = new Date().toISOString().split('T')[0];
      
      const alertCount = leaves.filter(leave => {
        const leaveEndDate = new Date(leave.toDate);
        const currentDate = new Date(today);
        return leave.status === 'active' && leaveEndDate < currentDate;
      }).length;
      
      // Trigger notification update event
      window.dispatchEvent(new CustomEvent('notificationUpdate', {
        detail: { alertCount }
      }));
      
    } catch (error) {
      console.error('Failed to update notification counts:', error);
    }
  }
  
  // Validate section deletion safety
  async validateSectionDeletion(
    courseType: string,
    year: string,
    courseDivision: string | null,
    section: string
  ): Promise<{canDelete: boolean; studentsCount: number; attendanceRecords: number}> {
    try {
      // Check for enrolled students
      const response = await fetch('/api/students');
      const students: Student[] = await response.json();
      
      const enrolledStudents = students.filter(student =>
        student.courseType === courseType &&
        student.year === year &&
        student.courseDivision === courseDivision &&
        student.batch === section
      );
      
      // Check for attendance records
      let attendanceCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('attendance_') && 
            key.includes(`${courseType}_${year}_${courseDivision || 'common'}_${section}`)) {
          attendanceCount++;
        }
      }
      
      return {
        canDelete: enrolledStudents.length === 0,
        studentsCount: enrolledStudents.length,
        attendanceRecords: attendanceCount
      };
      
    } catch (error) {
      return {
        canDelete: false,
        studentsCount: 0,
        attendanceRecords: 0
      };
    }
  }
  
  // Archive section data before deletion
  async archiveSectionData(
    courseType: string,
    year: string,
    courseDivision: string | null,
    section: string
  ): Promise<SyncResult> {
    try {
      const archiveData = {
        sectionInfo: { courseType, year, courseDivision, section },
        archivedAt: new Date().toISOString(),
        students: [],
        attendanceRecords: []
      };
      
      // Collect student data
      const response = await fetch('/api/students');
      const students: Student[] = await response.json();
      
      archiveData.students = students.filter(student =>
        student.courseType === courseType &&
        student.year === year &&
        student.courseDivision === courseDivision &&
        student.batch === section
      );
      
      // Collect attendance records
      const attendanceKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('attendance_') && 
            key.includes(`${courseType}_${year}_${courseDivision || 'common'}_${section}`)) {
          attendanceKeys.push(key);
          const data = localStorage.getItem(key);
          if (data) {
            archiveData.attendanceRecords.push({
              key,
              data: JSON.parse(data)
            });
          }
        }
      }
      
      // Save archive
      const archiveKey = `archive_section_${courseType}_${year}_${courseDivision || 'common'}_${section}_${Date.now()}`;
      localStorage.setItem(archiveKey, JSON.stringify(archiveData));
      
      return {
        success: true,
        message: `Archived ${archiveData.students.length} students and ${archiveData.attendanceRecords.length} attendance records`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Archive failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // Sync student data across all modules after CRUD operations
  syncStudentData(): void {
    try {
      // Trigger re-sync of all modules that depend on student data
      const event = new CustomEvent('studentDataChanged', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
      
      // Update localStorage flags to trigger module refresh
      localStorage.setItem('studentDataLastSync', Date.now().toString());
      
      // Log sync operation
      console.log('Student data synchronized across all modules');
      
    } catch (error) {
      console.error('Failed to sync student data:', error);
    }
  }

  // Prevent concurrent write operations
  private operationLocks = new Set<string>();
  
  async withLock<T>(lockKey: string, operation: () => Promise<T>): Promise<T> {
    if (this.operationLocks.has(lockKey)) {
      throw new Error(`Operation ${lockKey} is already in progress`);
    }
    
    this.operationLocks.add(lockKey);
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }
  
  // Create audit trail for all operations
  createAuditEntry(operation: string, details: any, userId?: number): void {
    const auditEntry = {
      operation,
      details,
      timestamp: new Date().toISOString(),
      userId: userId || 0,
      sessionId: this.getSessionId()
    };
    
    const auditKey = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(auditKey, JSON.stringify(auditEntry));
    
    // Keep only last 1000 audit entries
    this.cleanupAuditTrail();
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
  
  private cleanupAuditTrail(): void {
    const auditKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('audit_')) {
        auditKeys.push(key);
      }
    }
    
    if (auditKeys.length > 1000) {
      // Sort by timestamp and remove oldest entries
      auditKeys.sort();
      const toRemove = auditKeys.slice(0, auditKeys.length - 1000);
      toRemove.forEach(key => localStorage.removeItem(key));
    }
  }
}

export const syncService = new SyncService();