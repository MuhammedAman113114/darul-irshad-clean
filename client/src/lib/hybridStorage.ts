/**
 * Hybrid Storage System - Database Primary with Local Offline Support
 * 
 * This system prioritizes database storage while maintaining local copies for offline use.
 * It automatically syncs data when online and falls back to local storage when offline.
 */

interface Student {
  id: number;
  name: string;
  rollNo: string;
  dob: string;
  fatherName: string;
  motherName: string;
  address: string;
  bloodGroup: string;
  aadharNumber: string;
  photoUrl?: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  batch: string;
  attendance?: string;
  grade?: string;
  onLeave?: boolean;
}

interface AttendanceRecord {
  id?: number;
  studentId: number;
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  period: number;
  status: 'present' | 'absent';
  remarks?: string;
}

interface NamazRecord {
  id?: number;
  studentId: number;
  date: string;
  fajr: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  remarks?: string;
}

interface LeaveRecord {
  id?: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'active' | 'cancelled';
  createdBy?: string;
  createdAt?: string;
}

export class HybridStorage {
  private static instance: HybridStorage;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: Array<{ action: string; data: any; timestamp: number }> = [];
  private lastSyncTime: number = 0;

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithDatabase();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load sync queue from localStorage
    this.loadSyncQueue();
    
    // Periodic sync when online
    setInterval(() => {
      if (this.isOnline) {
        this.syncWithDatabase();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  static getInstance(): HybridStorage {
    if (!HybridStorage.instance) {
      HybridStorage.instance = new HybridStorage();
    }
    return HybridStorage.instance;
  }

  /**
   * STUDENT MANAGEMENT
   */
  async saveStudent(student: Student): Promise<boolean> {
    try {
      // Always save to localStorage first for immediate access
      this.saveStudentToLocal(student);

      if (this.isOnline) {
        // Try to save to database
        const response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(student)
        });

        if (response.ok) {
          const savedStudent = await response.json();
          // Update localStorage with the database ID
          student.id = savedStudent.id;
          this.saveStudentToLocal(student);
          console.log('✅ Student saved to database and localStorage');
          return true;
        } else {
          // Queue for later sync if database save fails
          this.addToSyncQueue('saveStudent', student);
        }
      } else {
        // Queue for sync when back online
        this.addToSyncQueue('saveStudent', student);
      }

      console.log('📱 Student saved to localStorage (offline mode)');
      return true;
    } catch (error) {
      console.error('Error saving student:', error);
      // Ensure data is at least saved locally
      this.saveStudentToLocal(student);
      this.addToSyncQueue('saveStudent', student);
      return true; // Return true because data is saved locally
    }
  }

  async getStudents(courseType: string, year: string, courseDivision?: string, section?: string): Promise<Student[]> {
    try {
      if (this.isOnline) {
        // Try to fetch from database first
        const params = new URLSearchParams({
          courseType,
          year,
          ...(courseDivision && { courseDivision }),
          ...(section && { section })
        });

        const response = await fetch(`/api/students?${params}`);
        if (response.ok) {
          const students = await response.json();
          // Update localStorage with fresh data
          this.updateLocalStudents(students, courseType, year, courseDivision, section);
          return students;
        }
      }

      // Fallback to localStorage
      return this.getStudentsFromLocal(courseType, year, courseDivision, section);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Always fallback to local data
      return this.getStudentsFromLocal(courseType, year, courseDivision, section);
    }
  }

  async deleteStudent(studentId: number, courseType: string, year: string, courseDivision?: string, section?: string): Promise<boolean> {
    try {
      // Remove from localStorage immediately
      this.deleteStudentFromLocal(studentId, courseType, year, courseDivision, section);

      if (this.isOnline) {
        // Try to delete from database
        const response = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        if (response.ok) {
          console.log('✅ Student deleted from database and localStorage');
          return true;
        } else {
          // Queue for later sync
          this.addToSyncQueue('deleteStudent', { studentId, courseType, year, courseDivision, section });
        }
      } else {
        // Queue for sync when back online
        this.addToSyncQueue('deleteStudent', { studentId, courseType, year, courseDivision, section });
      }

      console.log('📱 Student deleted from localStorage (offline mode)');
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  /**
   * ATTENDANCE MANAGEMENT
   */
  async saveAttendance(attendanceRecord: AttendanceRecord): Promise<boolean> {
    try {
      // Save to localStorage first
      this.saveAttendanceToLocal(attendanceRecord);

      if (this.isOnline) {
        // Try to save to database
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendanceRecord)
        });

        if (response.ok) {
          console.log('✅ Attendance saved to database and localStorage');
          return true;
        } else {
          this.addToSyncQueue('saveAttendance', attendanceRecord);
        }
      } else {
        this.addToSyncQueue('saveAttendance', attendanceRecord);
      }

      console.log('📱 Attendance saved to localStorage (offline mode)');
      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      this.saveAttendanceToLocal(attendanceRecord);
      this.addToSyncQueue('saveAttendance', attendanceRecord);
      return true;
    }
  }

  async getAttendance(date: string, courseType: string, year: string, courseDivision?: string, section?: string, period?: number): Promise<AttendanceRecord[]> {
    try {
      if (this.isOnline) {
        const params = new URLSearchParams({
          date,
          courseType,
          year,
          ...(courseDivision && { courseDivision }),
          ...(section && { section }),
          ...(period && { period: period.toString() })
        });

        const response = await fetch(`/api/attendance?${params}`);
        if (response.ok) {
          const attendance = await response.json();
          // Update localStorage with fresh data
          this.updateLocalAttendance(attendance, date, courseType, year, courseDivision, section, period);
          return attendance;
        }
      }

      // Fallback to localStorage
      return this.getAttendanceFromLocal(date, courseType, year, courseDivision, section, period);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return this.getAttendanceFromLocal(date, courseType, year, courseDivision, section, period);
    }
  }

  /**
   * NAMAZ TRACKING
   */
  async saveNamazRecord(namazRecord: NamazRecord): Promise<boolean> {
    try {
      // Save to localStorage first
      this.saveNamazToLocal(namazRecord);

      if (this.isOnline) {
        // Try to save to database
        const response = await fetch('/api/namaz-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(namazRecord)
        });

        if (response.ok) {
          console.log('✅ Namaz record saved to database and localStorage');
          return true;
        } else {
          this.addToSyncQueue('saveNamazRecord', namazRecord);
        }
      } else {
        this.addToSyncQueue('saveNamazRecord', namazRecord);
      }

      console.log('📱 Namaz record saved to localStorage (offline mode)');
      return true;
    } catch (error) {
      console.error('Error saving namaz record:', error);
      this.saveNamazToLocal(namazRecord);
      this.addToSyncQueue('saveNamazRecord', namazRecord);
      return true;
    }
  }

  async getNamazRecords(date: string, studentId?: number): Promise<NamazRecord[]> {
    try {
      if (this.isOnline) {
        const params = new URLSearchParams({
          date,
          ...(studentId && { studentId: studentId.toString() })
        });

        const response = await fetch(`/api/namaz-attendance?${params}`);
        if (response.ok) {
          const records = await response.json();
          // Update localStorage with fresh data
          this.updateLocalNamazRecords(records, date, studentId);
          return records;
        }
      }

      // Fallback to localStorage
      return this.getNamazFromLocal(date, studentId);
    } catch (error) {
      console.error('Error fetching namaz records:', error);
      return this.getNamazFromLocal(date, studentId);
    }
  }

  /**
   * LEAVE MANAGEMENT
   */
  async saveLeave(leaveRecord: LeaveRecord): Promise<boolean> {
    try {
      // Save to localStorage first
      this.saveLeaveToLocal(leaveRecord);

      if (this.isOnline) {
        // Try to save to database
        const response = await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...leaveRecord,
            createdBy: 'teacher',
            createdAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          console.log('✅ Leave record saved to database and localStorage');
          return true;
        } else {
          this.addToSyncQueue('saveLeave', leaveRecord);
        }
      } else {
        this.addToSyncQueue('saveLeave', leaveRecord);
      }

      console.log('📱 Leave record saved to localStorage (offline mode)');
      return true;
    } catch (error) {
      console.error('Error saving leave record:', error);
      this.saveLeaveToLocal(leaveRecord);
      this.addToSyncQueue('saveLeave', leaveRecord);
      return true;
    }
  }

  async getLeaves(studentId?: number): Promise<LeaveRecord[]> {
    try {
      if (this.isOnline) {
        const params = studentId ? `?studentId=${studentId}` : '';
        const response = await fetch(`/api/leaves${params}`);
        if (response.ok) {
          const leaves = await response.json();
          // Update localStorage with fresh data
          this.updateLocalLeaves(leaves, studentId);
          return leaves;
        }
      }

      // Fallback to localStorage
      return this.getLeavesFromLocal(studentId);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      return this.getLeavesFromLocal(studentId);
    }
  }

  /**
   * LOCAL STORAGE HELPERS
   */
  private saveStudentToLocal(student: Student): void {
    const sectionKey = this.getSectionKey(student.courseType, student.year, student.courseDivision, student.batch);
    const existingStudents = JSON.parse(localStorage.getItem(sectionKey) || '[]');
    
    const index = existingStudents.findIndex((s: Student) => s.id === student.id);
    if (index >= 0) {
      existingStudents[index] = student;
    } else {
      existingStudents.push(student);
    }
    
    localStorage.setItem(sectionKey, JSON.stringify(existingStudents));
  }

  private getStudentsFromLocal(courseType: string, year: string, courseDivision?: string, section?: string): Student[] {
    const sectionKey = this.getSectionKey(courseType, year, courseDivision, section || 'A');
    return JSON.parse(localStorage.getItem(sectionKey) || '[]');
  }

  private deleteStudentFromLocal(studentId: number, courseType: string, year: string, courseDivision?: string, section?: string): void {
    const sectionKey = this.getSectionKey(courseType, year, courseDivision, section || 'A');
    const existingStudents = JSON.parse(localStorage.getItem(sectionKey) || '[]');
    const updatedStudents = existingStudents.filter((s: Student) => s.id !== studentId);
    localStorage.setItem(sectionKey, JSON.stringify(updatedStudents));
  }

  private updateLocalStudents(students: Student[], courseType: string, year: string, courseDivision?: string, section?: string): void {
    const sectionKey = this.getSectionKey(courseType, year, courseDivision, section || 'A');
    localStorage.setItem(sectionKey, JSON.stringify(students));
  }

  private saveAttendanceToLocal(record: AttendanceRecord): void {
    const key = `attendance_${record.date}_${record.courseType}_${record.year}_${record.courseDivision || ''}_${record.section}_${record.period}`;
    const existingRecords = JSON.parse(localStorage.getItem(key) || '[]');
    
    const index = existingRecords.findIndex((r: AttendanceRecord) => r.studentId === record.studentId);
    if (index >= 0) {
      existingRecords[index] = record;
    } else {
      existingRecords.push(record);
    }
    
    localStorage.setItem(key, JSON.stringify(existingRecords));
  }

  private getAttendanceFromLocal(date: string, courseType: string, year: string, courseDivision?: string, section?: string, period?: number): AttendanceRecord[] {
    const key = `attendance_${date}_${courseType}_${year}_${courseDivision || ''}_${section || ''}_${period || ''}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private updateLocalAttendance(records: AttendanceRecord[], date: string, courseType: string, year: string, courseDivision?: string, section?: string, period?: number): void {
    const key = `attendance_${date}_${courseType}_${year}_${courseDivision || ''}_${section || ''}_${period || ''}`;
    localStorage.setItem(key, JSON.stringify(records));
  }

  private saveNamazToLocal(record: NamazRecord): void {
    const key = `namaz_${record.date}_${record.studentId}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  private getNamazFromLocal(date: string, studentId?: number): NamazRecord[] {
    if (studentId) {
      const key = `namaz_${date}_${studentId}`;
      const record = localStorage.getItem(key);
      return record ? [JSON.parse(record)] : [];
    }
    
    // Get all namaz records for the date
    const records: NamazRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`namaz_${date}_`)) {
        const record = localStorage.getItem(key);
        if (record) {
          records.push(JSON.parse(record));
        }
      }
    }
    return records;
  }

  private updateLocalNamazRecords(records: NamazRecord[], date: string, studentId?: number): void {
    records.forEach(record => {
      this.saveNamazToLocal(record);
    });
  }

  private saveLeaveToLocal(record: LeaveRecord): void {
    const leaves = this.getLeavesFromLocal();
    const index = leaves.findIndex(l => l.id === record.id);
    
    if (index >= 0) {
      leaves[index] = record;
    } else {
      record.id = record.id || Date.now();
      leaves.push(record);
    }
    
    localStorage.setItem('leaves', JSON.stringify(leaves));
  }

  private getLeavesFromLocal(studentId?: number): LeaveRecord[] {
    const allLeaves = JSON.parse(localStorage.getItem('leaves') || '[]');
    if (studentId) {
      return allLeaves.filter((l: LeaveRecord) => l.studentId === studentId);
    }
    return allLeaves;
  }

  private updateLocalLeaves(leaves: LeaveRecord[], studentId?: number): void {
    if (studentId) {
      // Update specific student's leaves
      const allLeaves = this.getLeavesFromLocal();
      const otherLeaves = allLeaves.filter(l => l.studentId !== studentId);
      const updatedLeaves = [...otherLeaves, ...leaves];
      localStorage.setItem('leaves', JSON.stringify(updatedLeaves));
    } else {
      // Update all leaves
      localStorage.setItem('leaves', JSON.stringify(leaves));
    }
  }

  private getSectionKey(courseType: string, year: string, courseDivision?: string, section?: string): string {
    if (courseType === "post-pu") {
      return `${courseType}_${year}_${section || 'A'}`;
    } else {
      return `${courseType}_${year}_${courseDivision || 'common'}_${section || 'A'}`;
    }
  }

  /**
   * SYNC MANAGEMENT
   */
  private addToSyncQueue(action: string, data: any): void {
    this.syncQueue.push({
      action,
      data,
      timestamp: Date.now()
    });
    this.saveSyncQueue();
  }

  private saveSyncQueue(): void {
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  private loadSyncQueue(): void {
    const saved = localStorage.getItem('syncQueue');
    if (saved) {
      this.syncQueue = JSON.parse(saved);
    }
  }

  async syncWithDatabase(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    console.log(`🔄 Starting sync - ${this.syncQueue.length} items to sync`);
    
    const itemsToSync = [...this.syncQueue];
    this.syncQueue = []; // Clear queue optimistically
    
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToSync) {
      try {
        let success = false;
        
        switch (item.action) {
          case 'saveStudent':
            success = await this.syncStudentToDatabase(item.data);
            break;
          case 'deleteStudent':
            success = await this.syncDeleteStudentToDatabase(item.data);
            break;
          case 'saveAttendance':
            success = await this.syncAttendanceToDatabase(item.data);
            break;
          case 'saveNamazRecord':
            success = await this.syncNamazToDatabase(item.data);
            break;
          case 'saveLeave':
            success = await this.syncLeaveToDatabase(item.data);
            break;
        }

        if (success) {
          successCount++;
        } else {
          // Re-add failed items to queue
          this.syncQueue.push(item);
          failCount++;
        }
      } catch (error) {
        console.error(`Error syncing ${item.action}:`, error);
        this.syncQueue.push(item);
        failCount++;
      }
    }

    if (successCount > 0) {
      console.log(`✅ Successfully synced ${successCount} items to database`);
    }
    
    if (failCount > 0) {
      console.log(`❌ Failed to sync ${failCount} items - will retry later`);
    }

    this.saveSyncQueue();
    this.lastSyncTime = Date.now();
  }

  private async syncStudentToDatabase(student: Student): Promise<boolean> {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async syncDeleteStudentToDatabase(data: any): Promise<boolean> {
    try {
      const response = await fetch(`/api/students/${data.studentId}`, { method: 'DELETE' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async syncAttendanceToDatabase(record: AttendanceRecord): Promise<boolean> {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async syncNamazToDatabase(record: NamazRecord): Promise<boolean> {
    try {
      const response = await fetch('/api/namaz-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async syncLeaveToDatabase(record: LeaveRecord): Promise<boolean> {
    try {
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          createdBy: 'teacher',
          createdAt: new Date().toISOString()
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * UTILITY METHODS
   */
  getStatus(): { isOnline: boolean; queueSize: number; lastSync: number } {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      lastSync: this.lastSyncTime
    };
  }

  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncWithDatabase();
    }
  }

  clearLocalData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('pu_') || key.startsWith('post-pu_') || 
          key.startsWith('attendance_') || key.startsWith('namaz_') || 
          key === 'leaves' || key === 'syncQueue') {
        localStorage.removeItem(key);
      }
    });
    this.syncQueue = [];
    console.log('🗑️ Local data cleared');
  }
}

// Export singleton instance
export const hybridStorage = HybridStorage.getInstance();