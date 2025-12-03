import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Eye, MessageSquare, MoreVertical, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/use-notification";
import type { Student } from "@shared/schema";
import StudentFormDialog from "./StudentFormDialogNew";

// Using Student type from shared schema

interface StudentsScreenProps {
  onBack: () => void;
  role: string;
}

export default function StudentsScreen({ onBack, role }: StudentsScreenProps) {
  const [courseType, setCourseType] = useState("");
  const [courseDivision, setCourseDivision] = useState("");
  const [year, setYear] = useState("");
  const [batch, setBatch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  // Fetch students from database
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Get current class config based on filters
  const getCurrentClassConfig = () => {
    // Create a class config object based on current filter selections
    return {
      courseType: courseType || "pu", // Default to PU if nothing selected
      courseDivision: courseDivision || undefined,
      year: year || "1", // Default to 1st year if nothing selected
      sections: batch ? [batch] : ["A", "B"]
    };
  };
  
  // Handle opening the student form dialog for adding a new student
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setStudentFormOpen(true);
  };
  
  // Handle opening the student form dialog for editing a student
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentFormOpen(true);
  };
  
  // Handle saving the student data (both new and edit)
  const saveStudent = (studentData: any) => {
    if (selectedStudent) {
      // Update existing student
      setStudents(prev => 
        prev.map(s => s.id === selectedStudent.id ? { ...s, ...studentData } : s)
      );
    } else {
      // Add new student
      const newId = Math.max(0, ...students.map(s => s.id)) + 1;
      setStudents(prev => [...prev, { ...studentData, id: newId }]);
    }
    setStudentFormOpen(false);
  };
  
  const filteredStudents = students.filter(student => {
    // Search term filter
    const matchesSearchTerm = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.includes(searchTerm);
    
    if (!matchesSearchTerm) return false;
    
    // Course type filter
    if (courseType && student.courseType !== courseType) return false;
    
    // Division filter (only for PU)
    if (courseType === "pu" && courseDivision && student.courseDivision !== courseDivision) return false;
    
    // Year filter
    if (year && student.year !== year) return false;
    
    // Batch filter (only applicable for PU Commerce)
    if (courseType === "pu" && courseDivision === "commerce" && batch && student.batch !== batch) return false;
    
    return true;
  });

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className={`flex items-center p-4 ${role === 'principal' ? 'bg-principal-primary' : 'bg-teacher-primary'} text-white`}>
        <button 
          className="mr-3 back-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative z-30 cursor-pointer" 
          aria-label="Go back"
          onClick={onBack}
          type="button"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Student Management</h2>
      </div>
      
      <div className="p-4 bg-teacher-light space-y-2">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={courseType} onValueChange={setCourseType}>
            <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
              <SelectValue placeholder="Select Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pu">PU College</SelectItem>
              <SelectItem value="post-pu">Post-PUC</SelectItem>
            </SelectContent>
          </Select>
          
          {courseType === "pu" && (
            <Select value={courseDivision} onValueChange={setCourseDivision}>
              <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commerce">Commerce</SelectItem>
                <SelectItem value="science">Science</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
              <SelectValue placeholder="Select Year" />
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
          
          {courseType === "pu" && courseDivision === "commerce" && (
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Batch A</SelectItem>
                <SelectItem value="B">Batch B</SelectItem>
                <SelectItem value="C">Batch C</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="relative">
          <Input 
            type="text"
            placeholder="Search students..."
            className="w-full p-2 pl-8 rounded-lg border border-gray-300 text-sm"
            aria-label="Search students"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        
        <div className="p-4 space-y-3 pb-20">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No students found.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 transform hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                <div 
                  className="flex items-start p-3 cursor-pointer"
                  onClick={() => alert(`View complete details for ${student.name}`)}
                >
                  <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0 mr-3">
                    {student.photo ? (
                      <img src={student.photo} alt="Student" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <i className="fas fa-user-graduate"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">{student.name}</h4>
                    <p className="text-xs text-gray-500">
                      Roll No: {student.rollNo} 
                      {student.batch && ` • Batch ${student.batch}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {student.courseType === "pu" ? "PU College" : "Post-PUC"} • 
                      {student.courseDivision && ` ${student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1)} •`} 
                      Year {student.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">DOB: {new Date(student.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div className="flex space-x-1 mt-2">
                      {student.onLeave ? (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">On Leave</span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{student.attendance} Attendance</span>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{student.grade} Grade</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors active:bg-gray-200 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      alert("More options");
                    }}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex border-t divide-x text-xs">
                  <button 
                    type="button"
                    className={`flex-1 py-2 text-${role === 'principal' ? 'principal' : 'teacher'}-primary flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleEditStudent(student);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </button>
                  <button 
                    type="button"
                    className="flex-1 py-2 text-gray-500 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      alert(`View details for ${student.name}`);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" /> View Details
                  </button>
                  <button 
                    type="button"
                    className="flex-1 py-2 text-gray-500 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      alert(`Remarks for ${student.name}`);
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" /> Remarks
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Student Form Dialog */}
      <StudentFormDialog
        open={studentFormOpen}
        onOpenChange={setStudentFormOpen}
        student={selectedStudent}
        classConfig={getCurrentClassConfig()}
        saveStudent={saveStudent}
      />
    </div>
  );
}
