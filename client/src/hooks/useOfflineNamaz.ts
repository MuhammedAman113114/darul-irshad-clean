import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";

interface UseOfflineNamazOptions {
  section: string;
  date: string;
  prayer: string;
}

interface NamazRecord {
  studentId: number;
  name: string;
  rollNo: string;
  status: 'present' | 'absent';
  section: string;
  date: string;
  prayer: string;
}

export function useOfflineNamaz({ section, date, prayer }: UseOfflineNamazOptions) {
  const { user } = useAuth();
  const [namazData, setNamazData] = useState<NamazRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load namaz data from localStorage using attendance key structure
  useEffect(() => {
    if (!user) return;

    const loadLocalNamaz = () => {
      try {
        // Use attendance key structure: attendance_namaz_all_all_date_prayer_namaz
        const attendanceKey = `attendance_namaz_all_all_${date}_${prayer}_namaz`;
        const stored = localStorage.getItem(attendanceKey);
        
        if (stored) {
          const attendanceRecord = JSON.parse(stored);
          if (attendanceRecord.students && Array.isArray(attendanceRecord.students)) {
            // Transform attendance records to namaz format
            const namazRecords: NamazRecord[] = attendanceRecord.students.map((student: any) => ({
              studentId: student.id,
              name: student.name,
              rollNo: student.rollNo,
              status: student.status,
              section,
              date,
              prayer
            }));
            setNamazData(namazRecords);
          }
        }
      } catch (error) {
        console.error('Error loading local namaz:', error);
      }
    };

    loadLocalNamaz();
  }, [user, section, date, prayer]);

  // Save namaz data as attendance records
  const saveNamaz = useCallback(async (studentNamaz: NamazRecord[], skipHolidayCheck = false) => {
    if (!user) return;

    // Check for holidays before saving (unless explicitly skipped)
    if (!skipHolidayCheck) {
      try {
        const { HolidayService } = await import('../services/holidayService');
        const isHoliday = await HolidayService.shouldBlockNamazTracking(date);
        if (isHoliday) {
          console.log('🔒 Namaz save blocked due to holiday');
          return false;
        }
      } catch (error) {
        console.error('Error checking holiday status:', error);
      }
    }

    setIsSaving(true);
    try {
      // Save using attendance key structure with prayer as period
      const attendanceKey = `attendance_namaz_all_all_${date}_${prayer}_namaz`;
      
      const attendanceData = {
        courseType: 'namaz',
        year: 'all',
        courseDivision: 'all',
        section: 'all',
        date,
        period: prayer, // Prayer name as period
        students: studentNamaz.map(record => ({
          id: record.studentId,
          name: record.name,
          rollNo: record.rollNo,
          status: record.status
        })),
        timestamp: new Date().toISOString(),
        savedBy: user?.id || 1,
        type: 'namaz'
      };

      // Save to localStorage using attendance structure
      localStorage.setItem(attendanceKey, JSON.stringify(attendanceData));

      // Also add to sync queue for database sync
      const syncQueue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      syncQueue.push({
        id: Date.now().toString(),
        type: 'attendance',
        key: attendanceKey,
        data: attendanceData,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('sync_queue', JSON.stringify(syncQueue));

      // Update local state
      setNamazData(studentNamaz);

      console.log(`📿 Namaz attendance saved: ${prayer} prayer for ${date} with ${studentNamaz.length} students`);
      return true;
    } catch (error) {
      console.error('Error saving namaz:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, date, prayer]);

  // Update namaz for a specific student
  const updateStudentNamaz = useCallback((
    studentId: number, 
    status: 'present' | 'absent'
  ) => {
    setNamazData(prev => {
      const updated = prev.map(record => 
        record.studentId === studentId 
          ? { ...record, status }
          : record
      );
      
      // Auto-save after update
      saveNamaz(updated);
      
      return updated;
    });
  }, [saveNamaz]);

  // Initialize namaz data for students
  const initializeNamaz = useCallback((students: any[]) => {
    const initialNamaz: NamazRecord[] = students.map(student => ({
      studentId: student.id,
      name: student.name,
      rollNo: student.rollNo,
      status: 'present' as const,
      section,
      date,
      prayer
    }));

    setNamazData(initialNamaz);
    return initialNamaz;
  }, [section, date, prayer]);

  // Get namaz status for a specific student
  const getStudentStatus = useCallback((studentId: number) => {
    const record = namazData.find(r => r.studentId === studentId);
    return record ? record.status : 'present';
  }, [namazData]);

  return {
    namazData,
    isLoading,
    isSaving,
    saveNamaz,
    updateStudentNamaz,
    initializeNamaz,
    getStudentStatus
  };
}