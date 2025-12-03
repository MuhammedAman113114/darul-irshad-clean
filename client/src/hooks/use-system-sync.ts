/**
 * Real-time System Sync Hook
 * Provides unified data access across all modules with leave-aware logic
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { systemSyncService, SectionKey, SyncedStudent } from '@/lib/systemSyncService';

export function useSystemSync() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    systemSyncService.setQueryClient(queryClient);
  }, [queryClient]);

  return systemSyncService;
}

/**
 * Hook for fetching students with real-time sync and leave awareness
 */
export function useSyncedStudents(
  sectionKey: SectionKey,
  targetDate?: string,
  enabled: boolean = true
) {
  const systemSync = useSystemSync();
  
  return useQuery({
    queryKey: ['synced-students', sectionKey, targetDate],
    queryFn: () => {
      if (targetDate) {
        return systemSync.getStudentsWithLeaveStatus(sectionKey, targetDate);
      }
      return systemSync.fetchStudentsForSection(sectionKey);
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for date validation with holiday checking
 */
export function useDateValidation(date: string, enabled: boolean = true) {
  const systemSync = useSystemSync();
  
  return useQuery({
    queryKey: ['date-validation', date],
    queryFn: () => systemSync.validateDate(date),
    enabled: enabled && !!date,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for dashboard data with real-time sync
 */
export function useDashboardData(sectionKey: SectionKey, enabled: boolean = true) {
  const systemSync = useSystemSync();
  
  return useQuery({
    queryKey: ['dashboard-data', sectionKey],
    queryFn: () => systemSync.getDashboardData(sectionKey),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

/**
 * Hook for missed classes with authentic data only
 */
export function useMissedClasses(
  sectionKey: SectionKey,
  studentId?: number,
  enabled: boolean = true
) {
  const systemSync = useSystemSync();
  
  return useQuery({
    queryKey: ['missed-classes', sectionKey, studentId],
    queryFn: () => systemSync.getMissedClasses(sectionKey, studentId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation for syncing student changes across modules
 */
export function useStudentSync() {
  const systemSync = useSystemSync();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ action, studentData }: { 
      action: 'add' | 'edit' | 'delete'; 
      studentData?: any 
    }) => {
      await systemSync.syncStudentChanges(action, studentData);
    },
    onSuccess: () => {
      // Trigger a global refresh of all student-related data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && (
            key.includes('synced-students') ||
            key.includes('dashboard-data') ||
            key.includes('missed-classes')
          );
        }
      });
    }
  });
}

/**
 * Mutation for syncing leave changes with auto-attendance marking
 */
export function useLeaveSync() {
  const systemSync = useSystemSync();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (leaveData: any) => {
      await systemSync.syncLeaveChanges(leaveData);
    },
    onSuccess: () => {
      // Refresh attendance and leave related queries
      queryClient.invalidateQueries({ queryKey: ['synced-students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
    }
  });
}

/**
 * Hook for real-time attendance data with leave integration
 */
export function useAttendanceWithLeaves(
  sectionKey: SectionKey,
  date: string,
  enabled: boolean = true
) {
  const { data: students = [], isLoading: studentsLoading } = useSyncedStudents(
    sectionKey, 
    date, 
    enabled
  );
  
  const { data: dateValidation, isLoading: dateLoading } = useDateValidation(
    date, 
    enabled
  );
  
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', { date, sectionKey }],
    enabled: enabled && !dateValidation?.isHoliday,
    staleTime: 1 * 60 * 1000,
  });
  
  return {
    students,
    attendance,
    dateValidation,
    isLoading: studentsLoading || dateLoading || attendanceLoading,
    isHoliday: dateValidation?.isHoliday || false,
    holidayInfo: dateValidation?.holidayInfo
  };
}

/**
 * Hook for namaz tracking with leave awareness
 */
export function useNamazWithLeaves(
  sectionKey: SectionKey,
  date: string,
  enabled: boolean = true
) {
  const { data: students = [], isLoading: studentsLoading } = useSyncedStudents(
    sectionKey,
    date,
    enabled
  );
  
  const { data: namazRecords = [], isLoading: namazLoading } = useQuery({
    queryKey: ['/api/namaz-attendance', { date, sectionKey }],
    enabled,
    staleTime: 1 * 60 * 1000,
  });
  
  return {
    students,
    namazRecords,
    isLoading: studentsLoading || namazLoading
  };
}