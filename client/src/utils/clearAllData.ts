/**
 * Clear all application data for fresh testing
 */

export function clearAttendanceForDates(dates: string[]): void {
  try {
    console.log('🧹 Clearing attendance data for specific dates:', dates);
    
    // Get all localStorage keys
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    // Find attendance keys containing the specified dates
    const keysToRemove: string[] = [];
    dates.forEach(date => {
      const matchingKeys = allKeys.filter(key => 
        key.includes('attendance') && key.includes(date)
      );
      keysToRemove.push(...matchingKeys);
    });
    
    // Remove the matching keys
    console.log(`Found ${keysToRemove.length} attendance keys to remove:`, keysToRemove);
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Removed: ${key}`);
    });
    
    console.log('✅ Attendance data cleared for specified dates');
    alert(`Cleared attendance data for ${dates.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error clearing attendance data:', error);
    alert('Error clearing attendance data. Check console for details.');
  }
}

export function clearAllAppData(): void {
  try {
    console.log('🧹 Starting comprehensive data clearing...');
    
    // Get all localStorage keys before clearing
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    console.log(`Found ${allKeys.length} localStorage keys to clear:`, allKeys);
    
    // Clear specific app data categories
    const categorizedKeys = {
      students: allKeys.filter(key => key.includes('student') || key.includes('Students')),
      attendance: allKeys.filter(key => key.includes('attendance') || key.includes('Attendance')),
      namaz: allKeys.filter(key => key.includes('namaz') || key.includes('Namaz')),
      leave: allKeys.filter(key => key.includes('leave') || key.includes('Leave')),
      auth: allKeys.filter(key => key.includes('auth') || key.includes('Auth')),
      other: allKeys.filter(key => 
        !key.includes('student') && !key.includes('Students') &&
        !key.includes('attendance') && !key.includes('Attendance') &&
        !key.includes('namaz') && !key.includes('Namaz') &&
        !key.includes('leave') && !key.includes('Leave') &&
        !key.includes('auth') && !key.includes('Auth')
      )
    };
    
    // Clear all localStorage data
    localStorage.clear();
    console.log('✅ Cleared localStorage categories:', {
      students: categorizedKeys.students.length,
      attendance: categorizedKeys.attendance.length,
      namaz: categorizedKeys.namaz.length,
      leave: categorizedKeys.leave.length,
      auth: categorizedKeys.auth.length,
      other: categorizedKeys.other.length
    });
    
    // Clear session storage
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');
    
    // Clear any cached data in memory
    if (typeof window !== 'undefined') {
      // Clear any global state variables
      (window as any).__APP_STATE__ = null;
      (window as any).__STUDENT_CACHE__ = null;
      (window as any).__ATTENDANCE_CACHE__ = null;
      (window as any).__NAMAZ_CACHE__ = null;
      (window as any).__LEAVE_CACHE__ = null;
      console.log('✅ Cleared global state variables');
    }
    
    console.log('🎉 All application data cleared successfully - App reset to fresh state');
    
    // Show confirmation message
    alert('All app data cleared successfully! The page will now reload with a fresh state.');
    
    // Force reload to ensure completely fresh state
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    console.error('❌ Error clearing app data:', error);
    alert('Error clearing app data. Check console for details.');
  }
}

export function initializeFreshApp(): void {
  console.log('🚀 Initializing fresh app state...');
  
  // Clear any existing data first
  clearAllAppData();
}

import { migrateStudentsToDatabase } from "./migrateToDatabase";

// Global function to migrate data to database
export function migrateToDatabase() {
  console.log('🔄 Starting data migration to database...');
  migrateStudentsToDatabase();
}

// Make functions globally available for console access
if (typeof window !== 'undefined') {
  (window as any).clearAllAppData = clearAllAppData;
  (window as any).migrateToDatabase = migrateToDatabase;
  (window as any).clearAttendanceForDates = clearAttendanceForDates;
  console.log('📋 To clear all app data, run: clearAllAppData()');
  console.log('📋 To migrate data to database, run: migrateToDatabase()');
  console.log('📋 To clear specific dates, run: clearAttendanceForDates(["2025-06-29", "2025-07-04"])');
}