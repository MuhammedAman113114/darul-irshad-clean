import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Users, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

interface AttendanceScreenProps {
  onBack: () => void;
  role: string;
}

export default function ModernAttendanceScreen({ onBack, role }: AttendanceScreenProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [courseType, setCourseType] = useState("pu");
  const [year, setYear] = useState("1");
  const [courseDivision, setCourseDivision] = useState("commerce");
  const [section, setSection] = useState("A");
  const [period, setPeriod] = useState("1");
  const [subject, setSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentStatuses, setStudentStatuses] = useState<Map<number, 'present' | 'absent'>>(new Map());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch students based on filters
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  // Filter students based on selection
  const filteredStudents = (allStudents as Student[]).filter((student: Student) => {
    const matchesSearch = searchTerm === "" || 
                         student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = student.courseType === courseType;
    const matchesYear = student.year.toString() === year;
    const matchesDivision = !courseDivision || student.courseDivision === courseDivision;
    const matchesSection = !section || student.section === section;
    
    return matchesSearch && matchesCourse && matchesYear && matchesDivision && matchesSection;
  });

  // Initialize all students as present
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const initialStatuses = new Map();
      filteredStudents.forEach((student: Student) => {
        if (!studentStatuses.has(student.id)) {
          initialStatuses.set(student.id, 'present');
        }
      });
      if (initialStatuses.size > 0) {
        setStudentStatuses(prev => {
          const newMap = new Map(prev);
          initialStatuses.forEach((value, key) => newMap.set(key, value));
          return newMap;
        });
      }
    }
  }, [filteredStudents]);

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: any[]) => {
      // Send individual API calls for each student
      const results = [];
      for (const record of attendanceRecords) {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!response.ok) throw new Error(`Failed to save attendance for student ${record.studentId}`);
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    },
  });

  const handleSaveAttendance = () => {
    const attendanceRecords = filteredStudents.map((student: Student) => ({
      studentId: student.id,
      date,
      period: parseInt(period),
      status: studentStatuses.get(student.id) || 'present',
      courseType,
      year: year, // Keep as string to match API expectation
    }));

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  const toggleStudentStatus = (studentId: number) => {
    setStudentStatuses(prev => {
      const newStatuses = new Map(prev);
      const currentStatus = newStatuses.get(studentId) || 'present';
      newStatuses.set(studentId, currentStatus === 'present' ? 'absent' : 'present');
      return newStatuses;
    });
  };

  const markAllPresent = () => {
    const newStatuses = new Map();
    filteredStudents.forEach((student: Student) => {
      newStatuses.set(student.id, 'present');
    });
    setStudentStatuses(newStatuses);
  };

  const presentCount = filteredStudents.filter((student: Student) => studentStatuses.get(student.id) === 'present').length;
  const absentCount = filteredStudents.length - presentCount;
  const totalStudents = filteredStudents.length;
  const presentPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header - Same style as Namaz */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-400 to-orange-500 text-white p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Attendance Tracking</h1>
        </div>
      </div>

      {/* Filters - Same style as Namaz */}
      <div className="p-4 space-y-3 bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            onChange={(e) => setDate(e.target.value)}
          />
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Period 1</SelectItem>
              <SelectItem value="2">Period 2</SelectItem>
              <SelectItem value="3">Period 3</SelectItem>
              <SelectItem value="4">Period 4</SelectItem>
              <SelectItem value="5">Period 5</SelectItem>
              <SelectItem value="6">Period 6</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Select value={courseType} onValueChange={setCourseType}>
            <SelectTrigger className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pu">PU College</SelectItem>
              <SelectItem value="post-pu">Post-PU</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {courseType === "pu" ? (
                <>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                  <SelectItem value="5">5th Year</SelectItem>
                  <SelectItem value="6">6th Year</SelectItem>
                  <SelectItem value="7">7th Year</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        
        {courseType === "pu" && (
          <div className="grid grid-cols-2 gap-3">
            <Select value={courseDivision} onValueChange={setCourseDivision}>
              <SelectTrigger className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commerce">Commerce</SelectItem>
                <SelectItem value="science">Science</SelectItem>
              </SelectContent>
            </Select>
            
            {courseDivision === "commerce" && (
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="p-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        
        <Input 
          type="text"
          placeholder="Subject name..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="p-3 text-sm focus:ring-2 focus:ring-orange-500"
        />
        
        <div className="relative">
          <Input 
            type="text"
            placeholder="Search students by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm p-3 focus:ring-2 focus:ring-orange-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>

      {/* Stats Summary - Same style as Namaz */}
      <div className="px-4 py-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-800">Attendance Overview</h3>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${presentPercentage}%` }}
            ></div>
          </div>
          <span className="text-lg font-bold text-gray-800 min-w-[3rem]">{presentPercentage}%</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-green-600">✅ Present: {presentCount}</span>
          <span className="text-red-600">❌ Absent: {absentCount}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-800">Total: {totalStudents} students</span>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllPresent}
            className="text-xs text-green-600 border-green-300 hover:bg-green-50 font-medium"
          >
            Mark All Present
          </Button>
        </div>
      </div>

      {/* Student List - Same beautiful style as Namaz */}
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
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredStudents.map((student: Student) => {
              const status = studentStatuses.get(student.id) || 'present';
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

      {/* Save Button - Same style as Namaz */}
      {filteredStudents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-md mx-auto shadow-2xl">
          <Button
            onClick={handleSaveAttendance}
            disabled={saveAttendanceMutation.isPending || !subject}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-semibold text-base shadow-lg transition-all disabled:opacity-50"
          >
            {saveAttendanceMutation.isPending ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving Attendance...
              </div>
            ) : (
              `Save Attendance (${totalStudents} students)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}