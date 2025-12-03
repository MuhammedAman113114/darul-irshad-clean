import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { databaseStudentStorage } from '@/lib/databaseStudentStorage';
import { useAuth } from '@/hooks/use-auth';
import { useNotification } from '@/hooks/use-notification';
import type { Student, InsertStudent } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Plus, Edit, Trash2, MoreVertical, BarChart3 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import StudentProfileScreen from "../components/student-profile/StudentProfileScreen";

// Define the class configuration interface
interface ClassConfig {
  id: number;
  name: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  sections: string[];
  periodsPerDay: number;
}



// StudentList component to display students in a section
const StudentList = ({ classConfig, sectionId }: { classConfig: ClassConfig, sectionId: string }) => {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Get the selected section
  const selectedSection = sectionId || classConfig.sections[0] || 'A';
  
  // Load students from database - ensures persistence across refreshes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get students from database for this section
        const sectionStudents = await databaseStudentStorage.getStudentsBySection(
          classConfig.courseType,
          classConfig.year,
          classConfig.courseDivision,
          selectedSection
        );
        
        // Update state with database students
        setStudents(sectionStudents);
        console.log(`Loaded ${sectionStudents.length} students from database for ${classConfig.name} section ${selectedSection}`);
      } catch (error) {
        console.error("Error loading students from database:", error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [classConfig.courseType, classConfig.year, classConfig.courseDivision, selectedSection, classConfig.name]);
  
  // Filter students based on search term and status filter
  const filteredStudents = students.filter((student) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo?.includes(searchTerm);
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !student.onLeave) ||
      (statusFilter === 'on-leave' && student.onLeave);
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle deleting a student
  const handleDeleteStudent = async (studentId: number) => {
    const success = await databaseStudentStorage.deleteStudent(studentId);
    if (success) {
      // Refresh student list
      const updatedStudents = students.filter(s => s.id !== studentId);
      setStudents(updatedStudents);
      showNotification("Student removed successfully", "success");
    } else {
      showNotification("Failed to remove student", "error");
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-md bg-gray-50 border-gray-200"
          />
        </div>
        
        <Button 
          onClick={() => {
            setEditingStudent(null);
            setStudentFormOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Student
        </Button>
      </div>
      
      {/* Student list */}
      <div className="space-y-3">
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
          <div className="text-center py-12 bg-white rounded-lg border">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search or filters' : 'Add students to get started'}
            </p>
            <Button
              onClick={() => {
                setEditingStudent(null);
                setStudentFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Student
            </Button>
          </div>
        ) : (
          // Student list
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer hover:bg-blue-50"
              onClick={() => {
                setSelectedStudent(student);
                setShowProfile(true);
              }}
            >
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="flex-shrink-0 mr-3">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-600 hover:text-blue-800">{student.name}</h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>Roll: {student.rollNo}</span>
                        {student.batch && <span className="mx-1">•</span>}
                        {student.batch && <span>Section {student.batch}</span>}
                      </div>
                      <div className="text-xs text-blue-500 mt-1 font-medium">
                        Click to view attendance, Namaz, leaves & remarks
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {student.onLeave && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        On Leave
                      </Badge>
                    )}
                    
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(student);
                        setShowProfile(true);
                      }}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Profile
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedStudent(student);
                          setShowProfile(true);
                        }}>
                          <BarChart3 className="h-4 w-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingStudent(student);
                          setStudentFormOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Student Form Dialog */}
      {studentFormOpen && (
        <Dialog open={studentFormOpen} onOpenChange={setStudentFormOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              <DialogDescription>
                {editingStudent ? "Update student information below." : "Enter student details to add them to this class."}
              </DialogDescription>
            </DialogHeader>
            
            {/* Photo upload */}
            <div className="flex flex-col items-center space-y-3 pb-4 pt-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center">
                {editingStudent?.photoUrl ? (
                  <img src={editingStudent.photoUrl} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div>
                <label htmlFor="photo" className="cursor-pointer inline-block text-sm px-4 py-2 bg-gray-50 rounded-md hover:bg-gray-100 border">
                  📷 {editingStudent?.photoUrl ? 'Change Photo' : 'Upload Photo'}
                </label>
                <Input 
                  id="photo" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              // Get form data
              const formData = new FormData(e.target as HTMLFormElement);
              const studentData: any = {
                id: editingStudent?.id,
                name: formData.get('name') as string,
                rollNo: formData.get('rollNo') as string,
                courseType: classConfig.courseType,
                courseDivision: classConfig.courseDivision,
                year: classConfig.year,
                batch: selectedSection,
                dob: formData.get('dob') as string,
                fatherName: formData.get('fatherName') as string,
                motherName: formData.get('motherName') as string,
                bloodGroup: formData.get('bloodGroup') as string,
                address: formData.get('address') as string
              };
              
              // Save student
              if (SectionStorage.saveStudent(studentData)) {
                // Refresh student list
                const updatedStudents = [...students];
                if (editingStudent) {
                  // Update existing student
                  const index = updatedStudents.findIndex(s => s.id === editingStudent.id);
                  if (index >= 0) {
                    updatedStudents[index] = studentData;
                  }
                } else {
                  // Add new student
                  updatedStudents.push(studentData);
                }
                setStudents(updatedStudents);
                // Removed success notification to avoid popup interruption
                setStudentFormOpen(false);
              } else {
                showNotification("Failed to save student data", "error");
              }
            }} 
            className="space-y-4">
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
                  type="date" 
                  name="dob" 
                  defaultValue={editingStudent?.dob} 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Father's Name</label>
                <Input 
                  name="fatherName" 
                  placeholder="Enter father's name" 
                  defaultValue={editingStudent?.fatherName} 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Mother's Name</label>
                <Input 
                  name="motherName" 
                  placeholder="Enter mother's name" 
                  defaultValue={editingStudent?.motherName} 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Blood Group</label>
                <Input 
                  name="bloodGroup" 
                  placeholder="Blood group (e.g., A+, B-)" 
                  defaultValue={editingStudent?.bloodGroup} 
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input 
                  name="address" 
                  placeholder="Enter full address" 
                  defaultValue={editingStudent?.address} 
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStudentFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Student Profile View */}
      {showProfile && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-white">
          <StudentProfileScreen 
            student={selectedStudent}
            onBack={() => setShowProfile(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function SectionPage() {
  const [, navigate] = useLocation();
  const { classId, sectionId } = useParams();
  const { user } = useAuth();
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  
  // Get the role from user
  const role = user?.role || 'teacher';

  useEffect(() => {
    // Parse the classId to get course type, year, and division
    // Format example: 1PU_COM for 1st PU Commerce
    if (classId) {
      try {
        // Parse classId format (e.g., 1PU_COM)
        const yearMatch = classId.match(/^(\d+)/);
        const year = yearMatch ? yearMatch[1] : '1';
        
        let courseType = 'pu';
        let courseDivision = 'common';
        
        if (classId.includes('PU_')) {
          // PU class
          if (classId.includes('_COM')) {
            courseDivision = 'commerce';
          } else if (classId.includes('_SCI')) {
            courseDivision = 'science';
          }
        } else {
          // Post-PU class
          courseType = 'post-pu';
        }
        
        // Create the class config
        const config: ClassConfig = {
          id: parseInt(year),
          name: `${year}${courseType === 'pu' ? 'st PU' : 'th Year'} ${courseDivision.charAt(0).toUpperCase() + courseDivision.slice(1)}`,
          courseType,
          courseDivision,
          year,
          sections: [sectionId || 'A'],
          periodsPerDay: 3
        };
        
        setClassConfig(config);
      } catch (error) {
        console.error('Error parsing class ID:', error);
      }
    }
  }, [classId, sectionId]);

  const handleBack = () => {
    navigate('/home');
  };

  if (!classConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading section...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`${role === 'principal' ? 'bg-principal-primary' : 'bg-teacher-primary'} text-white p-4 flex items-center`}>
        <button 
          type="button"
          className="mr-3"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{classConfig.name}</h1>
          <p className="text-xs opacity-80">
            {classConfig.courseType === 'pu' 
              ? `${classConfig.courseDivision?.charAt(0).toUpperCase()}${classConfig.courseDivision?.slice(1)} • Section ${sectionId}`
              : `${classConfig.year}th Year • Section ${sectionId}`
            }
          </p>
        </div>
      </header>

      {/* Main content with student list */}
      <div className="container mx-auto px-4 py-6">
        <StudentList 
          classConfig={{
            ...classConfig,
            sections: [sectionId || 'A']
          }}
          sectionId={sectionId || 'A'}
        />
      </div>
    </div>
  );
}