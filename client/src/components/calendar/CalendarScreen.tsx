import { useState } from "react";
import { ArrowLeft, Upload, Calendar as CalendarIcon, AlertCircle, Trash, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotification } from "@/hooks/use-notification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Holiday } from "@shared/schema";

interface CalendarScreenProps {
  onBack: () => void;
}

export default function CalendarScreen({ onBack }: CalendarScreenProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [holidayName, setHolidayName] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [affectedCourses, setAffectedCourses] = useState<string[]>([]);
  const [calendarPdf, setCalendarPdf] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch holidays from API
  const { data: holidays = [], isLoading, error } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create holiday');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      showNotification("Holiday added successfully!", "success");
      resetForm();
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to create holiday.", "error");
    }
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete holiday');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      showNotification("Holiday deleted successfully!", "success");
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to delete holiday.", "error");
    }
  });

  // Emergency leave processing mutation
  const emergencyProcessMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string; affectedCourses: string[] }) => {
      const response = await fetch('/api/emergency-leave/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process emergency leave');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      showNotification(
        `Emergency leave declared successfully! Auto-marked ${data.autoMarkedPeriodsCount} periods for ${data.affectedStudentsCount} students.`, 
        "success"
      );
      resetForm();
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to process emergency leave.", "error");
    }
  });

  const resetForm = () => {
    setHolidayName("");
    setEmergencyReason("");
    setAffectedCourses([]);
    setCalendarPdf(null);
    setPdfUrl(null);
    setSelectedDate(new Date());
  };

  // Sync leave with attendance and namaz systems
  const syncLeaveWithSystems = (holidayData: any) => {
    const leaveDate = holidayData.date;
    
    // Get all students for affected courses
    const allStudents: any[] = [];
    
    holidayData.affectedCourses.forEach((courseType: string) => {
      if (courseType === "pu") {
        // PU College students
        ['1', '2'].forEach(year => {
          ['commerce', 'science'].forEach(division => {
            if (division === 'commerce') {
              ['A', 'B'].forEach(section => {
                const sectionKey = `pu_${year}_${division}_${section}`;
                const stored = localStorage.getItem(sectionKey);
                if (stored) {
                  const students = JSON.parse(stored);
                  allStudents.push(...students.map((s: any) => ({...s, sectionKey})));
                }
              });
            } else {
              const sectionKey = `pu_${year}_${division}_A`;
              const stored = localStorage.getItem(sectionKey);
              if (stored) {
                const students = JSON.parse(stored);
                allStudents.push(...students.map((s: any) => ({...s, sectionKey})));
              }
            }
          });
        });
      } else if (courseType === "post-pu") {
        // Post-PU students
        ['3', '4', '5', '6', '7'].forEach(year => {
          const sectionKey = `post-pu_${year}_A`;
          const stored = localStorage.getItem(sectionKey);
          if (stored) {
            const students = JSON.parse(stored);
            allStudents.push(...students.map((s: any) => ({...s, sectionKey})));
          }
        });
      }
    });

    // Add leave records for each student
    const existingLeaves = JSON.parse(localStorage.getItem("leaves_data") || "[]");
    
    allStudents.forEach(student => {
      // Check if leave already exists for this student and date
      const existingLeave = existingLeaves.find((leave: any) => 
        leave.studentId === student.id && 
        leave.fromDate <= leaveDate && 
        leave.toDate >= leaveDate
      );
      
      if (!existingLeave) {
        const newLeave = {
          id: Date.now() + Math.random(),
          studentId: student.id,
          fromDate: leaveDate,
          toDate: leaveDate,
          reason: holidayData.type === 'emergency' 
            ? `Emergency Holiday: ${holidayData.reason || holidayData.name}`
            : `Academic Holiday: ${holidayData.name}`,
          status: "active",
          type: holidayData.type === 'emergency' ? 'emergency' : 'academic',
          createdBy: "system",
          createdAt: new Date().toISOString()
        };
        existingLeaves.push(newLeave);
      }
    });
    
    // Save updated leaves
    localStorage.setItem("leaves_data", JSON.stringify(existingLeaves));
    
    console.log(`✅ Synced leave for ${allStudents.length} students across attendance and namaz systems`);
    return allStudents.length;
  };

  const addHoliday = () => {
    if (!selectedDate) {
      showNotification("Please select a date for the holiday.", "error");
      return;
    }
    
    if (!holidayName.trim()) {
      showNotification("Please enter a holiday name.", "error");
      return;
    }

    if (affectedCourses.length === 0) {
      showNotification("Please select at least one affected course.", "error");
      return;
    }

    const data = {
      date: selectedDate.toISOString().split('T')[0],
      name: holidayName.trim(),
      type: "regular" as const,
      affectedCourses: affectedCourses,
      pdfUrl: pdfUrl,
      reason: null
    };

    // Sync with attendance and namaz systems
    const affectedStudents = syncLeaveWithSystems(data);
    
    createHolidayMutation.mutate({
      ...data,
      affectedStudentsCount: affectedStudents
    });
  };

  const addEmergencyHoliday = () => {
    // Use selected date or default to today for emergency
    const emergencyDate = selectedDate || new Date();
    
    if (!emergencyReason.trim()) {
      showNotification("Please provide a reason for the emergency holiday.", "error");
      return;
    }

    if (affectedCourses.length === 0) {
      showNotification("Please select at least one affected course.", "error");
      return;
    }

    const data = {
      date: emergencyDate.toISOString().split('T')[0],
      name: "Emergency Holiday",
      type: "emergency" as const,
      reason: emergencyReason.trim(),
      affectedCourses: affectedCourses,
      pdfUrl: null
    };

    console.log('Declaring emergency holiday with data:', data);
    
    // Sync with attendance and namaz systems
    const affectedStudents = syncLeaveWithSystems(data);
    
    // Use the emergency leave processing endpoint for auto-marking
    emergencyProcessMutation.mutate({
      date: data.date,
      reason: data.reason,
      affectedCourses: data.affectedCourses,
      affectedStudentsCount: affectedStudents
    });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setCalendarPdf(file);
        
        // Convert file to base64 for storage
        const reader = new FileReader();
        reader.onload = () => {
          setPdfUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        
        showNotification(`Calendar PDF "${file.name}" selected.`, "success");
      } else {
        showNotification("Please select a PDF file.", "error");
      }
    }
  };

  const isHoliday = (date: Date) => {
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getDate() === date.getDate() &&
        holidayDate.getMonth() === date.getMonth() &&
        holidayDate.getFullYear() === date.getFullYear();
    });
  };

  const toggleCourse = (course: string) => {
    if (affectedCourses.includes(course)) {
      setAffectedCourses(affectedCourses.filter(c => c !== course));
    } else {
      setAffectedCourses([...affectedCourses, course]);
    }
  };



  const exportToICS = () => {
    if (holidays.length === 0) {
      showNotification("No holidays to export", "error");
      return;
    }

    // Create ICS file content
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:Madrasa Academic Calendar\n";
    
    holidays.forEach(holiday => {
      const date = new Date(holiday.date);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      
      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `DTSTART;VALUE=DATE:${dateStr}\n`;
      icsContent += `DTEND;VALUE=DATE:${dateStr}\n`;
      icsContent += `SUMMARY:${holiday.name}\n`;
      if (holiday.reason) {
        icsContent += `DESCRIPTION:${holiday.reason}\n`;
      }
      icsContent += `UID:${holiday.id}@madrasa.calendar\n`;
      icsContent += `END:VEVENT\n`;
    });
    
    icsContent += "END:VCALENDAR";

    // Download the file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'academic-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification("Calendar exported successfully!", "success");
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center p-4 text-white bg-[#005c83]">
        <button 
          className="mr-3 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors" 
          aria-label="Go back"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Academic Calendar</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Calendar Export Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Calendar Export</h3>
                <p className="text-xs text-blue-600">
                  Export holidays to use in other calendar applications
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={exportToICS}
                disabled={holidays.length === 0}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export .ics
              </Button>
            </div>
          </div>
        </div>

        {/* Emergency Holiday Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="w-full">
              <h3 className="text-sm font-medium text-red-800">Emergency Holiday Declaration</h3>
              <p className="text-xs text-red-600 mt-1">Use this only for unexpected events requiring immediate closure.</p>
              
              <div className="mt-2 space-y-2">
                <div className="bg-white p-2 rounded border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Date: {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'Today'}
                  </p>
                  <p className="text-xs text-red-600">
                    {selectedDate ? 'Selected date from calendar below' : 'Will use today\'s date if no date selected'}
                  </p>
                </div>
                
                <Textarea 
                  placeholder="Reason for emergency holiday (e.g., Weather emergency, Unexpected situation, etc.)..."
                  className="text-sm p-2 w-full border-red-200 focus:border-red-300"
                  rows={3}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                />
                
                <div className="bg-white p-2 rounded border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-2">Affected Courses (select at least one):</p>
                  <div className="flex gap-3">
                    <label className="flex items-center text-xs text-red-600">
                      <input 
                        type="checkbox" 
                        className="mr-1 accent-red-500"
                        checked={affectedCourses.includes("pu")}
                        onChange={() => toggleCourse("pu")}
                      />
                      PU College
                    </label>
                    <label className="flex items-center text-xs text-red-600">
                      <input 
                        type="checkbox" 
                        className="mr-1 accent-red-500"
                        checked={affectedCourses.includes("post-pu")}
                        onChange={() => toggleCourse("post-pu")}
                      />
                      Post-PUC
                    </label>
                  </div>
                </div>
                
                <Button 
                  onClick={addEmergencyHoliday}
                  disabled={emergencyProcessMutation.isPending || !emergencyReason.trim() || affectedCourses.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 disabled:bg-gray-400"
                >
                  {emergencyProcessMutation.isPending ? 'Processing Emergency Leave...' : 'Declare Emergency Holiday'}
                </Button>
                
                {(!emergencyReason.trim() || affectedCourses.length === 0) && (
                  <p className="text-xs text-red-600 text-center">
                    {!emergencyReason.trim() ? 'Please provide a reason' : 'Please select affected courses'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Holiday Scheduling - Enhanced for Future Dates */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Academic Holiday Scheduling</h3>
            <div className="text-sm text-gray-500">Schedule current or future holidays</div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar View - Enhanced for Future Date Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700">Select Holiday Date</h4>
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-200 rounded mr-1"></div>
                    <span>Academic</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-200 rounded mr-1"></div>
                    <span>Emergency</span>
                  </div>
                </div>
              </div>
              
              {/* Date Input for Future Dates */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Date (Current or Future)
                </label>
                <Input
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can select any future date for advance planning
                </p>
              </div>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border bg-white w-full"
                fromDate={new Date()} // Allow navigation from today onwards
                modifiers={{
                  holiday: (date) => isHoliday(date),
                  emergency: (date) => holidays.some(h => {
                    const holidayDate = new Date(h.date).toDateString();
                    return holidayDate === date.toDateString() && h.type === 'emergency';
                  }),
                  academic: (date) => holidays.some(h => {
                    const holidayDate = new Date(h.date).toDateString();
                    return holidayDate === date.toDateString() && h.type !== 'emergency';
                  }),
                  future: (date) => date > new Date(),
                  today: (date) => date.toDateString() === new Date().toDateString()
                }}
                modifiersStyles={{
                  emergency: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' },
                  academic: { backgroundColor: '#dbeafe', color: '#2563eb', fontWeight: 'bold' },
                  holiday: { backgroundColor: '#f3f4f6', color: '#374151' },
                  future: { color: '#059669' },
                  today: { backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 'bold' }
                }}
              />
            </div>

            {/* Holiday Form */}
            <div className="space-y-4">
              {selectedDate && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Selected Date</h4>
                  <p className="text-sm text-blue-700">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {isHoliday(selectedDate) && (
                    <p className="text-xs text-blue-600 mt-1">
                      ⚠️ This date already has a holiday declared
                    </p>
                  )}
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Holiday Name</label>
                  <Input 
                    placeholder="e.g., Eid-ul-Fitr, Diwali, Republic Day"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Affected Courses</label>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        className="mr-2 accent-blue-500"
                        checked={affectedCourses.includes("pu")}
                        onChange={() => toggleCourse("pu")}
                      />
                      PU College (1st & 2nd Year)
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        className="mr-2 accent-blue-500"
                        checked={affectedCourses.includes("post-pu")}
                        onChange={() => toggleCourse("post-pu")}
                      />
                      Post-PUC (3rd-7th Year)
                    </label>
                  </div>
                </div>

                <Button 
                  onClick={addHoliday}
                  disabled={createHolidayMutation.isPending || !selectedDate || !holidayName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {createHolidayMutation.isPending ? 'Declaring Holiday...' : 'Declare Academic Holiday'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Holidays List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Scheduled Holidays</h3>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Loading holidays...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-xs text-red-500">Error loading holidays</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-4">
              <CalendarIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500">No holidays scheduled</p>
              <p className="text-xs text-gray-400">Add your first holiday above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="bg-white p-3 rounded border hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{holiday.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          holiday.type === 'emergency' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {holiday.type === 'emergency' ? 'Emergency' : 'Regular'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-1">
                        Date: {new Date(holiday.date).toLocaleDateString()}
                      </p>
                      
                      {holiday.reason && (
                        <p className="text-xs text-gray-600 mb-1">
                          Reason: {holiday.reason}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Affects: {holiday.affectedCourses?.join(', ') || 'All courses'}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                      disabled={deleteHolidayMutation.isPending}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete holiday"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}