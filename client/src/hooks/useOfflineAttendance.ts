import { useState, useEffect, useCallback } from "react";
import { offlineSyncManager, AttendanceRecord } from "@/lib/offline-sync";
import { useAuth } from "./use-auth";

interface UseOfflineAttendanceOptions {
  section: string;
  date: string;
  period: string;
}

export function useOfflineAttendance({ section, date, period }: UseOfflineAttendanceOptions) {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load attendance data from localStorage on component mount
  useEffect(() => {
    if (!user) return;

    const loadLocalAttendance = () => {
      try {
        const key = `darul_irshad_offline_attendance_${user.id}_${section}_${date}_${period}`;
        const stored = localStorage.getItem(key);
        
        if (stored) {
          const record = JSON.parse(stored);
          if (record.data && Array.isArray(record.data)) {
            setAttendanceData(record.data);
          }
        }
      } catch (error) {
        console.error('Error loading local attendance:', error);
      }
    };

    loadLocalAttendance();
  }, [user, section, date, period]);

  // Save attendance data locally
  const saveAttendance = useCallback(async (studentAttendance: AttendanceRecord[]) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Save to offline storage
      offlineSyncManager.saveAttendanceOffline(
        user.id.toString(),
        section,
        date,
        period,
        studentAttendance
      );

      // Update local state
      setAttendanceData(studentAttendance);

      // Try to sync immediately if online
      if (offlineSyncManager.getNetworkStatus()) {
        await offlineSyncManager.forcSync();
      }

      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, section, date, period]);

  // Update attendance for a specific student
  const updateStudentAttendance = useCallback((
    studentId: number, 
    status: 'present' | 'absent' | 'emergency-leave',
    reason?: string
  ) => {
    setAttendanceData(prev => {
      const updated = prev.map(record => 
        record.studentId === studentId 
          ? { ...record, status, reason: reason || record.reason }
          : record
      );
      
      // Auto-save after update
      saveAttendance(updated);
      
      return updated;
    });
  }, [saveAttendance]);

  // Initialize attendance data for students
  const initializeAttendance = useCallback((students: any[]) => {
    const initialAttendance: AttendanceRecord[] = students.map(student => ({
      studentId: student.id,
      name: student.name,
      rollNo: student.rollNo,
      status: 'present' as const,
      section,
      date,
      period
    }));

    setAttendanceData(initialAttendance);
    return initialAttendance;
  }, [section, date, period]);

  // Get attendance status for a specific student
  const getStudentStatus = useCallback((studentId: number) => {
    const record = attendanceData.find(r => r.studentId === studentId);
    return record ? record.status : 'present';
  }, [attendanceData]);

  // Get attendance reason for a specific student
  const getStudentReason = useCallback((studentId: number) => {
    const record = attendanceData.find(r => r.studentId === studentId);
    return record?.reason;
  }, [attendanceData]);

  return {
    attendanceData,
    isLoading,
    isSaving,
    saveAttendance,
    updateStudentAttendance,
    initializeAttendance,
    getStudentStatus,
    getStudentReason
  };
}