import React, { useState, useEffect } from 'react';
import { hybridStorage } from "@/lib/hybridStorage";
import { useNotification } from '@/hooks/use-notification';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Plus, Edit, FileText, Trash2, BarChart3 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import StudentNotesComponent from "../notes/StudentNotesComponent";
import StudentProfileScreen from "../student-profile/StudentProfileScreen";

export interface ClassConfig {
  id: string;
  name: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  sections: string[];
  periodsPerDay: number;
}

interface ClassSectionManagerProps {
  classConfig: ClassConfig;
}

export const ClassSectionManager: React.FC<ClassSectionManagerProps> = ({ classConfig }) => {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>(classConfig.sections[0] || 'A');
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Load students using section storage
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load students using hybrid storage (DB + localStorage)
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setIsLoading(true);
        
        const loadedStudents = await hybridStorage.getStudents(
          classConfig.courseType,
          classConfig.year,
          classConfig.courseDivision,
          selectedSection
        );
        
        setStudents(loadedStudents);
        console.log(`📚 Loaded ${loadedStudents.length} students for ${classConfig.name} section ${selectedSection}`);
      } catch (error) {
        console.error("Error loading students:", error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [classConfig.courseType, classConfig.year, classConfig.courseDivision, selectedSection]);
  
  // Filter students based on search and status
  const filteredStudents = students.filter((student: any) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !student.onLeave) ||
      (statusFilter === 'on-leave' && student.onLeave);
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle adding a new student
  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentFormOpen(true);
  };
  
  // Handle editing a student
  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentFormOpen(true);
  };
  
  // Handle saving student data
  const saveStudent = async (studentData: any) => {
    try {
      // Prepare the student data with required fields
      const preparedData = {
        ...studentData,
        courseType: classConfig.courseType,
        courseDivision: classConfig.courseDivision,
        year: classConfig.year,
        batch: selectedSection,
        // Set default values for any missing fields
        attendance: studentData.attendance || "100%",
        grade: studentData.grade || "N/A",
        onLeave: studentData.onLeave || false,
        // Generate ID if creating new student, keep existing ID if editing
        id: editingStudent?.id || Date.now()
      };
      
      console.log("💾 Saving student using hybrid storage:", preparedData);
      
      // Save using hybrid storage (database + localStorage)
      const success = await hybridStorage.saveStudent(preparedData);
      
      if (success) {
        // Refresh the student list
        const updatedStudents = await hybridStorage.getStudents(
          classConfig.courseType,
          classConfig.year,
          classConfig.courseDivision,
          selectedSection
        );
        
        setStudents(updatedStudents);
        
        showNotification(
          editingStudent ? "Student updated successfully" : "Student added successfully",
          "success"
        );
      } else {
        showNotification("Failed to save student data", "error");
      }
    } catch (error) {
      console.error("Error saving student:", error);
      showNotification("An error occurred while saving student", "error");
    }
    
    setStudentFormOpen(false);
  };
  
  // Handle deleting a student
  const handleDeleteStudent = async (studentId: number) => {
    try {
      console.log("🗑️ Deleting student using hybrid storage:", studentId);
      
      // Delete using hybrid storage (database + localStorage)
      const success = await hybridStorage.deleteStudent(
        studentId,
        classConfig.courseType,
        classConfig.year,
        classConfig.courseDivision,
        selectedSection
      );
      
      if (success) {
        // Refresh the student list
        const updatedStudents = await hybridStorage.getStudents(
          classConfig.courseType,
          classConfig.year,
          classConfig.courseDivision,
          selectedSection
        );
        
        setStudents(updatedStudents);
        showNotification("Student removed successfully", "success");
      } else {
        showNotification("Failed to delete student", "error");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      showNotification("An error occurred while deleting student", "error");
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Section Tabs */}
      {classConfig.sections.length > 1 && (
        <Tabs defaultValue={selectedSection} onValueChange={setSelectedSection}>
          <div className="bg-white border-b px-4">
            <TabsList className="bg-transparent h-10">
              {classConfig.sections.map((section) => (
                <TabsTrigger 
                  key={section} 
                  value={section}
                  className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4"
                >
                  Section {section}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}
      
      {/* Search and filter bar */}
      <div className="bg-white p-4 flex items-center space-x-2 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-md bg-gray-50 border-gray-200"
          />
        </div>
        
        <Select defaultValue={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleAddStudent}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      
      {/* Students list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px]">
        {isLoading ? (
          // Loading skeleton
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 border animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </>
        ) : filteredStudents.length === 0 ? (
          // Empty state
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No students found</p>
            <p className="text-sm">Try adjusting your search or add a new student</p>
          </div>
        ) : (
          // Student list
          filteredStudents.map((student) => (
            <div 
              key={student.id}
              className="bg-white rounded-lg p-4 border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name} 
                        className="w-12 h-12 rounded-full object-cover border bg-gray-50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-500">Roll No: {student.rollNo}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        Section {student.batch || 'A'}
                      </span>
                      {student.onLeave && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          On Leave
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* Student Profile Button - Primary Action */}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowProfile(true);
                    }}
                    title="View Student Profile"
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Profile
                  </Button>
                  
                  {/* Additional Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                        <span className="sr-only">Open menu</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowNotes(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Student form dialog */}
      {studentFormOpen && (
        <Dialog open={studentFormOpen} onOpenChange={setStudentFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              <DialogDescription>
                {editingStudent 
                  ? 'Update student information in the form below.'
                  : `Add a new student to ${classConfig.name} Section ${selectedSection}.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <form>
              <div className="grid gap-4 py-4">
                {/* Required Fields */}
                <div className="space-y-3">
                  {/* Hidden fields for class info */}
                  <input type="hidden" name="courseType" value={classConfig.courseType} />
                  <input type="hidden" name="courseDivision" value={classConfig.courseDivision} />
                  <input type="hidden" name="year" value={classConfig.year} />
                  <input type="hidden" name="batch" value={selectedSection} />
                  
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      name="name"
                      placeholder="Enter student's full name" 
                      defaultValue={editingStudent?.name} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Roll Number</label>
                    <Input 
                      name="rollNo"
                      placeholder="Enter roll number" 
                      defaultValue={editingStudent?.rollNo} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input 
                      name="dob"
                      type="date" 
                      defaultValue={editingStudent?.dob} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Father's Name</label>
                    <Input 
                      name="fatherName"
                      placeholder="Enter father's name" 
                      defaultValue={editingStudent?.fatherName} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Mother's Name</label>
                    <Input 
                      name="motherName"
                      placeholder="Enter mother's name" 
                      defaultValue={editingStudent?.motherName} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Textarea 
                      name="address"
                      placeholder="Enter full address (street, city, pin code)" 
                      className="resize-none" 
                      rows={3}
                      defaultValue={editingStudent?.address}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Blood Group</label>
                    <Select name="bloodGroup" defaultValue={editingStudent?.bloodGroup || 'O+'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStudentFormOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={(e) => {
                    e.preventDefault();
                    // Get form data
                    const form = e.currentTarget.closest('form');
                    if (!form) return;
                    
                    // Create FormData object and extract values
                    const formData = new FormData(form);
                    const studentData = {
                      name: formData.get('name') as string,
                      rollNo: formData.get('rollNo') as string,
                      dob: formData.get('dob') as string,
                      fatherName: formData.get('fatherName') as string,
                      motherName: formData.get('motherName') as string,
                      address: formData.get('address') as string,
                      bloodGroup: formData.get('bloodGroup') as string || 'O+',
                    };
                    
                    saveStudent(studentData);
                  }}
                >
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Student notes dialog */}
      {showNotes && selectedStudent && (
        <Dialog open={showNotes} onOpenChange={setShowNotes}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-teacher-primary">
                {selectedStudent?.name}'s Notes
              </DialogTitle>
              <DialogDescription>
                View and manage notes for this student
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <StudentNotesComponent 
                studentId={selectedStudent.id} 
                userRole="teacher"
                userName="Teacher User" 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Student Profile View */}
      {showProfile && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-white">
          <StudentProfileScreen 
            student={selectedStudent}
            onBack={() => setShowProfile(false)}
            role="teacher"
          />
        </div>
      )}
    </div>
  );
};