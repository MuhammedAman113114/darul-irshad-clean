import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Users, History, Download, RotateCcw, BarChart3, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useOfflineNamaz } from "@/hooks/useOfflineNamaz";
import { offlineSyncManager } from "@/lib/offline-sync";

interface Student {
  id: number;
  name: string;
  rollNo: string;
  course: string;
  courseType: string;
  year: number;
  courseDivision?: string;
  section?: string;
  createdAt: Date;
}

interface NamazScreenProps {
  onBack: () => void;
  role: string;
}

export default function OptimizedNamazScreen({ onBack, role }: NamazScreenProps) {
  const [activeTab, setActiveTab] = useState("attendance");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayer, setPrayer] = useState("zuhr");
  const [yearFilter, setYearFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last week
    endDate: new Date().toISOString().split('T')[0],
    selectedStudent: "all",
    selectedPrayer: "all"
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use offline-first namaz hook
  const {
    namazData,
    isSaving,
    updateStudentNamaz,
    initializeNamaz,
    getStudentStatus
  } = useOfflineNamaz({
    section: "all", // For now, using "all" as section identifier
    date,
    prayer
  });

  // Fetch authentic students from the same source as attendance system
  const { data: authenticStudents = [], isLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  // Check if attendance is already taken for this prayer today (Lock Logic)
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['/api/namaz-attendance', { date, prayer }],
    enabled: !!date && !!prayer,
  });

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch namaz history for History tab
  const { data: namazHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/namaz-attendance/history', historyFilters],
    enabled: activeTab === "history",
  });

  // Fetch namaz statistics for Dashboard tab
  const { data: namazStats } = useQuery({
    queryKey: ['/api/namaz-attendance/stats'],
    enabled: activeTab === "dashboard",
  });

  // Transform API data to match our authentic madrasa structure - same as attendance system
  const realMadrasaStudents = (authenticStudents as any[]).map(student => ({
    id: student.id,
    name: student.name,
    rollNo: student.rollNo,
    courseType: student.courseType,
    year: parseInt(student.year),
    courseDivision: student.courseDivision,
    section: student.batch, // Map batch to section for consistency
    course: student.courseDivision || (student.courseType === 'pu' ? 'PU College' : 'Post-PUC'),
    createdAt: student.createdAt
  }));

  // Filter authentic students (same logic as attendance system)
  const filteredStudents = realMadrasaStudents.filter((student: Student) => {
    const matchesSearch = searchTerm === "" || 
                         student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = yearFilter === "all" || student.year.toString() === yearFilter;
    
    return matchesSearch && matchesYear;
  });

  // Check if attendance is locked (already taken)
  const isAttendanceLocked = existingAttendance && existingAttendance.length > 0;

  // Initialize namaz data for students when they load
  useEffect(() => {
    if (filteredStudents.length > 0 && !isAttendanceLocked) {
      initializeNamaz(filteredStudents);
    }
  }, [filteredStudents, isAttendanceLocked, initializeNamaz]);

  // Handle save attendance with offline-first approach
  const handleSaveAttendance = async () => {
    try {
      // Use the offline namaz data directly since it's already synced with UI
      if (namazData.length === 0) {
        toast({
          title: "No Data",
          description: "No namaz data to save",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isOnline ? "Saving..." : "Saving Offline",
        description: isOnline 
          ? "Saving namaz attendance to database" 
          : "Saving namaz attendance locally, will sync when online",
      });

      // Data is automatically saved via the offline hook
      // Just need to invalidate queries if online
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['/api/namaz-attendance'] });
      }

      toast({
        title: "Success",
        description: isOnline 
          ? "Namaz attendance saved successfully" 
          : "Namaz attendance saved locally",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save namaz attendance",
        variant: "destructive",
      });
    }
  };

  // Toggle status - fast thumb-friendly marking using offline hook
  const toggleStudentStatus = (studentId: number) => {
    const currentStatus = getStudentStatus(studentId);
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    updateStudentNamaz(studentId, newStatus);
  };

  const markAllPresent = () => {
    filteredStudents.forEach((student: Student) => {
      updateStudentNamaz(student.id, 'present');
    });
  };

  const presentCount = filteredStudents.filter((student: Student) => getStudentStatus(student.id) === 'present').length;
  const absentCount = filteredStudents.length - presentCount;
  const totalStudents = filteredStudents.length;
  const presentPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="max-w-md mx-auto bg-stone-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Namaz Tracking</h1>
        </div>
      </div>

      {/* Filters - Optimized for Unified Namaz */}
      <div className="p-4 space-y-3 bg-stone-100">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            className="p-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-800"
            onChange={(e) => setDate(e.target.value)}
          />
          
          <Select value={prayer} onValueChange={setPrayer}>
            <SelectTrigger className="p-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800">
              <SelectValue placeholder="Select prayer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fajr">Fajr</SelectItem>
              <SelectItem value="zuhr">Zuhr</SelectItem>
              <SelectItem value="asr">Asr</SelectItem>
              <SelectItem value="maghrib">Maghrib</SelectItem>
              <SelectItem value="isha">Isha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="p-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800">
            <SelectValue placeholder="Filter by Year (Optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="1">1st Year (PUC)</SelectItem>
            <SelectItem value="2">2nd Year (PUC)</SelectItem>
            <SelectItem value="3">3rd Year (Post-PUC)</SelectItem>
            <SelectItem value="4">4th Year (Post-PUC)</SelectItem>
            <SelectItem value="5">5th Year (Post-PUC)</SelectItem>
            <SelectItem value="6">6th Year (Post-PUC)</SelectItem>
            <SelectItem value="7">7th Year (Post-PUC)</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative">
          <Input 
            type="text"
            placeholder="Search students by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm p-3 focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800 border-gray-200"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>

      {/* Stats Summary - Green/Red Progress Bar */}
      <div className="px-4 py-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Namaz Attendance Overview</h3>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${presentPercentage}%` }}
            ></div>
          </div>
          <span className="text-lg font-bold text-slate-800 min-w-[3rem]">{presentPercentage}%</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-emerald-600">✅ Present: {presentCount}</span>
          <span className="text-red-500">❌ Absent: {absentCount}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-stone-100 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-800">Total: {totalStudents} students</span>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllPresent}
            className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 font-medium"
          >
            Mark All Present
          </Button>
        </div>
      </div>

      {/* Student List - Optimized for Fast Thumb-Friendly Marking */}
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading students...</p>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No students found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredStudents.map((student: Student) => {
              const status = getStudentStatus(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudentStatus(student.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-95 select-none ${
                    status === 'present'
                      ? 'border-green-400 bg-gradient-to-r from-green-50 to-green-100 shadow-sm'
                      : 'border-red-400 bg-gradient-to-r from-red-50 to-red-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-base">{student.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        <span className="font-medium bg-gray-100 px-2 py-1 rounded">Roll: {student.rollNo}</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          {student.year}{
                            student.year === 1 ? 'st' : 
                            student.year === 2 ? 'nd' : 
                            student.year === 3 ? 'rd' : 'th'
                          } Year
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                          {student.year <= 2 ? 'PUC' : 'Post-PUC'}
                        </span>
                        {student.section && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            Section {student.section}
                          </span>
                        )}
                        {student.course && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                            {student.course}
                          </span>
                        )}
                        {student.courseDivision && (
                          <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded font-medium">
                            {student.courseDivision}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all shadow-md ${
                      status === 'present' ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'
                    }`}>
                      {status === 'present' ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Button - Sticky Footer */}
      {filteredStudents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-md mx-auto shadow-2xl">
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-semibold text-base shadow-lg transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              {isSaving && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
              {isOnline ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
              <span>
                {isSaving ? "Saving..." : `Save Namaz (${totalStudents} students)`}
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}