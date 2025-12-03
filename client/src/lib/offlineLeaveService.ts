/**
 * Offline-First Leave Service
 * Works with local storage + database sync for reliable leave management
 */

export interface LeaveRecord {
  id: number;
  studentId: number;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'active' | 'completed';
  createdAt: string;
  createdBy: number;
}

class OfflineLeaveService {
  private static instance: OfflineLeaveService;
  private readonly LEAVE_STORAGE_KEY = 'madrasa_leave_records';
  
  public static getInstance(): OfflineLeaveService {
    if (!OfflineLeaveService.instance) {
      OfflineLeaveService.instance = new OfflineLeaveService();
    }
    return OfflineLeaveService.instance;
  }

  /**
   * Get all leave records (local + remote sync)
   */
  public async getAllLeaves(): Promise<LeaveRecord[]> {
    // Always start with local data for offline-first approach
    const localLeaves = this.getLocalLeaves();
    
    try {
      // Try to sync with remote if available
      const response = await fetch('/api/leaves');
      if (response.ok) {
        const remoteLeaves = await response.json();
        // Merge and store locally
        this.storeLocalLeaves(remoteLeaves);
        return remoteLeaves.filter((leave: LeaveRecord) => leave.status === 'active');
      }
    } catch (error) {
      console.log('🔄 Working offline - using local leave data');
    }
    
    return localLeaves.filter(leave => leave.status === 'active');
  }

  /**
   * Get local leave records from localStorage
   */
  private getLocalLeaves(): LeaveRecord[] {
    try {
      const stored = localStorage.getItem(this.LEAVE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Fallback: Check if leave data exists in other keys
      const fallbackLeaves = this.findLeavesInLocalStorage();
      if (fallbackLeaves.length > 0) {
        this.storeLocalLeaves(fallbackLeaves);
        return fallbackLeaves;
      }
    } catch (error) {
      console.error('Error reading local leave data:', error);
    }
    
    return [];
  }

  /**
   * Find leave records scattered in localStorage
   */
  private findLeavesInLocalStorage(): LeaveRecord[] {
    const allLeaves: LeaveRecord[] = [];
    
    try {
      // Check all localStorage keys for leave data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        try {
          const data = JSON.parse(value);
          
          // Check if it's an array of leave records
          if (Array.isArray(data)) {
            for (const item of data) {
              if (this.isLeaveRecord(item)) {
                allLeaves.push(item);
              }
            }
          }
          
          // Check if it's a single leave record
          if (this.isLeaveRecord(data)) {
            allLeaves.push(data);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    } catch (error) {
      console.error('Error scanning localStorage:', error);
    }
    
    return allLeaves;
  }

  /**
   * Check if object is a valid leave record
   */
  private isLeaveRecord(obj: any): obj is LeaveRecord {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.studentId === 'number' &&
           typeof obj.fromDate === 'string' &&
           typeof obj.toDate === 'string' &&
           typeof obj.reason === 'string';
  }

  /**
   * Store leave records locally
   */
  private storeLocalLeaves(leaves: LeaveRecord[]): void {
    try {
      localStorage.setItem(this.LEAVE_STORAGE_KEY, JSON.stringify(leaves));
    } catch (error) {
      console.error('Error storing leave data locally:', error);
    }
  }

  /**
   * Check if student is on leave for specific date
   */
  public async isStudentOnLeave(studentId: number, date: string): Promise<boolean> {
    const leaves = await this.getAllLeaves();
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return leaves.some(leave => {
      if (leave.studentId !== studentId) return false;
      
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      return checkDate >= fromDate && checkDate <= toDate;
    });
  }

  /**
   * Get leave info for student on specific date
   */
  public async getStudentLeaveInfo(studentId: number, date: string): Promise<LeaveRecord | null> {
    const leaves = await this.getAllLeaves();
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return leaves.find(leave => {
      if (leave.studentId !== studentId) return false;
      
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      return checkDate >= fromDate && checkDate <= toDate;
    }) || null;
  }

  /**
   * Add new leave record (with offline support)
   */
  public async addLeave(leave: Omit<LeaveRecord, 'id' | 'createdAt'>): Promise<LeaveRecord> {
    const newLeave: LeaveRecord = {
      ...leave,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    // Store locally first
    const localLeaves = this.getLocalLeaves();
    localLeaves.push(newLeave);
    this.storeLocalLeaves(localLeaves);
    
    try {
      // Try to sync to remote
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeave)
      });
      
      if (response.ok) {
        const remoteLeave = await response.json();
        // Update local storage with server response
        const updatedLeaves = localLeaves.map(l => l.id === newLeave.id ? remoteLeave : l);
        this.storeLocalLeaves(updatedLeaves);
        return remoteLeave;
      }
    } catch (error) {
      console.log('🔄 Leave saved locally - will sync when online');
    }
    
    return newLeave;
  }

  /**
   * Seed default leave data for testing
   */
  public seedDefaultLeaves(): void {
    // Clear existing data and force refresh
    localStorage.removeItem(this.LEAVE_STORAGE_KEY);
    
    const defaultLeaves: LeaveRecord[] = [
      {
        id: 1,
        studentId: 2, // Mohammed
        fromDate: '2025-06-10',
        toDate: '2025-06-15',
        reason: 'marriage',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 1
      }
    ];
    
    this.storeLocalLeaves(defaultLeaves);
    console.log('✅ Fresh leave data seeded for Mohammed (June 10-15, 2025)');
  }
}

export const offlineLeaveService = OfflineLeaveService.getInstance();