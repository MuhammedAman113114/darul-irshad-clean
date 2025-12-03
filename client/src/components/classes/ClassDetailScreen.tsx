import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search, Filter, User, BookOpen, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StudentFormDialog from "../students/StudentFormDialogNew";
import StudentNotesComponent from "../notes/StudentNotesComponent";
import { LocalStorage, STORAGE_KEYS } from "@/lib/localStorage";
import { SectionStorage, Student as SectionStudent } from "@/lib/sectionStorage";

interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string; // "pu" or "post-pu"
  courseDivision?: string; // "commerce" or "science" for PU
  year: string; // "1" to "7" (1-2 for PU, 3-7 for Post-PUC)
  batch?: string; // Only for Commerce
  dob?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  attendance?: string;
  grade?: string;
  onLeave?: boolean;
  photo?: string;
}

interface ClassConfig {
  courseType: string;
  courseDivision?: string;
  year: string;
  title: string;
  section?: string;
}

interface ClassDetailScreenProps {
  onBack: () => void;
  classConfig: ClassConfig;
  role: string;
}

export default function ClassDetailScreen({ onBack, classConfig, role }: ClassDetailScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  
  // Load students using the new section-based storage system
  const [students, setStudents] = useState<Student[]>(() => {
    // Get students filtered by the current class configuration
    return SectionStorage.getStudentsBySection(
      classConfig.courseType,
      classConfig.year,
      classConfig.courseDivision,
      classConfig.section
    );
  });
  
  // Refresh student list whenever class config changes
  useEffect(() => {
    const sectionStudents = SectionStorage.getStudentsBySection(
      classConfig.courseType,
      classConfig.year,
      classConfig.courseDivision,
      classConfig.section
    );
    console.log(`Loading ${sectionStudents.length} students for section:`, classConfig.section);
    setStudents(sectionStudents);
  }, [classConfig.courseType, classConfig.year, classConfig.courseDivision, classConfig.section]);
  
  // Get current class config based on the provided props
  const getCurrentClassConfig = () => {
    return {
      courseType: classConfig.courseType,
      courseDivision: classConfig.courseDivision,
      year: classConfig.year,
      sections: classConfig.section ? [classConfig.section] : ["A", "B"]
    };
  };
  
  // Handle adding a new student
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setStudentFormOpen(true);
  };
  
  // Handle editing a student
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentFormOpen(true);
  };
  
  // Handle saving student data using our section-based storage system
  const saveStudent = (studentData: any) => {
    // Ensure the student data has the required classroom fields
    const preparedStudentData = {
      ...studentData,
      courseType: classConfig.courseType,
      courseDivision: classConfig.courseDivision,
      year: classConfig.year,
      // Use the current section - very important for proper section saving
      batch: classConfig.section || "A",
      // Set default values for any missing fields that might be used for filtering
      attendance: studentData.attendance || "100%",
      grade: studentData.grade || "N/A",
      onLeave: studentData.onLeave || false
    };
    
    console.log("Preparing to save student with section:", classConfig.section);
    console.log("Student data to save:", preparedStudentData);
    
    try {
      let studentToSave: Student;
      
      if (selectedStudent) {
        // Update existing student - preserve the ID
        studentToSave = { ...selectedStudent, ...preparedStudentData };
      } else {
        // Create a new student with ID (ID generation will happen in SectionStorage)
        studentToSave = { ...preparedStudentData, id: 0 }; // ID will be replaced in storage
      }
      
      // Save the student using our section storage system
      const success = SectionStorage.saveStudent(studentToSave);
      
      if (success) {
        console.log("Student saved successfully to section storage");
        
        // Refresh the student list for the current section
        const updatedStudents = SectionStorage.getStudentsBySection(
          classConfig.courseType,
          classConfig.year,
          classConfig.courseDivision,
          classConfig.section
        );
        
        // Update the state with the refreshed list
        setStudents(updatedStudents);
        console.log("Updated students list:", updatedStudents);
      } else {
        console.error("Failed to save student");
      }
    } catch (error) {
      console.error("Error saving student:", error);
    }
    
    setStudentFormOpen(false);
  };
  
  // Filter students only based on search term - section filtering is now handled by our storage system
  const filteredStudents = students.filter(student => {
    // Apply search filter only - section filtering happens in the storage layer
    return searchTerm === '' || 
          student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.rollNo?.includes(searchTerm);
  });
  
  console.log("Current class config:", classConfig);
  console.log("Total students in this section:", students.length);
  
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center p-4 bg-teacher-primary text-white">
        <button 
          type="button"
          className="mr-3"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-medium">{classConfig.title}</h1>
          <p className="text-xs opacity-80">
            {classConfig.courseType === "pu" 
              ? `${classConfig.year === "1" ? "1st" : "2nd"} Year ${classConfig.courseDivision} ${classConfig.section ? `- Section ${classConfig.section}` : ""}`
              : `${classConfig.year}th Year`}
          </p>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="bg-white p-4 shadow-sm z-10">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search students by name or roll number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg bg-gray-50 border-gray-200"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Class Info */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <BookOpen className={`h-5 w-5 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
          </div>
          <div>
            <h2 className="font-medium">Class Overview</h2>
            <p className="text-sm text-gray-500">Total Students: {students.length}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* FAB for Adding Student */}
        <button 
          type="button"
          className="fixed bottom-16 right-6 z-10 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-teacher-primary text-white transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer"
          aria-label="Add new student"
          onClick={handleAddStudent}
        >
          <Plus className="h-6 w-6" />
        </button>
        
        <div className="p-4 space-y-3 pb-20">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No students found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                onClick={() => {
                  setSelectedStudent(student);
                  setStudentFormOpen(true);
                }}
              >
                <div className="p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {student.photo ? (
                        <img 
                          src={student.photo} 
                          alt={student.name} 
                          className="w-12 h-12 rounded-full object-cover border bg-gray-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-base">{student.name}</h3>
                          <p className="text-xs text-gray-500">Roll No: {student.rollNo}</p>
                        </div>
                        <div className="flex space-x-2">
                          {student.onLeave && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                              On Leave
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            student.attendance && parseInt(student.attendance) > 90 
                              ? 'bg-green-100 text-green-700' 
                              : parseInt(student.attendance || '0') > 75 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-red-100 text-red-700'
                          }`}>
                            Att: {student.attendance}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                          DOB: {student.dob || 'N/A'}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                          Blood: {student.bloodGroup || 'N/A'}
                        </span>
                        <button 
                          className="ml-auto px-2 py-0.5 text-xs rounded-full flex items-center bg-teacher-primary/10 text-teacher-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Implement view notes functionality here
                            setSelectedStudent(student);
                            setShowNotes(true);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" /> Notes
                        </button>
                      </div>
                    </div>
                  </div>
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

      {/* Student Notes Dialog */}
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
            {selectedStudent && (
              <StudentNotesComponent 
                studentId={selectedStudent.id} 
                userRole="teacher"
                userName="Teacher User" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}