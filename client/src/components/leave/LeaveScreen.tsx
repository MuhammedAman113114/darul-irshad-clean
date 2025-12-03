import { useState, useEffect } from "react";
import { ArrowLeft, Search, Calendar, User, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotification } from "@/hooks/use-notification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student, Leave as LeaveRecord, InsertLeave } from "@shared/schema";
// Removed deprecated fetchAllStudents import - using React Query instead
import { type FormattedStudent } from "@/lib/studentService";
import { LeaveSyncService } from "@/lib/leaveSync";

interface LeaveScreenProps {
  onBack: () => void;
  role: string;
}

export default function LeaveScreen({ onBack, role }: LeaveScreenProps) {
  const [activeTab, setActiveTab] = useState<"add" | "view">("add");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  
  // Student filtering states
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  
  // Notification state
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch authentic students from database (same as attendance module)
  const { data: databaseStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifications && !target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Process database students into the required format
  const students = databaseStudents.map(student => ({
    id: student.id,
    name: student.name,
    rollNo: student.rollNo,
    course: student.courseType === 'pu' ? `PU ${student.year}` : `Post-PU ${student.year}`,
    courseType: student.courseType,
    year: parseInt(student.year),
    courseDivision: student.courseDivision,
    section: student.batch,
    batch: student.batch,
  })) as FormattedStudent[];

  // Students are now loaded from database using React Query

  // Fetch leaves from database API
  const { data: leavesData = [], isLoading: leavesLoading, refetch: refetchLeaves } = useQuery<LeaveRecord[]>({
    queryKey: ['/api/leaves'],
    queryFn: () => fetch('/api/leaves').then(res => res.json()),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Local state for leaves with localStorage backup
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const loadLeaves = () => {
      try {
        // Start with database data if available
        if (leavesData && leavesData.length > 0) {
          let leavesList = updateLeaveStatuses(leavesData);
          setLeaves(leavesList);
          
          // Also save to localStorage for offline access
          localStorage.setItem('leaves_data', JSON.stringify(leavesList));
          return;
        }

        // Fallback to localStorage if no database data
        const storedLeaves = localStorage.getItem('leaves_data');
        if (storedLeaves) {
          let parsedLeaves = JSON.parse(storedLeaves);
          parsedLeaves = Array.isArray(parsedLeaves) ? parsedLeaves : [];
          const updatedLeaves = updateLeaveStatuses(parsedLeaves);
          localStorage.setItem('leaves_data', JSON.stringify(updatedLeaves));
          setLeaves(updatedLeaves);
        } else {
          setLeaves([]);
        }
      } catch (error) {
        console.error('Error loading leaves:', error);
        setLeaves([]);
      }
    };

    loadLeaves();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadLeaves();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [leavesData]);

  // Function to update leave statuses based on current date
  const updateLeaveStatuses = (leavesList: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    return leavesList.map(leave => {
      const leaveEndDate = new Date(leave.toDate);
      leaveEndDate.setHours(23, 59, 59, 999); // Set to end of day
      
      // Mark leaves as completed if they've ended
      if ((leave.status === 'active' || leave.status === 'pending') && today > leaveEndDate) {
        return { ...leave, status: 'completed' };
      }
      // Convert any pending leaves to active if they haven't started yet or are current
      if (leave.status === 'pending') {
        return { ...leave, status: 'active' };
      }
      return leave;
    });
  };

  // Create leave mutation using database API
  const createLeaveMutation = useMutation({
    mutationFn: async (leaveData: InsertLeave) => {
      try {
        // Save to database via API
        const response = await fetch('/api/leaves', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: leaveData.studentId,
            fromDate: leaveData.fromDate,
            toDate: leaveData.toDate,
            reason: leaveData.reason,
            status: 'active' // Set to active immediately since this is teacher approval
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save leave to database');
        }

        const result = await response.json();
        const newLeave = result.data;

        // Also save to localStorage for offline access
        const existingLeaves = localStorage.getItem('leaves_data');
        let leavesList = existingLeaves ? JSON.parse(existingLeaves) : [];
        leavesList = updateLeaveStatuses(leavesList);
        leavesList.push(newLeave);
        localStorage.setItem('leaves_data', JSON.stringify(leavesList));
        
        // Auto-sync leave with attendance and namaz tracking
        LeaveSyncService.autoSyncNewLeave(newLeave);
        
        // Trigger storage event for real-time updates
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'leaves_data',
          newValue: JSON.stringify(leavesList),
          oldValue: existingLeaves
        }));
        
        return newLeave;
      } catch (error) {
        console.error('Database save failed, falling back to localStorage:', error);
        
        // Fallback to localStorage if database fails
        const existingLeaves = localStorage.getItem('leaves_data');
        let leavesList = existingLeaves ? JSON.parse(existingLeaves) : [];
        leavesList = updateLeaveStatuses(leavesList);
        
        const newId = leavesList.length > 0 ? Math.max(...leavesList.map((l: any) => l.id)) + 1 : 1;
        const newLeave = {
          ...leaveData,
          id: newId,
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: 1
        };
        
        leavesList.push(newLeave);
        localStorage.setItem('leaves_data', JSON.stringify(leavesList));
        
        LeaveSyncService.autoSyncNewLeave(newLeave);
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'leaves_data',
          newValue: JSON.stringify(leavesList),
          oldValue: existingLeaves
        }));
        
        return newLeave;
      }
    },
    onSuccess: () => {
      // Reset form
      setSelectedStudentId("");
      setFromDate("");
      setToDate("");
      setReason("");
      setStudentSearchTerm("");
      showNotification("Leave request submitted successfully!", "success");
      // Refetch leaves to update the list
      refetchLeaves();
      // Invalidate all leave-related queries in case student profile is open
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      // Switch to view tab to see the new leave
      setTimeout(() => setActiveTab("view"), 1000);
    },
    onError: () => {
      showNotification("Failed to submit leave request", "error");
    },
  });
  
  // Function to clear all leave data with confirmation
  const clearAllLeaves = () => {
    localStorage.removeItem('leaves_data');
    setLeaves([]);
    setShowClearConfirm(false);
    showNotification("All leave data cleared successfully!", "success");
    
    // Trigger storage event for real-time updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'leaves_data',
      newValue: null,
      oldValue: localStorage.getItem('leaves_data')
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId || !fromDate || !toDate || !reason) {
      showNotification("Please fill all fields.", "error");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      showNotification("From date cannot be after to date.", "error");
      return;
    }

    // Check for existing active leaves for this student
    const studentId = parseInt(selectedStudentId);
    const requestFromDate = new Date(fromDate);
    const requestToDate = new Date(toDate);
    
    const hasOverlappingLeave = leaves.some(leave => {
      if (leave.studentId !== studentId || leave.status !== 'active') {
        return false;
      }
      
      const existingFromDate = new Date(leave.fromDate);
      const existingToDate = new Date(leave.toDate);
      
      // Check for any overlap between existing leave and new request
      return (requestFromDate <= existingToDate && requestToDate >= existingFromDate);
    });
    
    if (hasOverlappingLeave) {
      const studentName = getStudentName(studentId);
      showNotification(
        `${studentName} already has active leave during this period. Please check existing leaves.`,
        "error"
      );
      return;
    }
    
    const leaveData: InsertLeave = {
      studentId: studentId,
      fromDate,
      toDate,
      reason,
      status: "active",
      createdBy: 1 // Assuming teacher ID = 1 for now
    };
    
    createLeaveMutation.mutate(leaveData);
  };
  
  // Helper function to get student name by ID
  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  // Helper function to calculate days between dates
  const calculateDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Function to check if a student is currently absent beyond their leave period
  const checkStudentAbsentBeyondLeave = (studentId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const studentLeaves = leaves.filter(leave => 
      leave.studentId === studentId && 
      leave.status === 'active'
    );
    
    for (const leave of studentLeaves) {
      const leaveEndDate = new Date(leave.toDate);
      const currentDate = new Date(today);
      
      // Check if current date is after leave end date (student should have returned)
      if (currentDate > leaveEndDate) {
        const daysBeyond = Math.ceil((currentDate.getTime() - leaveEndDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if student has actually attended classes since leave ended
        // This would require checking attendance records after leave end date
        // For now, we assume if leave ended and no attendance marked, student is still absent
        
        return {
          isAbsentBeyond: true,
          endDate: leave.toDate,
          daysBeyond,
          leaveReason: leave.reason,
          expectedReturnDate: leave.toDate
        };
      }
    }
    
    return { isAbsentBeyond: false };
  };

  // Function to get all students with active leave alerts
  const getLeaveAlerts = () => {
    const alerts: Array<{
      student: Student;
      endDate: string;
      daysBeyond: number;
      reason: string;
    }> = [];
    
    students.forEach(student => {
      const alertInfo = checkStudentAbsentBeyondLeave(student.id);
      if (alertInfo.isAbsentBeyond) {
        alerts.push({
          student,
          endDate: alertInfo.endDate!,
          daysBeyond: alertInfo.daysBeyond!,
          reason: alertInfo.leaveReason!
        });
      }
    });
    
    return alerts;
  };

  // Filter leaves by student name
  const filteredLeaves = leaves.filter(leave => {
    const studentName = getStudentName(leave.studentId);
    return studentName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter students with cascading filters matching madrasa structure
  const filteredStudents = students.filter(student => {
    const matchesSearch = studentSearchTerm === "" || 
                         student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(studentSearchTerm.toLowerCase());
    
    const matchesYear = yearFilter === "all" || student.year.toString() === yearFilter;
    
    // For PUC students (1st & 2nd year), check course
    // For 3rd-7th year students, ignore course filter
    let matchesCourse = true;
    if (parseInt(student.year) <= 2) {
      matchesCourse = courseFilter === "all" || 
                     (courseFilter === "commerce" && student.courseDivision === "commerce") ||
                     (courseFilter === "science" && student.courseDivision === "science");
    }
    
    // Section filter only applies to Commerce in PUC (1st & 2nd year)
    let matchesSection = true;
    if (parseInt(student.year) <= 2 && student.courseDivision === "commerce") {
      const studentSection = student.batch || "A";
      matchesSection = sectionFilter === "all" || 
                      studentSection.toLowerCase() === sectionFilter.toLowerCase();
    }
    
    return matchesSearch && matchesYear && matchesCourse && matchesSection;
  });

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 text-white bg-[#005c83]">
        <div className="flex items-center">
          <button 
            className="mr-3 back-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative z-30 cursor-pointer" 
            aria-label="Go back"
            onClick={onBack}
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Leave Management</h2>
        </div>
        
        {/* Notification Bell */}
        <div className="relative notification-dropdown">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative"
            type="button"
          >
            <Bell className="h-5 w-5" />
            {getLeaveAlerts().length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {getLeaveAlerts().length}
              </span>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Students Not Attending Beyond Leave ({getLeaveAlerts().length})
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Students who haven't returned to class after their approved leave ended
                </p>
              </div>
              
              {getLeaveAlerts().length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {getLeaveAlerts().map((alert, index) => (
                    <div key={index} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.student.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Roll: {alert.student.rollNo} • 
                            {parseInt(alert.student.year) === 1 ? '1st' : parseInt(alert.student.year) === 2 ? '2nd' : parseInt(alert.student.year) === 3 ? '3rd' : `${alert.student.year}th`} 
                            {parseInt(alert.student.year) <= 2 ? ' PUC' : ' Year'}
                          </p>
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            Not attending classes for {alert.daysBeyond} day{alert.daysBeyond !== 1 ? 's' : ''} after leave ended
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Expected return date: {new Date(alert.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Leave reason: {alert.reason}
                          </p>
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            ⚠️ Student has not returned to class as expected
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No leave alerts</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex border-b">
        <button 
          type="button"
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-[#005c83] border-b-2 border-[#005c83]' : 'text-gray-500'} cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors`}
          onClick={() => setActiveTab("add")}
          style={{ pointerEvents: 'auto' }}
        >
          Add Leave
        </button>
        <button 
          type="button"
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'view' ? 'text-[#005c83] border-b-2 border-[#005c83]' : 'text-gray-500'} cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors`}
          onClick={() => setActiveTab("view")}
          style={{ pointerEvents: 'auto' }}
        >
          View Leaves
        </button>
      </div>

      {/* Leave Alerts Section */}
      {getLeaveAlerts().length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Students Absent Beyond Leave Period
              </h3>
            </div>
          </div>
          <div className="space-y-2">
            {getLeaveAlerts().map((alert, index) => (
              <div key={index} className="text-sm text-red-700 bg-white p-3 rounded border border-red-200">
                <div className="font-medium">{alert.student.name} (Roll: {alert.student.rollNo})</div>
                <div className="text-xs text-red-600 mt-1">
                  Leave ended: {new Date(alert.endDate).toLocaleDateString()} • 
                  Absent for {alert.daysBeyond} additional day{alert.daysBeyond !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-600 mt-1">Original reason: {alert.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "add" ? (
        <div className="p-4 space-y-4">
          {/* Student Filters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Students by Class</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Year Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <Select value={yearFilter} onValueChange={(value) => {
                  setYearFilter(value);
                  // Reset filters when year changes
                  if (value === "all" || parseInt(value) > 2) {
                    setCourseFilter("all");
                    setSectionFilter("all");
                  }
                  // Clear search term when filters are applied
                  if (value !== "all") {
                    setStudentSearchTerm("");
                  }
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">1st PUC</SelectItem>
                    <SelectItem value="2">2nd PUC</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                    <SelectItem value="6">6th Year</SelectItem>
                    <SelectItem value="7">7th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course Filter - Only for PUC (1st & 2nd years) */}
              {(yearFilter === "all" || yearFilter === "1" || yearFilter === "2") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
                  <Select value={courseFilter} onValueChange={(value) => {
                    setCourseFilter(value);
                    // Reset section when course changes
                    setSectionFilter("all");
                    // Clear search term when filters are applied
                    if (value !== "all") {
                      setStudentSearchTerm("");
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="commerce">Commerce</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Section Filter - Only for Commerce in PUC */}
              {(yearFilter === "all" || yearFilter === "1" || yearFilter === "2") && 
               courseFilter === "commerce" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <Select value={sectionFilter} onValueChange={(value) => {
                    setSectionFilter(value);
                    // Clear search term when filters are applied
                    if (value !== "all") {
                      setStudentSearchTerm("");
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Filter Summary */}
            <div className="mt-3 text-xs text-gray-600">
              Showing {filteredStudents.length} students 
              {yearFilter !== "all" && (
                yearFilter === "1" || yearFilter === "2" 
                  ? ` • ${yearFilter === "1" ? "1st" : "2nd"} PUC`
                  : ` • ${yearFilter}${yearFilter === "3" ? "rd" : "th"} Year`
              )}
              {courseFilter !== "all" && ` • ${courseFilter.charAt(0).toUpperCase() + courseFilter.slice(1)}`}
              {sectionFilter !== "all" && ` • Section ${sectionFilter}`}
            </div>
          </div>

          {/* Filtered Students Display */}
          {(yearFilter !== "all" || courseFilter !== "all" || sectionFilter !== "all") && (
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-3 bg-gray-50 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Filtered Students ({filteredStudents.length})
                  </h4>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id.toString())}
                        className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                          selectedStudentId === student.id.toString() 
                            ? 'bg-blue-100 border-l-4 border-blue-500' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">{student.name}</h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                                <span className="bg-gray-100 px-2 py-1 rounded">Roll: {student.rollNo}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {student.year === 1 ? '1st' : student.year === 2 ? '2nd' : student.year === 3 ? '3rd' : `${student.year}th`} 
                                  {student.year <= 2 ? ' PUC' : ' Year'}
                                </span>
                                {student.courseDivision && (
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1)}
                                  </span>
                                )}
                                {student.batch && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    Section {student.batch}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {selectedStudentId === student.id.toString() && (
                            <div className="text-blue-500">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No students found</p>
                    <p className="text-xs">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search all students by name or roll number..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-sm w-full"
                />
              </div>
              
              {/* Display search results - only show when no class filters are active AND search term exists */}
              {studentSearchTerm && yearFilter === "all" && courseFilter === "all" && sectionFilter === "all" && (
                <div className="bg-white border rounded-lg shadow-sm max-h-48 overflow-y-auto">
                  {isStudentsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading students...</div>
                  ) : students.filter(student =>
                      student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                      student.rollNo.toLowerCase().includes(studentSearchTerm.toLowerCase())
                    ).length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {students.filter(student =>
                        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.rollNo.toLowerCase().includes(studentSearchTerm.toLowerCase())
                      ).map((student) => (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudentId(student.id.toString());
                            setStudentSearchTerm(student.name);
                          }}
                          className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                            selectedStudentId === student.id.toString() 
                              ? 'bg-blue-100 border-l-4 border-blue-500' 
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">{student.name}</h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                                <span className="bg-gray-100 px-2 py-1 rounded">Roll: {student.rollNo}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {student.year === 1 ? '1st' : student.year === 2 ? '2nd' : student.year === 3 ? '3rd' : `${student.year}th`} 
                                  {student.year <= 2 ? ' PUC' : ' Year'}
                                </span>
                                {student.courseDivision && (
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1)}
                                  </span>
                                )}
                                {student.batch && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    Section {student.batch}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No students found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">From Date</label>
                <Input 
                  type="date"
                  className="w-full p-3 rounded-lg border border-gray-300 text-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">To Date</label>
                <Input 
                  type="date"
                  className="w-full p-3 rounded-lg border border-gray-300 text-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            
            {/* Show existing active leaves for selected student */}
            {selectedStudentId && leaves.filter(leave => 
              leave.studentId === parseInt(selectedStudentId) && leave.status === 'active'
            ).length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ Existing Active Leaves for {getStudentName(parseInt(selectedStudentId))}:
                </div>
                <div className="space-y-2">
                  {leaves
                    .filter(leave => leave.studentId === parseInt(selectedStudentId) && leave.status === 'active')
                    .map(leave => (
                      <div key={leave.id} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        {new Date(leave.fromDate).toLocaleDateString()} to {new Date(leave.toDate).toLocaleDateString()} - {leave.reason}
                      </div>
                    ))
                  }
                </div>
                <div className="text-xs text-yellow-600 mt-2">
                  New leave dates cannot overlap with existing active leaves.
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <Textarea 
                rows={4}
                className="w-full p-3 rounded-lg border border-gray-300 text-sm"
                placeholder="Enter leave reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit"
                disabled={createLeaveMutation.isPending || !selectedStudentId || !fromDate || !toDate || !reason}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {createLeaveMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                type="text"
                placeholder="Search leaves by student name..."
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 text-sm"
                aria-label="Search leaves"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {leaves.length > 0 && (
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="outline"
                className="px-4 py-3 text-sm font-medium text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                Clear All
              </Button>
            )}
          </div>
          
          {leavesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading leaves...</div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {leaves.length === 0 ? "No leave requests yet." : "No leaves found matching your search."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaves.map((leave) => {
                const studentName = getStudentName(leave.studentId);
                const student = students.find(s => s.id === leave.studentId);
                const days = calculateDays(leave.fromDate, leave.toDate);
                
                return (
                  <div 
                    key={leave.id} 
                    className={`bg-white rounded-xl shadow-sm p-4 space-y-3 border-l-4 ${leave.status === 'active' ? 'border-orange-400' : 'border-gray-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-800">{studentName}</h4>
                          {student && (
                            <p className="text-xs text-gray-500">
                              Roll: {student.rollNo} • {student.year}{student.courseType === 'pu' ? 'st' : student.year === '1' ? 'st' : student.year === '2' ? 'nd' : student.year === '3' ? 'rd' : 'th'} {student.courseType === 'pu' ? 'PU' : 'Year'} {student.courseDivision || ''}
                              {student.batch && ` • Section ${student.batch}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${leave.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full`}>
                        {leave.status === 'active' ? 'Active' : 'Completed'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()} ({days} day{days !== 1 ? 's' : ''})
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                      <p className="text-xs text-gray-600">{leave.reason}</p>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Submitted: {new Date(leave.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Clear All */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Leave Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all leave requests for all students. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete all {leaves.length} leave record{leaves.length !== 1 ? 's' : ''}?
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={clearAllLeaves}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
