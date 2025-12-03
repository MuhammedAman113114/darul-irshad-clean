import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Eye, MessageSquare, MoreVertical, Plus, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/use-notification";
import type { Student, InsertStudent } from "@shared/schema";
import StudentFormDialog from "./StudentFormDialogFixed";

interface StudentsScreenProps {
  onBack: () => void;
  role: string;
}

export default function StudentsScreen({ onBack, role }: StudentsScreenProps) {
  const [courseType, setCourseType] = useState("all");
  const [courseDivision, setCourseDivision] = useState("all");
  const [year, setYear] = useState("all");
  const [batch, setBatch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  // Fetch students from database
  const { data: students = [], isLoading, error, refetch } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Debug students data
  React.useEffect(() => {
    console.log("Current students data:", students);
    const targetStudent = students.find(s => s.id === 45);
    if (targetStudent) {
      console.log("Target student (ID 45) current data:", targetStudent);
    }
  }, [students]);

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (studentData: InsertStudent) => {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create student');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      console.log("Create mutation success - invalidating cache");
      
      // Force immediate data refresh
      await queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      await queryClient.refetchQueries({ queryKey: ['/api/students'] });
      
      // Close form and show success
      setStudentFormOpen(false);
      setSelectedStudent(null);
      showNotification("Student added successfully", "success");
    },
    onError: () => {
      showNotification("Failed to add student", "error");
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, studentData }: { id: number; studentData: Partial<Student> }) => {
      console.log("🚀 Frontend: Sending PUT request to update student");
      console.log("📝 Student ID:", id);
      console.log("📝 Student data being sent:", studentData);
      
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      
      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update failed - Response:", errorText);
        throw new Error('Failed to update student');
      }
      
      const result = await response.json();
      console.log("✅ Frontend: Update successful, received:", result);
      return result;
    },
    onSuccess: async () => {
      console.log("Update mutation success - refreshing data");
      
      // Force complete cache refresh and refetch
      queryClient.removeQueries({ queryKey: ['/api/students'] });
      await queryClient.refetchQueries({ queryKey: ['/api/students'] });
      
      // Close form and show success
      setStudentFormOpen(false);
      setSelectedStudent(null);
      showNotification("Student updated successfully", "success");
    },
    onError: () => {
      showNotification("Failed to update student", "error");
    },
  });

  // Handle opening the student form dialog for adding a new student
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setStudentFormOpen(true);
  };

  // Handle opening the student form dialog for editing a student
  const handleEditStudent = async (student: Student) => {
    console.log("Opening edit dialog for student:", student);
    
    try {
      // Force complete cache refresh
      queryClient.removeQueries({ queryKey: ['/api/students'] });
      
      // Fetch fresh data directly from API
      const response = await fetch('/api/students', {
        credentials: 'include',
      });
      const freshStudents = await response.json() as Student[];
      const freshStudent = freshStudents.find(s => s.id === student.id) || student;
      
      console.log("Using fresh student data for editing:", freshStudent);
      setSelectedStudent(freshStudent);
      setStudentFormOpen(true);
    } catch (error) {
      console.error("Error fetching fresh student data:", error);
      // Fallback to current student data
      setSelectedStudent(student);
      setStudentFormOpen(true);
    }
  };

  // Handle saving student data
  const handleSaveStudent = (studentData: InsertStudent) => {
    console.log("🎯 handleSaveStudent called");
    console.log("📝 selectedStudent:", selectedStudent);
    console.log("📝 studentData received:", studentData);
    
    if (selectedStudent) {
      // Editing existing student
      console.log("🔄 Editing mode detected - Updating student with ID:", selectedStudent.id);
      console.log("📝 Original student data:", selectedStudent);
      console.log("📝 New student data:", studentData);
      
      updateStudentMutation.mutate({ 
        id: selectedStudent.id, 
        studentData: studentData 
      });
    } else {
      // Creating new student
      console.log("➕ Creating new student");
      createStudentMutation.mutate(studentData);
    }
  };

  // Filter students based on current selections
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === "" || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourseType = courseType === "all" || courseType === "" || student.courseType === courseType;
    const matchesCourseDivision = courseDivision === "all" || courseDivision === "" || student.courseDivision === courseDivision;
    const matchesYear = year === "all" || year === "" || student.year === year;
    const matchesBatch = batch === "all" || batch === "" || student.batch === batch;
    
    return matchesSearch && matchesCourseType && matchesCourseDivision && matchesYear && matchesBatch;
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
              <SelectItem value="all">All Types</SelectItem>
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
                <SelectItem value="all">All Divisions</SelectItem>
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
          
          {courseType === "pu" && courseDivision === "commerce" && (
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Search and Add Button */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3 pr-4 py-2 w-full rounded-md bg-white border-gray-300"
            />
          </div>
          <Button 
            onClick={handleAddStudent}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Student
          </Button>
        </div>
      </div>
      
      {/* Students List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || courseType || courseDivision || year || batch 
                ? 'Try adjusting your search or filters' 
                : 'Add students to get started'}
            </p>
            <Button onClick={handleAddStudent}>
              <Plus className="h-4 w-4 mr-1" /> Add Student
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">
                        Roll No: {student.rollNo} | {student.courseType.toUpperCase()} {student.year}
                        {student.courseDivision && ` ${student.courseDivision}`}
                        {student.batch && ` - Section ${student.batch}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStudent(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Form Dialog */}
      {studentFormOpen && (
        <StudentFormDialog
          student={selectedStudent}
          onSave={handleSaveStudent}
          onCancel={() => {
            setStudentFormOpen(false);
            setSelectedStudent(null);
          }}
          isLoading={createStudentMutation.isPending || updateStudentMutation.isPending}
        />
      )}
    </div>
  );
}