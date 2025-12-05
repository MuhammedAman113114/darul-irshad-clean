// Namaz Data Persistence System
// Implements the robust data model for storing all namaz attendance data

export interface NamazDataModel {
  [date: string]: {
    [prayer: string]: {
      [studentName: string]: 'present' | 'absent' | 'on-leave'
    }
  }
}

export interface StudentInfo {
  id: number;
  name: string;
}

export class NamazDataPersistence {
  private static readonly STORAGE_KEY = 'namaz_attendance_complete';

  // Get all stored namaz data
  static getAllData(): NamazDataModel {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading namaz data:', error);
      return {};
    }
  }

  // Save attendance for a specific date and prayer
  static saveAttendance(
    date: string, 
    prayer: string, 
    studentData: { [studentName: string]: 'present' | 'absent' | 'on-leave' }
  ): void {
    const allData = this.getAllData();
    
    // Initialize date if doesn't exist
    if (!allData[date]) {
      allData[date] = {};
    }
    
    // Store/update prayer data for this date
    allData[date][prayer] = { ...studentData };
    
    // Save back to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    
    console.log(`📝 Saved ${prayer} attendance for ${date}:`, studentData);
  }

  // Get attendance for specific date and prayer
  static getAttendanceForDateAndPrayer(date: string, prayer: string): { [studentName: string]: string } {
    const allData = this.getAllData();
    return allData[date]?.[prayer] || {};
  }

  // Get all attendance for a specific date
  static getAttendanceForDate(date: string): { [prayer: string]: { [studentName: string]: string } } {
    const allData = this.getAllData();
    return allData[date] || {};
  }

  // Get attendance history for a student across all dates
  static getStudentHistory(studentName: string): { [date: string]: { [prayer: string]: string } } {
    const allData = this.getAllData();
    const history: { [date: string]: { [prayer: string]: string } } = {};
    
    Object.keys(allData).forEach(date => {
      Object.keys(allData[date]).forEach(prayer => {
        if (allData[date][prayer][studentName]) {
          if (!history[date]) history[date] = {};
          history[date][prayer] = allData[date][prayer][studentName];
        }
      });
    });
    
    return history;
  }

  // Get all dates that have attendance data
  static getAllDatesWithData(): string[] {
    const allData = this.getAllData();
    return Object.keys(allData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }

  // Get all attendance records in array format for syncing
  static getAllAttendance(): Array<{ date: string; prayer: string; students: { [name: string]: string } }> {
    const allData = this.getAllData();
    const records: Array<{ date: string; prayer: string; students: { [name: string]: string } }> = [];
    
    Object.keys(allData).forEach(date => {
      Object.keys(allData[date]).forEach(prayer => {
        records.push({
          date,
          prayer,
          students: allData[date][prayer]
        });
      });
    });
    
    return records;
  }

  // Get attendance for specific date and prayer (alias for compatibility)
  static getAttendance(date: string, prayer: string): { [studentName: string]: string } {
    return this.getAttendanceForDateAndPrayer(date, prayer);
  }

  // Sync to database
  static async syncToDatabase(): Promise<{ success: number; errors: number }> {
    const allData = this.getAllData();
    let success = 0;
    let errors = 0;

    for (const date of Object.keys(allData)) {
      for (const prayer of Object.keys(allData[date])) {
        try {
          // Convert student names back to IDs and statuses
          const students = Object.entries(allData[date][prayer]).map(([name, status]) => ({
            // We'll need to resolve student names to IDs when syncing
            name,
            status
          }));

          const response = await fetch('/api/namaz-attendance/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date,
              prayer,
              students
            })
          });

          if (response.ok) {
            success++;
          } else {
            errors++;
          }
        } catch (error) {
          console.error(`Sync error for ${date} ${prayer}:`, error);
          errors++;
        }
      }
    }

    return { success, errors };
  }

  // Load data from database and merge with local storage
  static async loadFromDatabase(): Promise<void> {
    try {
      const response = await fetch('/api/namaz-attendance');
      if (response.ok) {
        const databaseRecords = await response.json();
        const allData = this.getAllData();

        // Convert database format to our storage format
        databaseRecords.forEach((record: any) => {
          const { date, prayer, studentId, status } = record;
          
          // Initialize structures if needed
          if (!allData[date]) allData[date] = {};
          if (!allData[date][prayer]) allData[date][prayer] = {};
          
          // Store by student ID for now (we'll need student names for the final format)
          allData[date][prayer][`student_${studentId}`] = status;
        });

        // Save merged data
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
        console.log('🔄 Database data loaded and merged with local storage');
      }
    } catch (error) {
      console.error('Error loading from database:', error);
    }
  }

  // Clear all data (use with caution)
  static clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ All namaz attendance data cleared');
  }

  // Export data for backup
  static exportData(): string {
    return JSON.stringify(this.getAllData(), null, 2);
  }

  // Import data from backup
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('📥 Data imported successfully');
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
}

// Helper function to convert student array to name-status mapping
export const studentsToNameStatusMap = (students: StudentInfo[], statuses: Map<number, string>): { [name: string]: string } => {
  const result: { [name: string]: string } = {};
  students.forEach(student => {
    result[student.name] = statuses.get(student.id) || 'present';
  });
  return result;
};

// Helper function to convert name-status mapping back to student array format
export const nameStatusMapToStudents = (nameStatusMap: { [name: string]: string }, students: StudentInfo[]): Map<number, string> => {
  const statusMap = new Map<number, string>();
  students.forEach(student => {
    if (nameStatusMap[student.name]) {
      statusMap.set(student.id, nameStatusMap[student.name]);
    }
  });
  return statusMap;
};