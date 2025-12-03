import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useNotification } from '@/hooks/use-notification';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { LeaveSyncService } from '@/lib/leaveSync';
import '@/lib/leaveDebug';
import { GraduationCap, Users, ChevronRight, ArrowLeft, Book, Search, User, Edit, MoreVertical, Trash2, Filter, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DrawerNavigation from '@/components/layouts/DrawerNavigation';
import AttendanceScreen from "@/components/attendance/AttendanceScreen";
import ComprehensiveNamazScreen from "@/components/namaz/ComprehensiveNamazScreen";
import LeaveScreen from "@/components/leave/LeaveScreen";
import MissedAttendanceScreen from "@/components/missed-attendance/MissedAttendanceScreen";

import RemarksScreen from "@/components/remarks/RemarksScreen";
import ResultsScreen from "@/components/results/ResultsScreenUpdated";
import CalendarScreen from "@/components/calendar/CalendarScreen";
import AcademicCalendarScreen from "@/components/calendar/AcademicCalendarScreen";
import SubjectTimetablePage from "@/pages/SubjectTimetablePage";
import ClassDetailScreen from "@/components/classes/ClassDetailScreen";
import ClassesScreen from "@/components/classes/ClassesScreen";
import SectionManagement from "@/components/classes/SectionManagement";
import HybridStorageAdmin from "@/components/admin/HybridStorageAdmin";
import StudentProfileScreen from "@/components/student-profile/StudentProfileScreen";
import { SectionNavigationButtons } from "@/components/sections/SectionNavigationButtons";
import { SectionStorage } from "@/lib/sectionStorage";
import { syncService } from "@/lib/syncService";
import { useSections, getSectionsForCourse } from "@/hooks/use-sections";

import darul_irshad_mani_removebg_preview from "@assets/darul_irshad_mani-removebg-preview.png";

// Class Detail Component
const ClassView = ({ classConfig, onBack, role }: any) => {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>(classConfig.sections[0] || 'A');
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  
  // Load students from database
  const studentsQuery = useQuery({
    queryKey: ['/api/students', classConfig.courseType, classConfig.year, classConfig.courseDivision, selectedSection],
    enabled: !!classConfig.courseType && !!classConfig.year,
  });

  // Filter students based on current class configuration
  const students = React.useMemo(() => {
    if (!studentsQuery.data || !Array.isArray(studentsQuery.data)) return [];
    
    return studentsQuery.data.filter((student: any) => {
      if (student.courseType !== classConfig.courseType) return false;
      if (student.year !== classConfig.year) return false;
      if (classConfig.courseDivision && student.courseDivision !== classConfig.courseDivision) return false;
      if (selectedSection !== 'all' && student.batch !== selectedSection) return false;
      return true;
    });
  }, [studentsQuery.data, classConfig.courseType, classConfig.year, classConfig.courseDivision, selectedSection]);

  const isLoading = studentsQuery.isLoading;
  
  // Filter students based on search term, selected section, and status
  const filteredStudents = !students || !Array.isArray(students) ? [] : students.filter((student: any) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo?.includes(searchTerm);
    
    // Section filter
    const matchesSection = selectedSection === 'all' || 
      student.batch === selectedSection;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !student.onLeave) ||
      (statusFilter === 'on-leave' && student.onLeave);
    
    return matchesSearch && matchesSection && matchesStatus;
  });
  
  // Show student profile if selected
  if (selectedStudentProfile) {
    return (
      <StudentProfileScreen
        student={selectedStudentProfile}
        onBack={() => setSelectedStudentProfile(null)}
        role={role}
      />
    );
  }

  return (
    <div className="min-h-screen brand-gray-bg flex flex-col">
      {/* Header */}
      <header className="brand-nav text-white p-4 flex items-center">
        <button 
          type="button"
          className="mr-3"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{classConfig.name}</h1>
          <p className="text-xs opacity-80">
            {classConfig.courseType === 'pu' 
              ? `${classConfig.courseDivision?.charAt(0).toUpperCase()}${classConfig.courseDivision?.slice(1)} • ${classConfig.sections.length} section${classConfig.sections.length > 1 ? 's' : ''} • ${classConfig.periodsPerDay} periods/day`
              : `${classConfig.periodsPerDay} periods/day`
            }
          </p>
        </div>
      </header>
      {/* Section Navigation Buttons */}
      {classConfig.sections.length > 1 && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex space-x-3">
            {classConfig.sections.map((section: string) => {
              return (
                <Button 
                  key={section} 
                  variant={selectedSection === section ? "default" : "outline"}
                  onClick={() => {
                    setSelectedSection(section);
                  }}
                  className={`flex-1 sm:flex-none ${selectedSection === section ? 'bg-brand-dark-blue hover:bg-brand-dark-blue/90' : 'border-brand-dark-blue/20 text-brand-dark-blue hover:bg-brand-dark-blue/5'}`}
                >
                  Section {section}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      {/* Search and Filter */}
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
          onClick={() => {
            setEditingStudent(null);
            setSelectedPhoto(null);
            setStudentDialogOpen(true);
          }}
          className="border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {/* Student List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          // Loading skeleton
          (<>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 border animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </>)
        ) : filteredStudents.length === 0 ? (
          // Empty state
          (<div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search or filters' : 'Add students to get started'}
            </p>
            <Button
              onClick={() => {
                setEditingStudent(null);
                setStudentDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Student
            </Button>
          </div>)
        ) : (
          // Student list
          (filteredStudents.map((student: any) => (
            <div
              key={student.id}
              className="brand-card overflow-hidden hover:scale-[1.01] transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedStudentProfile(student)}
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
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>Roll: {student.rollNo}</span>
                        {student.batch && <span className="mx-1">•</span>}
                        {student.batch && <span>Section {student.batch}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {student.onLeave && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        On Leave
                      </Badge>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingStudent(student);
                          setSelectedPhoto(null);
                          setStudentDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={async (e) => {
                            e.stopPropagation();
                            
                            // Confirm deletion
                            if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
                              try {
                                // Delete from database
                                const response = await fetch(`/api/students/${student.id}`, {
                                  method: 'DELETE',
                                });

                                if (!response.ok) {
                                  throw new Error(`Failed to delete student: ${response.status}`);
                                }

                                // Refetch the students data to update UI
                                studentsQuery.refetch();
                                
                                showNotification(`${student.name} removed successfully`, "success");
                              } catch (error) {
                                console.error("Error deleting student:", error);
                                showNotification("Error removing student", "error");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          )))
        )}
      </div>
      {/* Student Form Dialog */}
      {studentDialogOpen && (
        <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
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
                {(selectedPhoto || editingStudent?.photoUrl) ? (
                  <img src={selectedPhoto || editingStudent?.photoUrl} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div>
                <Label htmlFor="photo" className="cursor-pointer inline-block text-sm px-4 py-2 bg-gray-50 rounded-md hover:bg-gray-100 border">
                  📷 {(selectedPhoto || editingStudent?.photoUrl) ? 'Change Photo' : 'Upload Photo'}
                </Label>
                <Input 
                  id="photo" 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageUrl = event.target?.result as string;
                        setSelectedPhoto(imageUrl);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
            
            <form id="studentForm" className="grid gap-4 py-4">
              {/* Required Fields */}
              <div className="space-y-3">
                {/* Hidden fields for class info */}
                <input type="hidden" name="courseType" value={classConfig.courseType} />
                <input type="hidden" name="courseDivision" value={classConfig.courseDivision} />
                <input type="hidden" name="year" value={classConfig.year} />
                <input type="hidden" name="batch" value={selectedSection} />
                
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input name="name" placeholder="Enter student's full name" defaultValue={editingStudent?.name} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Roll Number</label>
                  <Input name="rollNo" placeholder="Enter roll number" defaultValue={editingStudent?.rollNo} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input name="dob" type="date" defaultValue={editingStudent?.dob} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Father's Name</label>
                  <Input name="fatherName" placeholder="Enter father's name" defaultValue={editingStudent?.fatherName} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Mother's Name</label>
                  <Input name="motherName" placeholder="Enter mother's name" defaultValue={editingStudent?.motherName} required />
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
                  <label className="text-sm font-medium">Contact Number 1</label>
                  <Input 
                    name="contact1" 
                    placeholder="Enter primary contact number" 
                    defaultValue={editingStudent?.contact1}
                    type="tel"
                    maxLength={15}
                    pattern="[0-9+\-\s]+"
                    title="Please enter a valid phone number"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Contact Number 2</label>
                  <Input 
                    name="contact2" 
                    placeholder="Enter secondary contact number (optional)" 
                    defaultValue={editingStudent?.contact2}
                    type="tel"
                    maxLength={15}
                    pattern="[0-9+\-\s]+"
                    title="Please enter a valid phone number"
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
                
                <div>
                  <label className="text-sm font-medium">Aadhar Number</label>
                  <Input 
                    name="aadharNumber" 
                    placeholder="Enter 12-digit Aadhar number" 
                    defaultValue={editingStudent?.aadharNumber}
                    maxLength={12}
                    pattern="[0-9]{12}"
                    title="Please enter a valid 12-digit Aadhar number"
                  />
                </div>
                
                {classConfig.sections.length > 1 && (
                  <div>
                    <label className="text-sm font-medium">Section</label>
                    <Select name="section" defaultValue={editingStudent?.batch || selectedSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {classConfig.sections.map((section: string) => (
                          <SelectItem key={section} value={section}>Section {section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </form>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditingStudent(null);
                setSelectedPhoto(null);
                setStudentDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" onClick={(e) => {
                e.preventDefault();
                // Get form data using document.getElementById
                const form = document.getElementById('studentForm') as HTMLFormElement;
                if (!form) {
                  console.error('Form not found');
                  return;
                }
                
                // Create FormData object and extract values
                const formData = new FormData(form);
                const studentData: any = {
                  name: formData.get('name') as string,
                  rollNo: formData.get('rollNo') as string,
                  dob: formData.get('dob') as string,
                  fatherName: formData.get('fatherName') as string,
                  motherName: formData.get('motherName') as string,
                  address: formData.get('address') as string,
                  bloodGroup: formData.get('bloodGroup') as string || "O+",
                  aadharNumber: formData.get('aadharNumber') as string,
                  
                  // Photo URL from the selected photo or existing student
                  photoUrl: selectedPhoto || editingStudent?.photoUrl || null,
                  
                  // Critical for proper section assignment
                  courseType: classConfig.courseType,
                  courseDivision: classConfig.courseDivision,
                  year: classConfig.year,
                  batch: selectedSection,
                  
                  // Default values
                  attendance: "100%",
                  grade: "N/A",
                  onLeave: false,
                  
                  // Generate new ID if adding, preserve if editing
                  id: editingStudent?.id || Date.now()
                };
                
                console.log("Saving student to database:", studentData);
                
                // Save student to database using API
                const saveStudent = async () => {
                  try {
                    let response;
                    if (editingStudent) {
                      // Update existing student
                      response = await fetch(`/api/students/${editingStudent.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: studentData.name,
                          rollNo: studentData.rollNo,
                          dob: studentData.dob,
                          fatherName: studentData.fatherName,
                          motherName: studentData.motherName,
                          address: studentData.address,
                          bloodGroup: studentData.bloodGroup,
                          photoUrl: studentData.photoUrl,
                          courseType: studentData.courseType,
                          courseDivision: studentData.courseDivision,
                          year: studentData.year,
                          batch: studentData.batch,
                        }),
                      });
                    } else {
                      // Create new student
                      response = await fetch('/api/students', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: studentData.name,
                          rollNo: studentData.rollNo,
                          dob: studentData.dob,
                          fatherName: studentData.fatherName,
                          motherName: studentData.motherName,
                          address: studentData.address,
                          bloodGroup: studentData.bloodGroup,
                          photoUrl: studentData.photoUrl,
                          courseType: studentData.courseType,
                          courseDivision: studentData.courseDivision,
                          year: studentData.year,
                          batch: studentData.batch,
                        }),
                      });
                    }
                    
                    if (response.ok) {
                      // Invalidate cache to refresh student list
                      studentsQuery.refetch();
                      console.log(`✅ Student ${editingStudent ? 'updated' : 'added'} successfully to database`);
                    } else {
                      console.error(`❌ Failed to ${editingStudent ? 'update' : 'add'} student:`, await response.text());
                    }
                  } catch (error) {
                    console.error(`❌ Error ${editingStudent ? 'updating' : 'adding'} student:`, error);
                  }
                };
                
                saveStudent();
                
                // Reset form and photo selection
                setEditingStudent(null);
                setSelectedPhoto(null);
                setStudentDialogOpen(false);
              }}>
                {editingStudent ? 'Update Student' : 'Add Student'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Class configuration based on the provided structure
const CLASS_CONFIG = [
  // PU Commerce
  { 
    id: 'pu-commerce-1', 
    name: '1st PU Commerce', 
    courseType: 'pu', 
    courseDivision: 'commerce', 
    year: '1', 
    sections: ['A', 'B'],
    periodsPerDay: 3
  },
  { 
    id: 'pu-commerce-2', 
    name: '2nd PU Commerce', 
    courseType: 'pu', 
    courseDivision: 'commerce', 
    year: '2', 
    sections: ['A', 'B'],
    periodsPerDay: 3
  },
  
  // PU Science
  { 
    id: 'pu-science-1', 
    name: '1st PU Science', 
    courseType: 'pu', 
    courseDivision: 'science', 
    year: '1', 
    sections: ['A'],
    periodsPerDay: 3
  },
  { 
    id: 'pu-science-2', 
    name: '2nd PU Science', 
    courseType: 'pu', 
    courseDivision: 'science', 
    year: '2', 
    sections: ['A'],
    periodsPerDay: 3
  },
  
  // Post-PUC Classes  
  { 
    id: 'post-pu-3', 
    name: '3rd Year', 
    courseType: 'post-pu', 
    courseDivision: 'general', 
    year: '3', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-4', 
    name: '4th Year', 
    courseType: 'post-pu', 
    courseDivision: 'general', 
    year: '4', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-5', 
    name: '5th Year', 
    courseType: 'post-pu', 
    courseDivision: 'general', 
    year: '5', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-6', 
    name: '6th Year', 
    courseType: 'post-pu', 
    courseDivision: 'general', 
    year: '6', 
    sections: ['A'],
    periodsPerDay: 8
  },
  { 
    id: 'post-pu-7', 
    name: '7th Year', 
    courseType: 'post-pu', 
    courseDivision: 'general', 
    year: '7', 
    sections: ['A'],
    periodsPerDay: 8
  },
];

export default function HomePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const { getSections, subscribeToSectionChanges } = useSections();
  const [dynamicClassConfig, setDynamicClassConfig] = useState(CLASS_CONFIG);
  
  // Update class config with dynamic sections
  useEffect(() => {
    const updateClassConfig = () => {
      const updatedConfig = CLASS_CONFIG.map(classConfig => {
        if (classConfig.courseType === 'pu' && classConfig.courseDivision === 'commerce') {
          const dynamicSections = getSections('pu', classConfig.year, 'commerce');
          return {
            ...classConfig,
            sections: dynamicSections
          };
        }
        return classConfig;
      });
      setDynamicClassConfig(updatedConfig);
    };

    // Initial update
    updateClassConfig();

    // Subscribe to section changes
    const unsubscribe = subscribeToSectionChanges(updateClassConfig);
    
    return unsubscribe;
  }, [getSections, subscribeToSectionChanges]);
  
  // Initialize leave synchronization on app load
  useEffect(() => {
    // Run batch sync for all active leaves to ensure attendance and namaz are properly synced
    try {
      LeaveSyncService.batchSyncAllLeaves();
      console.log('✅ Leave synchronization initialized');
    } catch (error) {
      console.error('Error initializing leave synchronization:', error);
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  // Fetch students count data for each class
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/students'],
    // Add retry and stale time settings for better experience
    retry: 1,
    staleTime: 30000
  });
  
  const goBackHome = () => {
    setActiveModule(null);
    setSelectedClass(null);
  };
  
  const handleClassSelect = (classConfig: any) => {
    setSelectedClass(classConfig);
  };
  
  // Calculate student counts for each class using database students
  const getStudentCount = (classConfig: any) => {
    if (!students || !Array.isArray(students)) {
      console.log(`🔍 No students data available for counting`, { students });
      return 0;
    }
    
    // Filter students that match this class configuration
    const matchingStudents = students.filter((student: any) => {
      // Convert both to strings for comparison (database might store as string or number)
      const studentYear = String(student.year);
      const configYear = String(classConfig.year);
      
      // Check course type and year
      if (student.courseType !== classConfig.courseType || studentYear !== configYear) {
        return false;
      }
      
      // For PU courses, also check course division
      if (classConfig.courseType === 'pu' && classConfig.courseDivision) {
        if (student.courseDivision !== classConfig.courseDivision) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`📊 Student count for ${classConfig.name}:`, {
      total: students.length,
      matching: matchingStudents.length,
      classConfig: { courseType: classConfig.courseType, year: classConfig.year, courseDivision: classConfig.courseDivision },
      matchingStudents: matchingStudents.map(s => ({ name: s.name, courseType: s.courseType, year: s.year, courseDivision: s.courseDivision }))
    });
    
    return matchingStudents.length;
  };
  
  // Group classes by type for better organization
  const puCommerceClasses = dynamicClassConfig.filter(c => c.courseType === 'pu' && c.courseDivision === 'commerce');
  const puScienceClasses = dynamicClassConfig.filter(c => c.courseType === 'pu' && c.courseDivision === 'science');
  const postPUClasses = dynamicClassConfig.filter(c => c.courseType === 'post-pu');
  
  if (!user) {
    return null;
  }
  
  const role = user.role || 'teacher';
  
  // Show module based on navigation
  if (activeModule) {
    switch (activeModule) {
      case "attendance":
        return <AttendanceScreen onBack={goBackHome} role={role} initialClass={selectedClass} />;
      case "namaz":
        return <ComprehensiveNamazScreen onBack={goBackHome} role={role} />;
      case "leave":
        return <LeaveScreen onBack={goBackHome} role={role} />;
      case "missed-attendance":
        return <MissedAttendanceScreen onBack={goBackHome} role={role} />;
      case "academic-calendar":
        return <AcademicCalendarScreen onBack={goBackHome} />;

      case "remarks":
        return <RemarksScreen onBack={goBackHome} role={role} />;
      case "results":
        return <ResultsScreen onBack={goBackHome} role={role} />;
      case "calendar":
        return <CalendarScreen onBack={goBackHome} />;
      case "subjects":
        return <SubjectTimetablePage />;
      case "classes":
        return <ClassesScreen onBack={goBackHome} role={role} />;
      case "sections":
        return <SectionManagement onBack={goBackHome} role={role} />;
      case "data-admin":
        return <HybridStorageAdmin onBack={goBackHome} />;
      default:
        return null;
    }
  }
  
  // Show class detail if a class is selected
  if (selectedClass) {
    return (
      <ClassView
        classConfig={selectedClass}
        onBack={goBackHome}
        role={role}
      />
    );
  }
  
  // Main homepage with class cards
  return (
    <div className="min-h-screen brand-gray-bg pb-20">
      <DrawerNavigation onModuleSelect={setActiveModule} />
      {/* Fixed header with logo - Brand Navy */}
      <div className="fixed top-0 left-0 right-0 z-40 brand-nav text-white brand-shadow">
        <div className="flex items-center justify-center py-4 px-4">
          <img 
            src={darul_irshad_mani_removebg_preview} 
            alt="Darul Irshad Logo" 
            className="w-10 h-10 mr-3"
          />
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">Darul Irshad</h1>
            <p className="text-xs text-white/80">Education With Awareness</p>
          </div>
        </div>
      </div>
      <header className="pt-20 pb-6 px-4" style={{ marginTop: '72px' }}>
        <div className="inline-block rounded-lg px-3 py-2 mb-3 bg-white brand-shadow">
          <p className="text-sm font-medium brand-dark-blue">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <p className="text-gray-600 text-sm">Select a class to manage students</p>
      </header>
      <main className="px-4 space-y-6">
        {isLoadingStudents ? (
          // Loading skeleton state
          (<div className="space-y-6">
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse brand-shadow"></div>
                ))}
              </div>
            </div>
          </div>)
        ) : (
          <>
            {/* PU Commerce Classes */}
            <section>
              <h2 className="brand-section-title">PU Commerce Classes</h2>
              <div className="grid grid-cols-1 gap-4">
                {puCommerceClasses.map(classConfig => (
                  <div 
                    key={classConfig.id} 
                    className="brand-card transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div 
                      className="p-3 cursor-pointer min-h-[44px] flex items-center" 
                      onClick={() => {
                        handleClassSelect(classConfig);
                      }}
                    >
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 rounded-full bg-brand-light-blue/10 flex items-center justify-center mr-3">
                          <GraduationCap className="h-5 w-5 brand-light-blue" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold brand-dark-blue text-sm">{classConfig.name}</h3>
                          <div className="flex items-center text-xs text-gray-500 flex-wrap gap-1.5">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              <span>{getStudentCount(classConfig)} students</span>
                            </div>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-brand-light-blue/10 brand-light-blue">
                              {classConfig.sections.length} section{classConfig.sections.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {!isLoadingStudents && (
          <>
            {/* PU Science Classes */}
            <section>
              <h2 className="brand-section-title">PU Science Classes</h2>
              <div className="grid grid-cols-1 gap-4">
                {puScienceClasses.map(classConfig => (
                  <div 
                    key={classConfig.id} 
                    className="brand-card transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div 
                      className="p-3 cursor-pointer min-h-[44px] flex items-center" 
                      onClick={() => {
                        handleClassSelect(classConfig);
                      }}
                    >
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center mr-3">
                          <GraduationCap className="h-5 w-5 brand-green" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold brand-dark-blue text-sm">{classConfig.name}</h3>
                          <div className="flex items-center text-xs text-gray-500 flex-wrap gap-1.5">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              <span>{getStudentCount(classConfig)} students</span>
                            </div>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-brand-green/10 brand-green">Fixed section</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Post-PUC Classes */}
            <section>
              <h2 className="brand-section-title">Post-PUC Classes</h2>
              <div className="grid grid-cols-1 gap-4">
                {postPUClasses.map(classConfig => (
                  <div 
                    key={classConfig.id} 
                    className="brand-card transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div 
                      className="p-3 cursor-pointer min-h-[44px] flex items-center" 
                      onClick={() => {
                        handleClassSelect(classConfig);
                      }}
                    >
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 rounded-full bg-brand-dark-blue/10 flex items-center justify-center mr-3">
                          <GraduationCap className="h-5 w-5 brand-dark-blue" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold brand-dark-blue text-sm">{classConfig.name}</h3>
                          <div className="flex items-center text-xs text-gray-500 flex-wrap gap-1.5">
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              <span>{getStudentCount(classConfig)} students</span>
                            </div>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-brand-dark-blue/10 brand-dark-blue">Fixed</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs
                              ${classConfig.periodsPerDay >= 8 ? 'bg-brand-green/10 brand-green' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {classConfig.periodsPerDay}p/day
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}