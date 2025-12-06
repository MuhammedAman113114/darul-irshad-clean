import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Users, History, Download, RotateCcw, BarChart3, AlertTriangle, ChevronDown, ChevronRight, Database } from "lucide-react";
import { NetworkStatusIndicator } from "@/components/common/NetworkStatusIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Removed deprecated fetchAllStudents import - using React Query instead
import { leaveSyncService } from "@/lib/leaveSyncService";
import { offlineLeaveService } from "@/lib/offlineLeaveService";
import InteractiveHistoryView from "./InteractiveHistoryView";
import { recoverNamazDataFromLocalStorage } from "@/utils/dataRecovery";
import { NamazDataPersistence, studentsToNameStatusMap, nameStatusMapToStudents } from "@/utils/namazDataPersistence";
import { clearAllAppData } from "@/utils/clearAllData";
import { LeaveSyncService } from "@/lib/leaveSync";
import { namazLockService } from "@/lib/namazLockService";
import { HolidayService } from "@/services/holidayService";

interface Student {
  id: number;
  name: string;
  rollNo: string;
  course: string;
  courseType: string;
  year: number;
  courseDivision?: string;
  section?: string;
  batch?: string;
  onLeave?: boolean;
  createdAt: Date;
}

interface NamazScreenProps {
  onBack: () => void;
  role: string;
}

// DateHistoryCard component for expandable date-wise history
function DateHistoryCard({ dateGroup, students, authenticStudents }: { dateGroup: any, students: any[], authenticStudents: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    return { dayName, formattedDate };
  };

  const { dayName, formattedDate } = formatDate(dateGroup.date);
  const prayers = Array.from(dateGroup.prayers.values());

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{new Date(dateGroup.date).getDate()}</div>
              <div className="text-xs text-gray-500 uppercase">{dayName.slice(0, 3)}</div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{formattedDate}</h3>
              <p className="text-sm text-gray-500">{prayers.length} prayer{prayers.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {prayers.map((prayer: any, index) => (
                <span 
                  key={index}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  title={`${prayer.prayer} prayer recorded`}
                ></span>
              ))}
            </div>
            {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {prayers.map((prayer: any, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPrayer(selectedPrayer === prayer.prayer ? null : prayer.prayer)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedPrayer === prayer.prayer
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {prayer.prayer.charAt(0).toUpperCase() + prayer.prayer.slice(1)}
                </button>
              ))}
            </div>
            
            {selectedPrayer && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  {selectedPrayer.charAt(0).toUpperCase() + selectedPrayer.slice(1)} Prayer Attendance
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(() => {
                    const selectedPrayerData = prayers.find((p: any) => p.prayer === selectedPrayer);
                    if (!selectedPrayerData || !selectedPrayerData.records) return null;

                    return selectedPrayerData.records.map((studentRecord: any, studentIndex: number) => {
                      const fullStudent = authenticStudents.find(s => s.id === studentRecord.studentId || s.name === studentRecord.name);
                      
                      if (!fullStudent) return null;

                      return (
                        <div key={studentIndex} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-emerald-700">
                                  {fullStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{fullStudent.name}</div>
                              <div className="text-xs text-gray-500">
                                Roll: {fullStudent.rollNo} • {fullStudent.year}{fullStudent.year === 1 ? 'st' : fullStudent.year === 2 ? 'nd' : fullStudent.year === 3 ? 'rd' : 'th'} {fullStudent.courseType?.toUpperCase()}
                                {fullStudent.courseType === 'pu' && 
                                 (fullStudent.year === 1 || fullStudent.year === 2) && 
                                 fullStudent.courseDivision === 'commerce' && 
                                 fullStudent.section && (
                                  <span className="ml-1">
                                    Section {fullStudent.section}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {studentRecord.status === 'present' ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                Present
                              </span>
                            ) : studentRecord.status === 'absent' ? (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                                Absent
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full font-medium">
                                On Leave
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// History Renderer component to handle the scoping issue
function HistoryRenderer({ namazHistory, filteredStudents, authenticStudents }: { 
  namazHistory: any[], 
  filteredStudents: any[], 
  authenticStudents: any[] 
}) {
  // Group namaz history by date
  const groupedByDate = new Map();
  
  namazHistory.forEach((record: any) => {
    const date = record.date;
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, {
        date,
        prayers: new Map(),
        totalMarked: 0
      });
    }
    
    const dateGroup = groupedByDate.get(date);
    dateGroup.prayers.set(record.prayer, record);
    dateGroup.totalMarked += 1;
  });
  
  const sortedDates = Array.from(groupedByDate.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No history found for the selected filters</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3 p-2">
      {sortedDates.map((dateGroup, dateIndex) => (
        <DateHistoryCard 
          key={dateGroup.date} 
          dateGroup={dateGroup}
          students={filteredStudents}
          authenticStudents={authenticStudents}
        />
      ))}
    </div>
  );
}

export default function ComprehensiveNamazScreen({ onBack, role }: NamazScreenProps) {
  const [activeTab, setActiveTab] = useState("attendance");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayer, setPrayer] = useState("zuhr");
  const [yearFilter, setYearFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentStatuses, setStudentStatuses] = useState<Map<number, 'present' | 'absent'>>(new Map());
  const [historyFilters, setHistoryFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0],
    selectedStudent: "all",
    selectedPrayer: "all"
  });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [exportMonth, setExportMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAttendanceSaved, setIsAttendanceSaved] = useState(false); // Track actual save state
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [selectedPrayerForDate, setSelectedPrayerForDate] = useState<string | null>(null);
  
  // Holiday checking state
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayInfo, setHolidayInfo] = useState<any>(null);
  const [holidayCheckLoading, setHolidayCheckLoading] = useState<boolean>(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch authentic students from database (same as attendance module)
  const { data: databaseStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  // Initialize states for data
  const [authenticStudents, setAuthenticStudents] = useState<any[]>([]);
  const [namazHistory, setNamazHistory] = useState<any[]>([]);
  const [sheetRefreshKey, setSheetRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  // Initialize lock service on component mount
  useEffect(() => {
    namazLockService.initialize();
  }, []);

  // Load holidays from API (same as attendance module for consistency)
  const { data: holidays = [], isLoading: holidaysLoading, error: holidaysError } = useQuery({
    queryKey: ['/api/holidays'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug holiday loading (only log errors)
  useEffect(() => {
    if (holidaysError) {
      console.error('❌ [NAMAZ] Holiday Query Error:', holidaysError);
    }
  }, [holidaysError]);

  // Function to check if current date is a holiday (consistent with attendance module)
  const checkIfHoliday = (dateToCheck: string) => {
    try {
      console.log(`🎯 [NAMAZ] Checking holiday status for date: ${dateToCheck}`);
      
      // Find holiday from local holidays data
      const holiday = holidays.find(h => h.date === dateToCheck && !h.isDeleted);
      
      if (holiday) {
        // Check if this applies to all or any course (namaz is cross-course)
        const affectedCourses = holiday.affectedCourses.map(course => course.toLowerCase());
        const shouldBlock = affectedCourses.includes('all') || 
                           affectedCourses.length > 0; // Any course means namaz is blocked
        
        console.log(`📅 [NAMAZ] Holiday found: ${holiday.name}, Should block: ${shouldBlock}`);
        
        if (shouldBlock) {
          setIsHoliday(true);
          setHolidayInfo(holiday);
          console.log(`🔒 [NAMAZ] Namaz tracking blocked for holiday: ${holiday.name}`);
          return;
        }
      }
      
      setIsHoliday(false);
      setHolidayInfo(null);
      console.log(`✅ [NAMAZ] Namaz tracking allowed for ${dateToCheck}`);
    } catch (error) {
      console.error('Error checking holiday status for namaz:', error);
      setIsHoliday(false);
      setHolidayInfo(null);
    }
  };

  // Check for holidays when date changes
  useEffect(() => {
    if (date && holidays.length > 0) {
      console.log(`🔧 [NAMAZ] Holiday check triggered for ${date}`);
      checkIfHoliday(date);
      
      // Force immediate check to sync state
      const currentHoliday = holidays.find(h => h.date === date && !h.isDeleted);
      if (currentHoliday && !isHoliday) {
        console.log(`🚨 [NAMAZ] State mismatch detected! Holiday exists but isHoliday is false. Forcing update.`);
        const affectedCourses = currentHoliday.affectedCourses.map(course => course.toLowerCase());
        const shouldBlock = affectedCourses.includes('all') || affectedCourses.length > 0;
        if (shouldBlock) {
          setIsHoliday(true);
          setHolidayInfo(currentHoliday);
        }
      } else if (!currentHoliday && isHoliday) {
        console.log(`🔄 [NAMAZ] Clearing stale holiday state for ${date}`);
        setIsHoliday(false);
        setHolidayInfo(null);
      }
    }
  }, [date, holidays]);

  // Load students data when database students are available
  useEffect(() => {
    const loadStudents = () => {
      try {
        // Only proceed if database students are loaded
        if (isStudentsLoading || !databaseStudents || !Array.isArray(databaseStudents) || databaseStudents.length === 0) {
          return;
        }
        
        setIsLoading(true);
        
        console.log('📚 Namaz: Loading students using unified service...');
        
        // Use database students (same as attendance tracking)
        let students = databaseStudents;
        
        // Apply leave synchronization like attendance tracking does
        students = students.map(student => {
          const isOnLeave = LeaveSyncService.isStudentOnLeave(student.id, date);
          const leaveInfo = isOnLeave ? LeaveSyncService.getLeaveDetails(student.id, date) : null;
          
          return {
            ...student,
            onLeave: isOnLeave,
            status: isOnLeave ? 'on-leave' : student.status || 'present',
            leaveInfo: leaveInfo
          };
        });
        
        console.log(`✅ Namaz: Loaded ${students.length} students from unified service`);
        console.log('🟡 Namaz Students on leave:', students.filter(s => s.onLeave));
        
        setAuthenticStudents(students);
        
      } catch (error) {
        console.error('Error loading students:', error);
        toast({
          title: "Error",
          description: "Failed to load students data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [databaseStudents, isStudentsLoading, date]);

  // Helper function to get namaz history from localStorage
  const getNamazHistory = () => {
    try {
      const allKeys = Object.keys(localStorage);
      const namazKeys = allKeys.filter(key => 
        key.startsWith('namaz_') || key.startsWith('attendance_namaz_')
      );
      
      const history: any[] = [];
      
      namazKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Handle different data formats
          if (Array.isArray(data)) {
            // Direct array format from namaz_prayer_date keys
            const keyParts = key.split('_');
            if (keyParts.length >= 3) {
              const prayer = keyParts[1];
              const date = keyParts[2];
              
              if (data.length > 0) {
                history.push({
                  date: date,
                  prayer: prayer,
                  records: data.map((student: any) => ({
                    studentId: student.id || student.studentId,
                    status: student.status,
                    name: student.name,
                    rollNo: student.rollNo
                  }))
                });
              }
            }
          } else if (data.date && data.prayer && data.students) {
            // Object format with nested data
            history.push({
              date: data.date,
              prayer: data.prayer,
              records: data.students.map((student: any) => ({
                studentId: student.id || student.studentId,
                status: student.status,
                name: student.name,
                rollNo: student.rollNo
              }))
            });
          }
        } catch (error) {
          console.error('Error parsing namaz data from', key, ':', error);
        }
      });
      
      // Remove duplicates based on date and prayer
      const uniqueHistory = history.filter((item, index, self) => 
        index === self.findIndex(t => t.date === item.date && t.prayer === item.prayer)
      );
      
      console.log(`📊 Namaz History: Found ${uniqueHistory.length} unique sessions`);
      return uniqueHistory;
    } catch (error) {
      console.error('Error getting namaz history:', error);
      return [];
    }
  };

  // Load namaz history from database on mount - ALWAYS fetch from database
  useEffect(() => {
    const loadHistoryFromDatabase = async () => {
      try {
        console.log('📥 [HISTORY] Loading ALL namaz history from database...');
        
        // Fetch ALL namaz records from database (no date filter)
        const response = await fetch('/api/namaz-attendance', {
          credentials: 'include'
        });
        
        console.log('📥 [HISTORY] Response status:', response.status, response.ok);
        
        if (response.ok) {
          const dbRecords = await response.json();
          console.log(`✅ [HISTORY] Loaded ${dbRecords.length} namaz records from database`);
          
          if (dbRecords.length > 0) {
            console.log('📊 [HISTORY] Sample record:', dbRecords[0]);
          }
          
          // Group by date and prayer
          const grouped = new Map();
          
          dbRecords.forEach((record: any) => {
            const key = `${record.date}_${record.prayer}`;
            
            if (!grouped.has(key)) {
              grouped.set(key, {
                date: record.date,
                prayer: record.prayer,
                records: []
              });
            }
            
            grouped.get(key).records.push({
              studentId: record.studentId,
              status: record.status,
              name: record.name || '',
              rollNo: record.rollNo || ''
            });
          });
          
          const historyFromDB = Array.from(grouped.values());
          console.log(`📊 [HISTORY] Organized into ${historyFromDB.length} unique sessions`);
          console.log('📊 [HISTORY] Sessions:', historyFromDB.map(s => `${s.date} ${s.prayer}`));
          
          setNamazHistory(historyFromDB);
        } else {
          console.log('⚠️ [HISTORY] Failed to load from database, status:', response.status);
          const errorText = await response.text();
          console.log('⚠️ [HISTORY] Error:', errorText);
          
          // Fallback to localStorage
          const history = getNamazHistory();
          setNamazHistory(history);
        }
      } catch (error) {
        console.error('❌ [HISTORY] Error loading from database:', error);
        // Fallback to localStorage
        const history = getNamazHistory();
        setNamazHistory(history);
      }
    };
    
    loadHistoryFromDatabase();
  }, []);

  // Load existing attendance - Robust persistence system
  useEffect(() => {
    const loadAttendanceData = async () => {
      console.log(`🔍 Loading attendance data for ${prayer} on ${date}...`);
      
      try {
        // Step 1: Load from database first
        const response = await fetch(`/api/namaz-attendance?date=${date}&prayer=${prayer}`);
        if (response.ok) {
          const databaseData = await response.json();
          if (databaseData && databaseData.length > 0) {
            const statusMap = new Map();
            databaseData.forEach((record: any) => {
              statusMap.set(record.studentId, record.status);
            });
            setStudentStatuses(statusMap);
            console.log(`🗄️ Loaded from database: ${prayer} on ${date} - ${statusMap.size} students`);
            
            // Also store in our robust persistence system
            const nameStatusData = studentsToNameStatusMap(authenticStudents, statusMap);
            NamazDataPersistence.saveAttendance(date, prayer, nameStatusData);
            return;
          }
        }
        
        // Step 2: Fallback to robust persistence system
        const persistedData = NamazDataPersistence.getAttendanceForDateAndPrayer(date, prayer);
        if (Object.keys(persistedData).length > 0) {
          const statusMap = nameStatusMapToStudents(persistedData, authenticStudents);
          setStudentStatuses(statusMap);
          console.log(`📚 Loaded from persistence system: ${prayer} on ${date} - ${statusMap.size} students`);
          return;
        }
        
        // Step 3: Check old localStorage format for migration
        const storageKey = `namaz_${prayer}_${date}`;
        const existingData = localStorage.getItem(storageKey);
        
        if (existingData) {
          try {
            const parsed = JSON.parse(existingData);
            const attendanceRecords = Array.isArray(parsed) ? parsed : (parsed.students || []);
            
            const statusMap = new Map();
            attendanceRecords.forEach((record: any) => {
              const studentId = record.studentId || record.id;
              if (studentId && record.status) {
                statusMap.set(studentId, record.status);
              }
            });
            
            if (statusMap.size > 0) {
              setStudentStatuses(statusMap);
              
              // Migrate to new persistence system
              const nameStatusData = studentsToNameStatusMap(authenticStudents, statusMap);
              NamazDataPersistence.saveAttendance(date, prayer, nameStatusData);
              
              console.log(`🔄 Migrated old localStorage data: ${prayer} on ${date} - ${statusMap.size} students`);
              return;
            }
          } catch (error) {
            console.error('Error parsing old localStorage data:', error);
          }
        }
        
      } catch (error) {
        console.warn('Error loading attendance data:', error);
      }

      // Step 4: Default initialization with "present" status
      const defaultStatusMap = new Map();
      authenticStudents.forEach(student => {
        defaultStatusMap.set(student.id, 'present');
      });
      setStudentStatuses(defaultStatusMap);
      console.log(`✅ Initialized ${defaultStatusMap.size} students with default PRESENT status for ${prayer} on ${date}`);
    };

    if (authenticStudents.length > 0) {
      loadAttendanceData();
    }
  }, [date, prayer, authenticStudents.length]);

  // Separate effect for sheet refresh trigger with proper dependency management
  useEffect(() => {
    if (sheetRefreshKey > 0) {
      const history = getNamazHistory();
      setNamazHistory(history);
    }
  }, [sheetRefreshKey]);

  // Helper function to check if attendance is taken
  const checkAttendanceTaken = (checkDate: string, checkPrayer: string) => {
    const storageKey = `namaz_${checkPrayer}_${checkDate}`;
    return localStorage.getItem(storageKey) !== null;
  };

  // Helper function to reset attendance
  const resetAttendanceFromStorage = (checkDate: string, checkPrayer: string) => {
    const storageKey = `namaz_${checkPrayer}_${checkDate}`;
    localStorage.removeItem(storageKey);
    
    // Also remove from new format if exists
    const newFormatKey = `attendance_namaz_all_all_${checkDate}_${checkPrayer}_namaz`;
    localStorage.removeItem(newFormatKey);
    
    // Reload namaz history to reflect the reset
    const updatedHistory = getNamazHistory();
    setNamazHistory(updatedHistory);
    
    // Trigger sheet refresh to ensure synchronization
    setSheetRefreshKey(prev => prev + 1);
    
    // Invalidate the namaz attendance query to refresh the sheet
    queryClient.invalidateQueries({ queryKey: ['/api/namaz-attendance'] });
    
    toast({
      title: "Success!",
      description: `${checkPrayer.charAt(0).toUpperCase() + checkPrayer.slice(1)} attendance reset successfully`,
    });
  };

  // Fetch database namaz records for the sheet
  const { data: databaseNamazRecords = [], isLoading: isNamazLoading, error: namazError } = useQuery({
    queryKey: ['/api/namaz-attendance'],
    enabled: activeTab === 'sheet'
  });
  
  // Debug the API query itself and force refresh when switching to sheet
  useEffect(() => {
    if (activeTab === 'sheet') {
      console.log('🔍 Namaz query status - Loading:', isNamazLoading, 'Error:', namazError);
      // Force cache invalidation when switching to sheet tab
      queryClient.invalidateQueries({ queryKey: ['/api/namaz-attendance'] });
    }
  }, [activeTab, queryClient]);
  
  // Debug database records for zuhr specifically
  useEffect(() => {
    if (activeTab === 'sheet') {
      console.log('🔍 Sheet tab active - Database records count:', Array.isArray(databaseNamazRecords) ? databaseNamazRecords.length : 'Not array');
      if (Array.isArray(databaseNamazRecords) && databaseNamazRecords.length > 0) {
        console.log('🔍 All database records:', databaseNamazRecords);
        const zuhrRecords = databaseNamazRecords.filter(r => r.prayer === 'zuhr' && r.date === '2025-07-04');
        console.log('🔍 Zuhr records for 2025-07-04:', zuhrRecords);
        
        // Force cache refresh when zuhr records are found
        if (zuhrRecords.length > 0) {
          console.log('🔄 Forcing sheet refresh due to zuhr records...');
          queryClient.invalidateQueries({ queryKey: ['/api/namaz-attendance'] });
        }
      }
    }
  }, [activeTab, databaseNamazRecords, queryClient]);

  // Function to calculate student's namaz data for the sheet with database integration
  const calculateStudentNamazData = (studentId: number) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const days: Record<number, Record<string, string>> = {};
    let totalPrayers = 0;
    let presentPrayers = 0;
    let onLeavePrayers = 0;
    
    // Function to check leave status locally within calculation
    const checkLeaveStatus = (checkStudentId: number, checkDateStr: string): boolean => {
      try {
        const leaves = JSON.parse(localStorage.getItem('leaves') || '[]');
        const checkDate = new Date(checkDateStr);
        
        return leaves.some((leave: any) => {
          if (leave.studentId !== checkStudentId || leave.status !== 'active') return false;
          
          const fromDate = new Date(leave.fromDate);
          const toDate = new Date(leave.toDate);
          
          return checkDate >= fromDate && checkDate <= toDate;
        });
      } catch (error) {
        console.error('Error checking leave status:', error);
        return false;
      }
    };
    
    // Get all namaz records for this student from database and localStorage
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      days[day] = {};
      
      // Check if student is on leave for this date
      const isOnLeave = checkLeaveStatus(studentId, dateStr);
      
      prayers.forEach(prayer => {
        let studentRecord = null;
        let finalStatus = '';
        
        // If student is on leave, mark all prayers as "on-leave"
        if (isOnLeave) {
          finalStatus = 'on-leave';
          totalPrayers++;
          onLeavePrayers++;
        } else {
          // First check database records - find the latest record for this student-date-prayer
          const dbRecordsForStudentPrayer = databaseNamazRecords.filter((record: any) => 
            record.studentId === studentId && 
            record.date === dateStr && 
            record.prayer === prayer
          );
          
          // Get the most recent record by sorting by createdAt
          const dbRecord = dbRecordsForStudentPrayer.length > 0 
            ? dbRecordsForStudentPrayer.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0] 
            : null;
          
          if (dbRecord) {
            studentRecord = { status: dbRecord.status };
            if (prayer === 'zuhr' && dateStr === '2025-07-04') {
              console.log(`🟡 Zuhr Debug: Student ${studentId} - Found DB record:`, dbRecord);
            }
          } else {
            if (prayer === 'zuhr' && dateStr === '2025-07-04') {
              console.log(`🔴 Zuhr Debug: Student ${studentId} - NO DB record found. Total DB records:`, databaseNamazRecords.length);
            }
            // Fallback to localStorage - check new attendance format
            const attendanceKey = `attendance_namaz_all_all_${dateStr}_${prayer}_namaz`;
            const attendanceData = localStorage.getItem(attendanceKey);
            
            if (attendanceData) {
              try {
                const data = JSON.parse(attendanceData);
                if (data.students && Array.isArray(data.students)) {
                  studentRecord = data.students.find((s: any) => s.id === studentId);
                }
              } catch (error) {
                console.error('Error parsing attendance data:', error);
              }
            }
            
            // If still not found, check old namaz format: namaz_prayer_date
            if (!studentRecord) {
              const namazKey = `namaz_${prayer}_${dateStr}`;
              const namazData = localStorage.getItem(namazKey);
              
              if (namazData) {
                try {
                  const records = JSON.parse(namazData);
                  
                  // Handle both array format and object format with students array
                  if (Array.isArray(records)) {
                    studentRecord = records.find((r: any) => r.studentId === studentId || r.id === studentId);
                  } else if (records.students && Array.isArray(records.students)) {
                    studentRecord = records.students.find((s: any) => s.id === studentId || s.studentId === studentId);
                  }
                } catch (error) {
                  console.error('Error parsing namaz data:', error);
                }
              }
            }
          }
          
          if (studentRecord) {
            finalStatus = studentRecord.status;
            totalPrayers++;
            if (studentRecord.status === 'present') {
              presentPrayers++;
            }
          }
        }
        
        if (finalStatus) {
          days[day][prayer] = finalStatus;
        }
      });
    }
    
    // Calculate percentage excluding on-leave prayers from denominator
    const attendancePrayers = totalPrayers - onLeavePrayers;
    const percentage = attendancePrayers > 0 ? Math.round((presentPrayers / attendancePrayers) * 100) : 0;
    
    return {
      days,
      totalPrayers,
      presentPrayers,
      percentage
    };
  };

  // Process students data for display - use the students as they come from fetchAllStudents
  // Use authenticStudents directly for consistency

  // Filter students based on filters with correct logic for PUC structure
  const filteredStudents = authenticStudents.filter((student: any) => {
    // Year filter
    if (yearFilter !== "all" && student.year.toString() !== yearFilter) return false;
    
    // Course filter - for 1st and 2nd year, check courseDivision; for 3rd+ years, no course division
    if (courseFilter !== "all") {
      if (student.year <= 2) {
        // For 1st and 2nd PUC, check courseDivision (commerce/science)
        if (student.courseDivision !== courseFilter) return false;
      } else {
        // For 3rd+ years, there's no course division, so if a specific course is selected, exclude these students
        return false;
      }
    }
    
    // Section filter - only applies to commerce students in 1st and 2nd year
    if (sectionFilter !== "all") {
      if (student.year <= 2 && student.courseDivision === "commerce") {
        // Commerce students have sections A and B (stored in batch property)
        if (student.batch !== sectionFilter) return false;
      } else if (student.year <= 2 && student.courseDivision === "science") {
        // Science students don't have sections, so if section filter is applied, exclude them
        return false;
      } else if (student.year > 2) {
        // 3rd+ year students don't have sections, so if section filter is applied, exclude them
        return false;
      }
    }
    
    // Search filter
    if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  // Check if attendance is locked using the new namaz lock service
  const isAttendanceLocked = namazLockService.isPrayerLocked(date, prayer);

  // Helper function to check if a prayer is completed (locked)
  const isPrayerCompleted = (prayerName: string) => {
    return namazLockService.isPrayerLocked(date, prayerName);
  };

  // Reset section filter when year/course changes to values that don't support sections
  useEffect(() => {
    const shouldResetSection = 
      (yearFilter !== "all" && parseInt(yearFilter) > 2) || 
      (courseFilter === "science");
    
    if (shouldResetSection && sectionFilter !== "all") {
      setSectionFilter("all");
    }
  }, [yearFilter, courseFilter, sectionFilter]);

  // Add state to track if data has been loaded to prevent override of user changes
  const [dataLoadKey, setDataLoadKey] = useState<string>('');

  // Load attendance statuses from database only when prayer/date changes (not when students change)
  useEffect(() => {
    const currentKey = `${date}-${prayer}`;
    
    // Only load if prayer/date combination has changed
    if (currentKey !== dataLoadKey) {
      const loadNamazAttendance = async () => {
        if (filteredStudents.length > 0) {
          const initialStatuses = new Map<number, 'present' | 'absent'>();
          
          try {
            // Load existing namaz attendance from database
            const response = await fetch(`/api/namaz-attendance?date=${date}&prayer=${prayer}`);
            if (response.ok) {
              const existingRecords = await response.json();
              console.log(`📊 Loaded ${existingRecords.length} existing namaz records from database for ${prayer} on ${date}`);
              
              // Set statuses from database records
              existingRecords.forEach((record: any) => {
                if (record.studentId && record.status) {
                  initialStatuses.set(record.studentId, record.status);
                }
              });
            } else {
              console.log(`📋 No existing namaz records found for ${prayer} on ${date}`);
            }
          } catch (error) {
            console.error('Error loading namaz attendance from database:', error);
          }
          
          // Initialize any missing students as absent (default state)
          filteredStudents.forEach((student: Student) => {
            if (!initialStatuses.has(student.id)) {
              initialStatuses.set(student.id, 'absent');
            }
          });
          
          setStudentStatuses(initialStatuses);
          setIsAttendanceSaved(false);
          setDataLoadKey(currentKey); // Mark this date-prayer combination as loaded
          
          console.log(`📋 Loaded attendance: ${initialStatuses.size} students for ${prayer} on ${date}`);
        }
      };
      
      loadNamazAttendance();
    } else {
      // If same date-prayer but different students (filter change), only add new students as absent
      const currentStatuses = new Map(studentStatuses);
      filteredStudents.forEach((student: Student) => {
        if (!currentStatuses.has(student.id)) {
          currentStatuses.set(student.id, 'absent');
        }
      });
      setStudentStatuses(currentStatuses);
    }
  }, [filteredStudents, prayer, date, dataLoadKey]);



  // Toggle student status
  const toggleStudentStatus = (studentId: number) => {
    // Prevent toggling if it's a holiday
    if (isHoliday) {
      toast({
        title: "Holiday Declared",
        description: `🔒 Cannot mark attendance - ${holidayInfo?.name || 'Holiday'} is declared for this date`,
        variant: "destructive"
      });
      return;
    }
    
    if (isAttendanceLocked) {
      toast({
        title: "Attendance Locked",
        description: "Attendance for this prayer is already recorded and locked.",
        variant: "destructive"
      });
      return;
    }

    // Check if student is on leave for this date
    const student = filteredStudents.find(s => s.id === studentId);
    const isOnLeave = LeaveSyncService.isStudentOnLeave(studentId, date);
    
    if (isOnLeave) {
      toast({
        title: "Student on Leave",
        description: `${student?.name} is on approved leave for this date.`,
        variant: "destructive"
      });
      return;
    }
    
    // Get current status and determine new status
    const currentStatus = studentStatuses.get(studentId) || 'absent';
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    console.log(`📝 Toggling ${student?.name}: ${currentStatus} → ${newStatus}`);
    
    // Create completely new Map to force React re-render
    const newStatusMap = new Map(studentStatuses);
    newStatusMap.set(studentId, newStatus);
    
    // Update ONLY UI state - NO localStorage or database persistence
    setStudentStatuses(newStatusMap);
    
    // Reset save state when attendance is modified (UI state only)
    setIsAttendanceSaved(false);
    
    console.log(`✅ ${student?.name} status updated in UI: ${currentStatus} → ${newStatus}`);
    console.log(`📌 Changes will be saved to database only when "Save Attendance" button is clicked`);
    
    // Show success toast for UI feedback
    toast({
      title: "Status Updated",
      description: `${student?.name} marked as ${newStatus}`,
    });
  };





  const totalStudents = filteredStudents.length;

  // Save attendance function with leave integration
  // Robust Save Attendance - Implements permanent data storage without auto-deletion
  const saveAttendance = async () => {
    if (saving || isAttendanceLocked) return;

    setSaving(true);
    try {
      const attendanceRecords = filteredStudents.map((student: any) => {
        const isOnLeave = student.onLeave;
        
        return {
          studentId: student.id,
          date: date,
          prayer: prayer,
          status: isOnLeave ? 'on-leave' : (studentStatuses.get(student.id) || 'present'),
          createdAt: new Date().toISOString()
        };
      });

      // Step 1: Save to robust persistence system (your requested data model)
      const nameStatusData = studentsToNameStatusMap(
        filteredStudents.map(s => ({ id: s.id, name: s.name })), 
        studentStatuses
      );
      NamazDataPersistence.saveAttendance(date, prayer, nameStatusData);
      console.log(`📚 Saved to robust persistence: ${prayer} on ${date}`);

      // Step 2: Save to database for permanent storage
      try {
        const response = await fetch('/api/namaz-attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date,
            prayer: prayer,
            students: attendanceRecords.map(record => ({
              id: record.studentId,
              status: record.status
            }))
          })
        });

        if (response.ok) {
          console.log(`🗄️ Synced to database: ${prayer} on ${date}`);
          queryClient.invalidateQueries({ queryKey: ['/api/namaz-attendance'] });
        } else {
          console.warn('Database sync failed, but data is safe in persistence system');
        }
      } catch (error) {
        console.warn('Database error, but data preserved locally:', error);
      }

      // Step 3: Legacy localStorage backup (for migration support)
      const storageData = {
        date: date,
        prayer: prayer,
        students: attendanceRecords.map(record => ({
          id: record.studentId,
          studentId: record.studentId,
          name: filteredStudents.find(s => s.id === record.studentId)?.name || '',
          rollNo: filteredStudents.find(s => s.id === record.studentId)?.rollNo || '',
          status: record.status
        }))
      };
      
      const storageKey = `namaz_${prayer}_${date}`;
      localStorage.setItem(storageKey, JSON.stringify(storageData));

      toast({
        title: "Attendance Saved",
        description: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} attendance saved for ${attendanceRecords.length} students`,
      });

      // Update all views and history
      const updatedHistory = getNamazHistory();
      setNamazHistory(updatedHistory);
      setSheetRefreshKey(prev => prev + 1);

      // Lock this prayer to prevent accidental overwrites
      namazLockService.lockPrayerAttendance(date, prayer, attendanceRecords.length);
      setIsAttendanceSaved(true);

    } catch (error) {
      console.error('Save attendance error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">🕌 Namaz Tracking</h2>
              <p className="text-sm text-emerald-100">Comprehensive Prayer Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const button = document.activeElement as HTMLButtonElement;
                const originalText = button.innerHTML;
                
                try {
                  // Show loading state
                  button.innerHTML = '<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Uploading...';
                  button.disabled = true;
                  
                  const { namazSync } = await import('@/lib/namazSyncService');
                  const result = await namazSync.syncToDatabase();
                  
                  if (result.total === 0) {
                    toast({
                      title: "No Data to Upload",
                      description: "All namaz data is already synced to database",
                    });
                  } else if (result.success === result.total) {
                    toast({
                      title: "✅ Upload Successful!",
                      description: `Successfully uploaded ${result.success} namaz records to database. Data is now accessible from all devices!`,
                    });
                  } else {
                    toast({
                      title: "Partial Upload",
                      description: `Uploaded ${result.success}/${result.total} records. ${result.failed} failed.`,
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error('Upload error:', error);
                  toast({
                    title: "Upload Failed",
                    description: "Failed to upload data to database. Please check your internet connection and try again.",
                    variant: "destructive"
                  });
                } finally {
                  button.innerHTML = originalText;
                  button.disabled = false;
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Upload to DB</span>
              <span className="sm:hidden">📤</span>
            </button>
            <NetworkStatusIndicator />
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-2 mt-2 bg-white/50 backdrop-blur-sm h-12">
            <TabsTrigger value="attendance" className="flex items-center gap-1 text-sm px-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Mark</span>
            </TabsTrigger>
            <TabsTrigger value="sheet" className="flex items-center gap-1 text-sm px-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Sheet</span>
              <span className="sm:hidden">Grid</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-sm px-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Log</span>
            </TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="flex-1 overflow-y-auto p-4">
            {/* Holiday Banner - Enhanced Version */}
            {isHoliday && holidayInfo && (
              <div className={`mb-4 p-4 rounded-xl border-2 shadow-lg ${
                holidayInfo.type === 'emergency' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-orange-50 border-orange-200 text-orange-800'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    holidayInfo.type === 'emergency' 
                      ? 'bg-red-100' 
                      : 'bg-orange-100'
                  }`}>
                    {holidayInfo.type === 'emergency' ? (
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    ) : (
                      <div className="text-xl">📅</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">
                      🔔 {holidayInfo.type === 'emergency' ? 'EMERGENCY HOLIDAY' : 'ACADEMIC HOLIDAY DECLARED'}
                    </h3>
                    <p className="font-bold text-lg">{holidayInfo.name || 'Holiday'}</p>
                    {holidayInfo.reason && (
                      <p className="text-sm mt-1 italic">Purpose: {holidayInfo.reason}</p>
                    )}
                    <div className="mt-2 p-2 bg-yellow-100 rounded border-l-4 border-yellow-500">
                      <p className="text-sm font-bold text-yellow-800">
                        ⚠️ NO PRAYERS TODAY - Namaz tracking disabled
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Lock Logic Alert */}
            {isAttendanceLocked && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Attendance already taken</strong> for {prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer on {date}.
                  <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-2">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Attendance?</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to reset the attendance for {prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer on {date}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => {
                            try {
                              resetAttendanceFromStorage(date, prayer);
                              
                              // Unlock the prayer attendance
                              namazLockService.unlockPrayerAttendance(date, prayer);
                              
                              // Reset component state
                              setStudentStatuses(new Map());
                              setIsAttendanceSaved(false);
                              setShowResetDialog(false);
                              
                              toast({ title: "Success!", description: "Attendance reset and unlocked successfully" });
                              
                              // Update history if on history tab
                              if (activeTab === "history") {
                                const history = getNamazHistory();
                                setNamazHistory(history);
                              }
                            } catch (error: any) {
                              toast({ title: "Error", description: "Failed to reset attendance", variant: "destructive" });
                            }
                          }}
                        >
                          Reset Attendance
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </AlertDescription>
              </Alert>
            )}

            {/* Controls */}
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white/70 backdrop-blur-sm"
                  disabled={isHoliday}
                />
                <div className="relative">
                  <Select value={prayer} onValueChange={setPrayer} disabled={isHoliday}>
                    <SelectTrigger className={`bg-white/70 backdrop-blur-sm pr-10 ${isHoliday ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fajr">🌅 Fajr {isPrayerCompleted('fajr') ? '✅' : ''}</SelectItem>
                      <SelectItem value="zuhr">☀️ Zuhr {isPrayerCompleted('zuhr') ? '✅' : ''}</SelectItem>
                      <SelectItem value="asr">🌇 Asr {isPrayerCompleted('asr') ? '✅' : ''}</SelectItem>
                      <SelectItem value="maghrib">🌆 Maghrib {isPrayerCompleted('maghrib') ? '✅' : ''}</SelectItem>
                      <SelectItem value="isha">🌙 Isha {isPrayerCompleted('isha') ? '✅' : ''}</SelectItem>
                    </SelectContent>
                  </Select>
                  {isPrayerCompleted(prayer) && (
                    <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-3 gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter} disabled={isHoliday}>
                  <SelectTrigger className={`bg-white/70 backdrop-blur-sm ${isHoliday ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                    <SelectItem value="6">6th Year</SelectItem>
                    <SelectItem value="7">7th Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={courseFilter} onValueChange={setCourseFilter} disabled={isHoliday}>
                  <SelectTrigger className={`bg-white/70 backdrop-blur-sm ${isHoliday ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={sectionFilter} 
                  onValueChange={setSectionFilter}
                  disabled={isHoliday || (yearFilter !== "all" && parseInt(yearFilter) > 2) || (courseFilter === "science")}
                >
                  <SelectTrigger className={`bg-white/70 backdrop-blur-sm ${isHoliday ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {/* Only show sections for commerce students in 1st and 2nd year */}
                    {(yearFilter === "all" || parseInt(yearFilter) <= 2) && courseFilter !== "science" && (
                      <>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Prayer Status Indicator */}
              {isPrayerCompleted(prayer) && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="text-lg">✅</span>
                    <span className="font-medium">
                      {prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer attendance already recorded for {date}
                    </span>
                  </div>
                </div>
              )}

              {/* Lock Status Indicator */}
              {isAttendanceLocked && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">🔒</span>
                    <span className="font-medium">
                      Attendance is locked for {prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer on {date}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {!isAttendanceLocked && !isHoliday && (
                <div className="flex gap-2 items-center justify-between">
                  <Button
                    onClick={() => {
                      // Create new Map with ALL students marked as present (excluding those on leave)
                      const allPresentMap = new Map<number, 'present' | 'absent'>();
                      
                      filteredStudents.forEach((student: Student) => {
                        // Only mark students who are not on leave
                        if (!student.onLeave) {
                          allPresentMap.set(student.id, 'present');
                        } else {
                          // Keep students on leave as absent
                          allPresentMap.set(student.id, 'absent');
                        }
                      });
                      
                      // Update ONLY the UI state - NO database persistence
                      setStudentStatuses(new Map(allPresentMap));
                      setIsAttendanceSaved(false);
                      
                      console.log(`✅ All Present: UI updated for ${allPresentMap.size} students - NO database save yet`);
                      
                      toast({
                        title: "All Present",
                        description: `Marked ${Array.from(allPresentMap.values()).filter(status => status === 'present').length} students as present`,
                      });
                    }}
                    className="bg-green-200 hover:bg-green-300 text-green-900 font-semibold px-4 py-2 rounded-lg transition-all duration-300"
                    disabled={isHoliday || filteredStudents.length === 0}
                  >
                    All Present
                  </Button>
                  <div className="text-sm text-gray-600 flex items-center">
                    <span className="font-bold">{totalStudents}</span>
                    <span className="ml-1">students</span>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isHoliday}
                  className={`pl-10 bg-white/70 backdrop-blur-sm ${isHoliday ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Holiday Override for Student List */}
            {isHoliday ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className={`p-8 rounded-2xl border-2 shadow-lg max-w-lg ${
                  holidayInfo?.type === 'emergency' 
                    ? 'bg-red-50 border-red-300 text-red-800' 
                    : 'bg-blue-50 border-blue-300 text-blue-800'
                }`}>
                  <div className="flex flex-col items-center space-y-6">
                    <div className={`p-4 rounded-full ${
                      holidayInfo?.type === 'emergency' 
                        ? 'bg-red-100' 
                        : 'bg-blue-100'
                    }`}>
                      {holidayInfo?.type === 'emergency' ? (
                        <AlertTriangle className="h-12 w-12 text-red-600" />
                      ) : (
                        <div className="text-4xl">🕌</div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-2xl mb-3">
                        {holidayInfo?.type === 'emergency' ? '🚨 Emergency Holiday Declared' : '🏫 Academic Holiday'}
                      </h3>
                      <div className="bg-white p-4 rounded-lg mb-4 shadow-sm">
                        <p className="font-bold text-xl text-gray-800 mb-2">{holidayInfo?.name || 'Holiday'}</p>
                        {holidayInfo?.reason && (
                          <p className="text-sm text-gray-600 italic">"{holidayInfo.reason}"</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm font-bold text-yellow-800">
                            🔒 NO PRAYERS TODAY - Namaz tracking disabled
                          </p>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>• All students are automatically marked as "Holiday"</p>
                          <p>• Prayer attendance marking is disabled for this date</p>
                          <p>• Return tomorrow for regular prayer tracking</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Students List */
              <div className="space-y-2">
                {filteredStudents.map((student: Student) => {
                const isOnLeave = student.onLeave;
                // Get current status - ensure it's properly initialized and force re-evaluation
                const currentStatus = studentStatuses.get(student.id) || 'absent';
                
                return (
                  <div
                    key={`${student.id}-${currentStatus}`}
                    className={`p-4 rounded-lg border transition-all ${
                      isOnLeave 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : isHoliday 
                          ? 'bg-blue-50 border-blue-200 cursor-not-allowed opacity-75'
                        : isAttendanceLocked 
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                          : currentStatus === 'present'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                            : 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (isOnLeave || isAttendanceLocked || isHoliday) {
                        // Silently ignore clicks on locked/leave/holiday students for better mobile UX
                        return;
                      }
                      
                      toggleStudentStatus(student.id);
                      
                      // Immediate refresh for Sheet tab synchronization
                      setTimeout(() => {
                        const updatedHistory = getNamazHistory();
                        setNamazHistory(updatedHistory);
                        setSheetRefreshKey(prev => prev + 1);
                        console.log(`🔄 Row click: Toggled ${student.name} to ${studentStatuses.get(student.id) === 'present' ? 'absent' : 'present'}`);
                      }, 100);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isOnLeave 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : currentStatus === 'present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            <span className="text-sm font-medium">
                              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            Roll: {student.rollNo} • {student.year}{student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} {student.courseType?.toUpperCase()}
                            {student.courseType === 'pu' && 
                             (student.year === 1 || student.year === 2) && 
                             student.courseDivision === 'commerce' && 
                             student.section && (
                              <span className="ml-1">
                                Section {student.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOnLeave ? (
                          <div className="flex items-center gap-2">
                            {/* Leave reason badges like attendance */}
                            {student.leaveInfo && (
                              <div className="flex gap-1">
                                {student.leaveInfo.reason.toUpperCase().includes('FEVER') && (
                                  <span className="w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded flex items-center justify-center">F</span>
                                )}
                                {student.leaveInfo.reason.toUpperCase().includes('EMERGENCY') && (
                                  <span className="w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded flex items-center justify-center">E</span>
                                )}
                                {!student.leaveInfo.reason.toUpperCase().includes('FEVER') && 
                                 !student.leaveInfo.reason.toUpperCase().includes('EMERGENCY') && (
                                  <span className="w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded flex items-center justify-center">L</span>
                                )}
                              </div>
                            )}
                            <span className="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded-full font-medium">
                              On Leave
                            </span>
                          </div>
                        ) : (
                          <button 
                            className={`px-3 py-1 text-sm rounded-full font-medium transition-all hover:scale-105 active:scale-95 ${
                              currentStatus === 'present'
                                ? 'bg-green-200 text-green-800 hover:bg-green-300'
                                : 'bg-red-200 text-red-800 hover:bg-red-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              
                              if (isOnLeave || isAttendanceLocked) {
                                // Silently ignore clicks on locked/leave students for better mobile UX
                                return;
                              }
                              
                              toggleStudentStatus(student.id);
                              
                              // Immediate refresh for Sheet tab synchronization
                              setTimeout(() => {
                                const updatedHistory = getNamazHistory();
                                setNamazHistory(updatedHistory);
                                setSheetRefreshKey(prev => prev + 1);
                                console.log(`🔄 Button click: Toggled ${student.name} to ${studentStatuses.get(student.id) === 'present' ? 'absent' : 'present'}`);
                              }, 100);
                            }}
                          >
                            {currentStatus === 'present' ? 'Present' : 'Absent'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}

            {filteredStudents.length === 0 && !isHoliday && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No students found matching your criteria</p>
              </div>
            )}
          </TabsContent>

          {/* Sheet Tab */}
          <TabsContent value="sheet" className="flex-1 overflow-y-auto p-4">
            <NamazAttendanceSheet 
              key={`sheet-${sheetRefreshKey}-${date}-${prayer}`}
              students={filteredStudents}
              namazHistory={namazHistory}
              holidays={holidays}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 overflow-y-auto">
            <HistoryRenderer 
              namazHistory={namazHistory}
              filteredStudents={filteredStudents}
              authenticStudents={authenticStudents}
            />
          </TabsContent>

        </Tabs>
      </div>

      {/* Save Button - Only for Attendance Tab */}
      {activeTab === "attendance" && filteredStudents.length > 0 && !isAttendanceLocked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-md mx-auto shadow-2xl">
          <Button
            onClick={isHoliday ? undefined : saveAttendance}
            disabled={isHoliday || isAttendanceLocked || saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-xl font-semibold text-base shadow-lg transition-all"
          >
            {saving ? 'Saving...' : `Save ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} Attendance (${totalStudents} students)`}
          </Button>
        </div>
      )}

      {/* Locked State Indicator for Save Button */}
      {activeTab === "attendance" && filteredStudents.length > 0 && isAttendanceLocked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-100 border-t max-w-md mx-auto shadow-2xl">
          <div className="flex items-center justify-center gap-2 py-4 text-gray-600">
            <span className="text-lg">🔒</span>
            <span className="font-medium">Attendance Locked</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Namaz Attendance Sheet Component
function NamazAttendanceSheet({ 
  students, 
  namazHistory,
  holidays 
}: {
  students: any[];
  namazHistory: any[];
  holidays: any[];
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Get days in the selected month - use current month and only show days up to today
  const today = new Date();
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  
  // If it's the current month, only show days up to today
  const maxDate = (selectedMonth.getFullYear() === today.getFullYear() && 
                   selectedMonth.getMonth() === today.getMonth()) ? today : monthEnd;
  
  const daysInMonth: Date[] = [];
  for (let d = new Date(monthStart); d <= maxDate; d.setDate(d.getDate() + 1)) {
    daysInMonth.push(new Date(d));
  }
  
  // Excel export function
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Create worksheet data
      const worksheetData = [];
      const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
      const prayerLabels = ['F', 'Z', 'A', 'M', 'I'];
      
      // Add title row
      const monthYear = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const titleRow = [`Namaz Attendance Sheet - ${monthYear}`];
      worksheetData.push(titleRow);
      worksheetData.push([]); // Empty row for spacing
      
      // Create header rows with proper structure
      const headerRow1 = ['Student Name'];
      const headerRow2 = [''];
      
      // Create header for each day with 5 prayer columns
      daysInMonth.forEach(date => {
        const dayNumber = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        headerRow1.push(`${dayNumber} (${dayName})`, '', '', '', ''); // Day number with day name spans 5 columns
        headerRow2.push(...prayerLabels); // F Z A M I for each day
      });
      
      // Add statistics columns
      headerRow1.push('', '', 'Monthly Summary');
      headerRow2.push('Total Days', 'Present', 'Percentage');
      
      worksheetData.push(headerRow1);
      worksheetData.push(headerRow2);
      
      // Sort students alphabetically for better organization
      const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
      
      // Add student data rows
      sortedStudents.forEach((student, index) => {
        const studentRow = [`${(index + 1).toString()}. ${student.name}`]; // Add serial number
        let totalPrayers = 0;
        let totalPresent = 0;
        let totalDaysWithAnyPrayer = 0;
        
        // Track days with any prayer attendance
        const daysWithAttendance = new Set();
        
        // Add attendance data for each day
        daysInMonth.forEach(date => {
          let dayHasAttendance = false;
          prayers.forEach(prayer => {
            const attendance = getAttendanceForStudentAndDate(student.id, date, prayer, holidays);
            studentRow.push(attendance);
            if (attendance === 'P') {
              totalPresent++;
              dayHasAttendance = true;
            }
            if (attendance !== '-' && attendance !== 'H') {
              totalPrayers++;
              dayHasAttendance = true;
            }
          });
          if (dayHasAttendance) {
            daysWithAttendance.add(date.getDate());
          }
        });
        
        totalDaysWithAnyPrayer = daysWithAttendance.size;
        
        // Calculate and add statistics
        const percentage = totalPrayers > 0 ? Math.round((totalPresent / totalPrayers) * 100) : 0;
        (studentRow as any[]).push(totalDaysWithAnyPrayer, totalPresent, `${percentage}%`);
        
        worksheetData.push(studentRow);
      });
      
      // Add summary row
      worksheetData.push([]); // Empty row
      const summaryRow = ['LEGEND:', 'P = Present', 'A = Absent', 'L = Leave', 'H = Holiday', '- = Not Marked'];
      worksheetData.push(summaryRow);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability
      const colWidths = [{ wch: 20 }]; // Student name column (wider)
      daysInMonth.forEach(() => {
        colWidths.push({ wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }); // 5 prayer columns per day
      });
      colWidths.push({ wch: 10 }, { wch: 8 }, { wch: 12 }); // Statistics columns
      worksheet['!cols'] = colWidths;
      
      // Merge cells for better presentation
      const merges = [];
      
      // Merge title row across all columns
      const totalCols = 1 + (daysInMonth.length * 5) + 3;
      merges.push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: totalCols - 1 }
      });
      
      // Merge day headers
      let colIndex = 1;
      daysInMonth.forEach(() => {
        const startCol = colIndex;
        const endCol = colIndex + 4;
        merges.push({
          s: { r: 2, c: startCol },
          e: { r: 2, c: endCol }
        });
        colIndex += 5;
      });
      
      // Merge statistics header
      const statsCols = 1 + (daysInMonth.length * 5);
      merges.push({
        s: { r: 2, c: statsCols },
        e: { r: 2, c: statsCols + 2 }
      });
      
      worksheet['!merges'] = merges;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Namaz Attendance');
      
      // Generate filename with timestamp for uniqueness
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Namaz_Attendance_${monthYear.replace(' ', '_')}_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  // Get namaz attendance records for the selected month
  const getAttendanceForStudentAndDate = (studentId: number, date: Date, prayer: string, holidaysData: any[] = []): string => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Check if this date is a holiday first using passed holidays data
    try {
      // Debug logging for holiday check
      if (dateStr === '2025-07-10') {
        console.log(`🎯 [SHEET] Holiday check for ${dateStr}:`, {
          holidaysDataLength: holidaysData.length,
          holidaysData: holidaysData
        });
      }
      
      // Find holiday from passed holidays data (consistent with main component)
      const holiday = holidaysData.find(h => h.date === dateStr && !h.isDeleted);
      
      if (holiday) {
        // Check if this applies to all or any course (namaz is cross-course)
        const affectedCourses = holiday.affectedCourses.map(course => course.toLowerCase());
        const shouldBlock = affectedCourses.includes('all') || 
                           affectedCourses.length > 0; // Any course means namaz is blocked
        
        if (dateStr === '2025-07-10') {
          console.log(`📅 [SHEET] Holiday found for ${dateStr}:`, holiday, 'shouldBlock:', shouldBlock);
        }
        
        if (shouldBlock) {
          return 'H'; // Return "H" for Holiday
        }
      } else if (dateStr === '2025-07-10') {
        console.log(`❌ [SHEET] No holiday found for ${dateStr}`);
      }
    } catch (error) {
      console.error('Error checking holiday status in sheet:', error, 'for date:', dateStr);
    }
    
    // Debug logging for today's data
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    if (isToday && prayer === 'zuhr') {
      console.log(`🔍 Sheet lookup for student ${studentId} on ${dateStr} ${prayer}:`, {
        namazHistoryLength: namazHistory.length,
        namazHistoryDates: namazHistory.map(s => `${s.date}-${s.prayer}`),
        searchingFor: `${dateStr}-${prayer}`
      });
    }
    
    // First try to find in namazHistory
    const sessionRecord = namazHistory.find((session: any) => 
      session.date === dateStr && session.prayer === prayer
    );
    
    if (sessionRecord && sessionRecord.records) {
      const studentRecord = sessionRecord.records.find((record: any) => 
        record.studentId === studentId
      );
      
      if (studentRecord) {
        if (isToday && prayer === 'zuhr') {
          console.log(`✅ Found in namazHistory: ${studentRecord.status}`);
        }
        
        // Check again for holiday override even if attendance exists
        try {
          const storedHolidays = localStorage.getItem('academic_holidays');
          const holidaysData = storedHolidays ? JSON.parse(storedHolidays) : [];
          const holiday = holidaysData.find(h => h.date === dateStr && !h.isDeleted);
          
          if (holiday) {
            const affectedCourses = holiday.affectedCourses.map(course => course.toLowerCase());
            const shouldBlock = affectedCourses.includes('all') || affectedCourses.length > 0;
            
            if (shouldBlock) {
              if (isToday && prayer === 'zuhr') {
                console.log(`🎯 [OVERRIDE] Holiday overrides attendance for ${dateStr}: ${holiday.name}`);
              }
              return 'H'; // Holiday overrides any existing attendance
            }
          }
        } catch (error) {
          console.error('Error in holiday override check:', error);
        }
        
        switch (studentRecord.status) {
          case 'present': return 'P';
          case 'absent': return 'A';
          case 'on-leave': return 'L';
          default: return '-';
        }
      }
    }
    
    // Also check direct localStorage keys as fallback
    const storageKey = `namaz_${prayer}_${dateStr}`;
    const directData = localStorage.getItem(storageKey);
    if (directData) {
      try {
        const parsed = JSON.parse(directData);
        const records = Array.isArray(parsed) ? parsed : (parsed.students || []);
        const studentRecord = records.find((record: any) => 
          record.studentId === studentId || record.id === studentId
        );
        
        if (studentRecord) {
          if (isToday && prayer === 'zuhr') {
            console.log(`✅ Found in localStorage: ${studentRecord.status}`);
          }
          switch (studentRecord.status) {
            case 'present': return 'P';
            case 'absent': return 'A';
            case 'on-leave': return 'L';
            default: return '-';
          }
        }
      } catch (error) {
        console.error('Error parsing direct storage data:', error);
      }
    }
    
    if (isToday && prayer === 'zuhr') {
      console.log(`❌ No attendance found for student ${studentId}`);
    }
    
    return '-';
  };
  
  // Calculate attendance statistics
  const calculateStats = (studentId: number, prayer: string) => {
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    
    // Find all sessions for this prayer within the month range
    const sessions = namazHistory.filter((session: any) => 
      session.prayer === prayer &&
      session.date >= monthStartStr &&
      session.date <= monthEndStr
    );
    
    let totalDays = 0;
    let presentDays = 0;
    
    sessions.forEach((session: any) => {
      if (session.records) {
        const studentRecord = session.records.find((record: any) => 
          record.studentId === studentId
        );
        
        if (studentRecord) {
          totalDays++;
          if (studentRecord.status === 'present') {
            presentDays++;
          }
        }
      }
    });
    
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    return { totalDays, presentDays, percentage };
  };
  
  const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
  
  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="h-12 w-12 mx-auto mb-2 opacity-30 bg-gray-200 rounded"></div>
        <p>No students found for the selected filters</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg p-3 border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setSelectedMonth(newMonth);
          }}
        >
          <span className="text-sm">←</span>
        </Button>
        
        <div className="text-center">
          <h3 className="font-semibold text-gray-900">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-xs text-gray-500">Namaz Attendance Sheet</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel()}
            className="text-green-600 hover:text-green-700"
          >
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newMonth = new Date(selectedMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setSelectedMonth(newMonth);
            }}
          >
            <span className="text-sm">→</span>
          </Button>
        </div>
      </div>
      
      {/* Single Attendance Sheet with All Prayers */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-3">
          <h4 className="font-semibold">Daily Namaz Attendance - All Prayers</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-700 sticky left-0 bg-gray-50 border-r min-w-[100px]">
                  Student
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 border-r min-w-[60px]">
                  Roll No
                </th>
                {daysInMonth.map((day) => (
                  <th key={day.toISOString()} className="px-1 py-2 text-center font-medium text-gray-700 border-r min-w-[80px]">
                    <div className="text-xs">
                      <div className="font-semibold">{day.getDate()}</div>
                      <div className="text-xs text-gray-500 grid grid-cols-5 gap-0.5 mt-1">
                        <span title="Fajr">F</span>
                        <span title="Zuhr">Z</span>
                        <span title="Asr">A</span>
                        <span title="Maghrib">M</span>
                        <span title="Isha">I</span>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium text-gray-700 border-l min-w-[80px]">Stats</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                // Calculate overall stats for the student
                const totalRecords = prayers.reduce((total, prayer) => {
                  const prayerStats = calculateStats(student.id, prayer);
                  return total + prayerStats.totalDays;
                }, 0);
                const totalPresent = prayers.reduce((total, prayer) => {
                  const prayerStats = calculateStats(student.id, prayer);
                  return total + prayerStats.presentDays;
                }, 0);
                const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
                
                return (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-2 text-left sticky left-0 bg-inherit border-r">
                      <div className="font-medium text-gray-900 text-xs">{student.name}</div>
                    </td>
                    <td className="px-2 py-2 text-center border-r">
                      <div className="text-xs text-gray-500">{student.rollNo}</div>
                    </td>
                    {daysInMonth.map((day) => {
                      return (
                        <td key={day.toISOString()} className="px-1 py-1 text-center border-r">
                          <div className="grid grid-cols-5 gap-0.5">
                            {prayers.map((prayer) => {
                              const attendance = getAttendanceForStudentAndDate(student.id, day, prayer, holidays);
                              return (
                                <span 
                                  key={prayer}
                                  className={`inline-block w-3 h-3 text-xs leading-3 rounded text-center ${
                                    attendance === 'P' ? 'bg-green-500 text-white' :
                                    attendance === 'A' ? 'bg-red-500 text-white' :
                                    attendance === 'L' ? 'bg-yellow-500 text-white' :
                                    attendance === 'H' ? 'bg-blue-500 text-white' :
                                    'bg-gray-200 text-gray-400'
                                  }`}
                                  title={`${prayer.charAt(0).toUpperCase() + prayer.slice(1)}: ${
                                    attendance === 'P' ? 'Present' :
                                    attendance === 'A' ? 'Absent' :
                                    attendance === 'L' ? 'Leave' :
                                    attendance === 'H' ? 'Holiday' : 'No Record'
                                  }`}
                                >
                                  {attendance}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center border-l">
                      <div className="text-xs">
                        <div className="font-medium">{overallPercentage}%</div>
                        <div className="text-gray-500">{totalPresent}/{totalRecords}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-white rounded-lg border p-3">
        <h4 className="font-medium text-gray-900 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-green-100 text-green-800 rounded text-center leading-4">P</span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-red-100 text-red-800 rounded text-center leading-4">A</span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-yellow-100 text-yellow-800 rounded text-center leading-4">L</span>
            <span>On Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-blue-100 text-blue-800 rounded text-center leading-4">H</span>
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-gray-100 text-gray-400 rounded text-center leading-4">-</span>
            <span>No Record</span>
          </div>
        </div>
      </div>
    </div>
  );
}