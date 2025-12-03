/**
 * Leave Debug Utility
 * Helps diagnose and fix leave synchronization issues
 */

export class LeaveDebugService {
  /**
   * Debug all localStorage data related to leaves
   */
  static debugLeaveStorage(): void {
    console.log('🔍 LEAVE DEBUG - Checking all localStorage keys...');
    
    const allKeys = Object.keys(localStorage);
    const leaveKeys = allKeys.filter(key => 
      key.includes('leave') || key.includes('Leave')
    );
    
    console.log('📋 All localStorage keys:', allKeys.length);
    console.log('📋 Leave-related keys:', leaveKeys);
    
    // Check each potential leave storage key
    const potentialKeys = ['leaves_data', 'leaves', 'student_leaves', 'leave_records'];
    
    potentialKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`📄 ${key}:`, data);
        try {
          const parsed = JSON.parse(data);
          console.log(`📊 ${key} parsed (${Array.isArray(parsed) ? parsed.length : 'not array'} items):`, parsed);
        } catch (e) {
          console.log(`❌ ${key} parse error:`, e);
        }
      } else {
        console.log(`❌ ${key}: null/empty`);
      }
    });
    
    // Check if there are any existing leaves with different storage patterns
    leaveKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`🔄 Found leave key '${key}':`, data);
      }
    });
  }
  
  /**
   * Create a test leave to verify synchronization
   */
  static createTestLeave(studentId: number): void {
    const testLeave = {
      id: Date.now(),
      studentId: studentId,
      fromDate: '2025-06-19',
      toDate: '2025-06-20',
      reason: 'Test leave for debugging',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 1
    };
    
    // Store in leaves_data
    const existingLeaves = localStorage.getItem('leaves_data');
    let leavesList = existingLeaves ? JSON.parse(existingLeaves) : [];
    leavesList.push(testLeave);
    localStorage.setItem('leaves_data', JSON.stringify(leavesList));
    
    console.log('✅ Created test leave:', testLeave);
    console.log('📋 Updated leaves_data:', leavesList);
    
    // Trigger storage event
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'leaves_data',
      newValue: JSON.stringify(leavesList),
      oldValue: existingLeaves
    }));
  }
  
  /**
   * Force sync test - manually run leave sync
   */
  static forceSyncTest(): void {
    console.log('🔄 FORCE SYNC TEST - Starting...');
    
    // Import and run leave sync
    import('./leaveSync').then(({ LeaveSyncService }) => {
      console.log('📋 Running batch sync...');
      LeaveSyncService.batchSyncAllLeaves();
      
      // Test individual student leave check
      const studentId = 1749811494239; // Aman's ID
      const today = '2025-06-19';
      
      console.log('🔍 Testing individual leave check...');
      const isOnLeave = LeaveSyncService.isStudentOnLeave(studentId, today);
      console.log(`📊 Student ${studentId} on leave for ${today}:`, isOnLeave);
      
      const leaveDetails = LeaveSyncService.getLeaveDetails(studentId, today);
      console.log('📄 Leave details:', leaveDetails);
    });
  }
}

// Make it available globally for debugging
(window as any).leaveDebug = LeaveDebugService;
console.log('🔧 Leave Debug Service loaded. Use leaveDebug.debugLeaveStorage() to check data.');