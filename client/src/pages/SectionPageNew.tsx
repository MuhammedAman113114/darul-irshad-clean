import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { SectionStorage } from '@/lib/sectionStorage';
import { useAuth } from '@/hooks/use-auth';
import { useNotification } from '@/hooks/use-notification';
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

// Define the Student interface
interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  batch?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  attendance?: string;
  grade?: string;
  onLeave?: boolean;
  photoUrl?: string;
}

const StudentList = ({ classConfig, sectionId }: { classConfig: ClassConfig, sectionId: string }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const sectionStudents = await SectionStorage.getStudentsBySection(sectionId);
      console.log('Loading dashboard students from section:', sectionId);
      console.log('Found', sectionStudents.length, 'students in dashboard section', sectionId.slice(-1));
      setStudents(sectionStudents);
      setFilteredStudents(sectionStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  useEffect(() => {
    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const handleDeleteStudent = async (studentId: number) => {
    try {
      // Delete from database
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete student: ${response.status}`);
      }

      // Update local state
      setStudents(prev => prev.filter(s => s.id !== studentId));
      showNotification('Student removed successfully', 'success');
    } catch (error) {
      console.error('Error deleting student:', error);
      showNotification('Failed to remove student', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Student Cards */}
      <div className="grid gap-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No students found</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div 
              key={student.id}
              className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Roll: {student.rollNo} • Section A
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Click "View Profile" to see attendance, Namaz, leaves & remarks
                        </p>
                      </div>
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
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowProfile(true);
                    }}
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    View Profile
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
          ))
        )}
      </div>

      {/* Student Profile Modal */}
      {showProfile && selectedStudent && (
        <StudentProfileScreen
          student={selectedStudent}
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default function SectionPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  // Extract parameters with fallbacks
  const sectionParam = params.section || 'A';
  
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  // Generate section configuration
  const config: ClassConfig = {
    id: 1,
    name: "1st PU Commerce",
    courseType: "PU",
    courseDivision: "Commerce",
    year: "1st",
    sections: ["A", "B"],
    periodsPerDay: 3
  };

  const sectionId = `pu_1_commerce_${sectionParam}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-400 text-white p-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setLocation('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{config.name}</h1>
            <p className="text-sm opacity-90">
              {config.courseDivision} • {config.sections.length} sections • {config.periodsPerDay} periods/day
            </p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-1 p-4">
          {config.sections.map((section) => (
            <Button
              key={section}
              variant={sectionParam === section ? "default" : "outline"}
              size="sm"
              onClick={() => setLocation(`/section/${section}`)}
              className={sectionParam === section ? "bg-blue-600 text-white" : ""}
            >
              Section {section}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search students..."
              className="w-64"
            />
            <Button variant="outline">
              All
            </Button>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <StudentList classConfig={config} sectionId={sectionId} />
      </div>
    </div>
  );
}