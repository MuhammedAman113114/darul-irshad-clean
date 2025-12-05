/**
 * Namaz Sync Service
 * Uploads local namaz attendance data to the database
 */

import { NamazDataPersistence } from '@/utils/namazDataPersistence';

export class NamazSyncService {
  /**
   * Upload all local namaz data to database
   */
  static async syncToDatabase(): Promise<{ success: number; failed: number; total: number }> {
    console.log('🔄 Starting namaz data sync to database...');
    
    let success = 0;
    let failed = 0;
    
    try {
      // First, fetch all students to map names to IDs
      console.log('📥 Fetching students from database...');
      const studentsResponse = await fetch('/api/students', {
        credentials: 'include'
      });
      
      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const allStudents = await studentsResponse.json();
      console.log(`✅ Loaded ${allStudents.length} students`);
      
      // Create name to ID mapping
      const nameToIdMap = new Map<string, number>();
      allStudents.forEach((student: any) => {
        nameToIdMap.set(student.name.toLowerCase().trim(), student.id);
      });
      
      // Get all local namaz data
      const allData = NamazDataPersistence.getAllAttendance();
      const total = allData.length;
      
      console.log(`📊 Found ${total} namaz records to sync`);
      
      if (total === 0) {
        console.log('✅ No data to sync');
        return { success: 0, failed: 0, total: 0 };
      }
      
      // Upload each record to database
      for (const record of allData) {
        try {
          const { date, prayer, students } = record;
          
          // Convert name-based data to student IDs
          const attendanceRecords = Object.entries(students)
            .map(([name, status]) => {
              const studentId = nameToIdMap.get(name.toLowerCase().trim());
              if (!studentId) {
                console.warn(`⚠️ Student not found: ${name}`);
                return null;
              }
              return {
                id: studentId,
                status: status as 'present' | 'absent' | 'on-leave'
              };
            })
            .filter(record => record !== null);
          
          if (attendanceRecords.length === 0) {
            console.warn(`⚠️ No valid students for ${prayer} on ${date}`);
            failed++;
            continue;
          }
          
          // Upload to database
          const response = await fetch('/api/namaz-attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              date,
              prayer,
              students: attendanceRecords
            })
          });
          
          if (response.ok) {
            success++;
            console.log(`✅ Synced: ${prayer} on ${date} (${attendanceRecords.length} students)`);
          } else {
            failed++;
            const errorText = await response.text();
            console.warn(`❌ Failed to sync: ${prayer} on ${date}`, errorText);
          }
        } catch (error) {
          failed++;
          console.error(`❌ Error syncing record:`, error);
        }
      }
      
      console.log(`🎉 Sync complete: ${success}/${total} successful, ${failed} failed`);
      
      return { success, failed, total };
      
    } catch (error) {
      console.error('❌ Namaz sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync specific date and prayer to database
   */
  static async syncRecord(date: string, prayer: string): Promise<boolean> {
    try {
      const data = NamazDataPersistence.getAttendance(date, prayer);
      
      if (!data) {
        console.warn(`No local data found for ${prayer} on ${date}`);
        return false;
      }
      
      const attendanceRecords = Object.entries(data).map(([name, status]) => ({
        name,
        status: status as 'present' | 'absent' | 'on-leave'
      }));
      
      const response = await fetch('/api/namaz-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          date,
          prayer,
          students: attendanceRecords
        })
      });
      
      if (response.ok) {
        console.log(`✅ Synced ${prayer} on ${date} to database`);
        return true;
      } else {
        console.error(`❌ Failed to sync ${prayer} on ${date}:`, await response.text());
        return false;
      }
    } catch (error) {
      console.error(`❌ Error syncing ${prayer} on ${date}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const namazSync = NamazSyncService;
