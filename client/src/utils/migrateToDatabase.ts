// Migration utility to sync localStorage data to database
import { apiRequest } from "@/lib/queryClient";

interface StudentData {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  courseDivision?: string;
  year: number;
  batch?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  contact1?: string;
  contact2?: string;
  photoUrl?: string;
  status?: string;
}

export async function migrateStudentsToDatabase() {
  try {
    console.log('🔄 Starting migration of student data to database...');
    
    // Get all students from localStorage
    const studentsKey = 'students_data';
    const studentsData = localStorage.getItem(studentsKey);
    
    if (!studentsData) {
      console.log('ℹ️ No student data found in localStorage');
      return;
    }
    
    const students = JSON.parse(studentsData) as StudentData[];
    console.log(`📚 Found ${students.length} students in localStorage`);
    
    // Migrate each student to database
    for (const student of students) {
      try {
        const studentPayload = {
          name: student.name,
          rollNo: student.rollNo,
          courseType: student.courseType,
          courseDivision: student.courseDivision || null,
          year: student.year.toString(),
          batch: student.batch || null,
          dob: student.dob || null,
          fatherName: student.fatherName || null,
          motherName: student.motherName || null,
          bloodGroup: student.bloodGroup || null,
          address: student.address || null,
          contact1: student.contact1 || null,
          contact2: student.contact2 || null,
          photoUrl: student.photoUrl || null,
          status: student.status || 'active'
        };
        
        await apiRequest('/api/students', 'POST', studentPayload);
        
        console.log(`✅ Migrated student: ${student.name} (${student.rollNo})`);
      } catch (error) {
        console.error(`❌ Failed to migrate student ${student.name}:`, error);
      }
    }
    
    console.log('✅ Student migration completed successfully');
    
    // Also migrate attendance data if present
    await migrateAttendanceToDatabase();
    
    // Also migrate namaz data if present  
    await migrateNamazToDatabase();
    
    console.log('🎉 All data migration completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function migrateAttendanceToDatabase() {
  try {
    console.log('🔄 Migrating attendance data...');
    
    // Get all attendance keys from localStorage
    const attendanceKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('attendance_') && !key.includes('backup')
    );
    
    console.log(`📊 Found ${attendanceKeys.length} attendance records`);
    
    for (const key of attendanceKeys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;
        
        const attendanceRecord = JSON.parse(data);
        
        // Extract date and period from key
        const keyParts = key.split('_');
        const date = keyParts[4];
        const period = keyParts[5];
        
        if (attendanceRecord.students && Array.isArray(attendanceRecord.students)) {
          for (const student of attendanceRecord.students) {
            const attendancePayload = {
              studentId: student.id,
              date: date,
              period: period,
              status: student.status || 'present',
              reason: null,
              createdBy: 1, // Default user ID
              isAutoMarked: false
            };
            
            await apiRequest('/api/attendance', 'POST', attendancePayload);
          }
        }
        
        console.log(`✅ Migrated attendance record: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to migrate attendance ${key}:`, error);
      }
    }
    
    console.log('✅ Attendance migration completed');
  } catch (error) {
    console.error('❌ Attendance migration failed:', error);
  }
}

async function migrateNamazToDatabase() {
  try {
    console.log('🔄 Migrating namaz data...');
    
    // Get all namaz keys from localStorage
    const namazKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('namaz_')
    );
    
    console.log(`🕌 Found ${namazKeys.length} namaz records`);
    
    for (const key of namazKeys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;
        
        const namazRecord = JSON.parse(data);
        
        // Extract prayer and date from key
        const keyParts = key.split('_');
        const prayer = keyParts[1];
        const date = keyParts[2];
        
        if (namazRecord.students && Array.isArray(namazRecord.students)) {
          for (const student of namazRecord.students) {
            const namazPayload = {
              studentId: student.id,
              date: date,
              period: prayer,
              status: student.status || 'present',
              reason: null,
              createdBy: 1 // Default user ID
            };
            
            await apiRequest('/api/namaz-attendance', 'POST', namazPayload);
          }
        }
        
        console.log(`✅ Migrated namaz record: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to migrate namaz ${key}:`, error);
      }
    }
    
    console.log('✅ Namaz migration completed');
  } catch (error) {
    console.error('❌ Namaz migration failed:', error);
  }
}

// Helper function to clear localStorage after successful migration
export function clearLocalStorageAfterMigration() {
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('students_') || 
    key.startsWith('attendance_') || 
    key.startsWith('namaz_') ||
    key.startsWith('leave_')
  );
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`🧹 Cleared ${keysToRemove.length} localStorage keys after migration`);
}