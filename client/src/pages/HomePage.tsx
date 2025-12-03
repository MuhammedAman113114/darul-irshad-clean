import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useNotification } from '@/hooks/use-notification';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
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
import NamazScreen from "@/components/namaz/NamazScreen";
import LeaveScreen from "@/components/leave/LeaveScreen";
import StudentsScreen from "@/components/students/StudentsScreen";
import RemarksScreen from "@/components/remarks/RemarksScreen";
import ResultsScreen from "@/components/results/ResultsScreen";
import CalendarScreen from "@/components/calendar/CalendarScreen";
import PeriodScreen from "@/components/periods/PeriodScreen";
// Using our new ClassDetailScreen component
import ClassDetailScreen from "@/components/classes/ClassDetailScreen";

function ClassManagementScreen({ classConfig }: { classConfig: any }) {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>(classConfig.sections[0] || 'A');
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Fetch students for this class
  const { data: students, isLoading } = useQuery({
    queryKey: ['/api/students', classConfig.courseType, classConfig.year, classConfig.courseDivision],
  });
  
  // Filter students based on search term, selected section, and status
  const filteredStudents = !students || !Array.isArray(students) ? [] : students.filter((student: any) => {
    const matchesSearch = searchTerm === '' || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesClass = 
      student.courseType === classConfig.courseType &&
      student.year === classConfig.year &&
      (!classConfig.courseDivision || student.courseDivision === classConfig.courseDivision);
      
    const matchesSection = !student.batch || student.batch === selectedSection;
    
    // Status filter (all, active, inactive)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && student.status !== 'inactive') ||
      (statusFilter === 'inactive' && student.status === 'inactive');
    
    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });
  
  // Handle opening the student form dialog
  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentDialogOpen(true);
  };
  
  // Handle editing a student
  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentDialogOpen(true);
  };
  
  // Handle deleting a student
  const handleDeleteStudent = (student: any) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      // In a real app, this would be a mutation to delete the student
      // For now, just show a notification
      showNotification('Student deleted successfully', 'success');
    }
  };
  
  // Handle bulk attendance
  const handleBulkAttendance = () => {
    showNotification('Bulk attendance feature coming soon', 'success');
  };
  
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
        <div>
          <h2 className="text-lg font-semibold">{classConfig.name}</h2>
          <p className="text-sm text-white text-opacity-80">
            {classConfig.sections.length > 1 ? 'Multiple sections' : 'Single section'} • {classConfig.periodsPerDay} periods/day
          </p>
        </div>
      </div>
      
      {/* Section tabs - only show if there are multiple sections */}
      {classConfig.sections.length > 1 && (
        <div className="px-4 pt-4">
          <Tabs 
            defaultValue={selectedSection} 
            onValueChange={(value) => setSelectedSection(value)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4">
              {classConfig.sections.map((section: string) => (
                <TabsTrigger key={section} value={section}>
                  Section {section}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {/* Search and filters */}
      <div className="p-4 bg-gray-50 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-gray-500">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </div>
          <div className="flex space-x-2">
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={handleBulkAttendance}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Attendance
            </Button>
          </div>
        </div>
      </div>
      
      {/* Student list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Book className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No students found in this class/section.</p>
            <p className="text-sm mt-1">
              {searchTerm ? "Try adjusting your search." : "Add students using the button below."}
            </p>
          </div>
        ) : (
          filteredStudents.map((student: any) => (
            <Card key={student.id || student.rollNo} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center p-3">
                  <div className="flex-shrink-0 mr-3">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800 truncate">{student.name}</h3>
                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                      <span>Roll No: {student.rollNo}</span>
                      {student.batch && (
                        <>
                          <span className="mx-1.5">•</span>
                          <span>Section {student.batch}</span>
                        </>
                      )}
                      <span className="mx-1.5">•</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'inactive' 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {student.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Student
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStudent(student)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Floating Action Button for adding students */}
      <Button
        size="icon"
        className={`fixed bottom-6 right-6 rounded-full shadow-lg ${
          role === 'principal' ? 'bg-principal-primary hover:bg-principal-dark' : 'bg-teacher-primary hover:bg-teacher-dark'
        } text-white h-14 w-14`}
        onClick={handleAddStudent}
      >
        <Plus className="h-6 w-6" />
      </Button>
      
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
                {editingStudent?.photo ? (
                  <img src={editingStudent.photo} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div>
                <Label htmlFor="photo" className="cursor-pointer inline-block text-sm px-4 py-2 bg-gray-50 rounded-md hover:bg-gray-100 border">
                  📷 {editingStudent?.photo ? 'Change Photo' : 'Upload Photo'}
                </Label>
                <Input 
                  id="photo" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
            
            <div className="grid gap-4 py-4">
              {/* Required Fields */}
              <div className="space-y-3">
                {/* Hidden fields for class info */}
                <input type="hidden" name="courseType" value={classConfig.courseType} />
                <input type="hidden" name="courseDivision" value={classConfig.courseDivision} />
                <input type="hidden" name="year" value={classConfig.year} />
                <input type="hidden" name="batch" value={selectedSection} />
                
                <div>
                  <label className="text-sm font-medium">🧑 Full Name</label>
                  <Input placeholder="Enter student's full name" defaultValue={editingStudent?.name} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Roll Number</label>
                  <Input placeholder="Enter roll number" defaultValue={editingStudent?.rollNo} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">🎂 Date of Birth</label>
                  <Input type="date" defaultValue={editingStudent?.dob} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">👨 Father's Name</label>
                  <Input placeholder="Enter father's name" defaultValue={editingStudent?.fatherName} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">👩 Mother's Name</label>
                  <Input placeholder="Enter mother's name" defaultValue={editingStudent?.motherName} required />
                </div>
                
                <div>
                  <label className="text-sm font-medium">🏠 Address</label>
                  <Textarea 
                    placeholder="Enter full address (street, city, pin code)" 
                    className="resize-none" 
                    rows={3}
                    defaultValue={editingStudent?.address}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">🩸 Blood Group</label>
                  <Select defaultValue={editingStudent?.bloodGroup || ''}>
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
                
                {classConfig.sections.length > 1 && (
                  <div>
                    <label className="text-sm font-medium">Section</label>
                    <Select defaultValue={editingStudent?.batch || selectedSection}>
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
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStudentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={() => {
                // Removed success notification to avoid popup interruption
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
    year: '3', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-4', 
    name: '4th Year', 
    courseType: 'post-pu', 
    year: '4', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-5', 
    name: '5th Year', 
    courseType: 'post-pu', 
    year: '5', 
    sections: ['A'],
    periodsPerDay: 7
  },
  { 
    id: 'post-pu-6', 
    name: '6th Year', 
    courseType: 'post-pu', 
    year: '6', 
    sections: ['A'],
    periodsPerDay: 8
  },
  { 
    id: 'post-pu-7', 
    name: '7th Year', 
    courseType: 'post-pu', 
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
  
  // Calculate student counts for each class
  const getStudentCount = (classConfig: any) => {
    if (!students || !Array.isArray(students)) return 0;
    
    return students.filter((student: any) => 
      student.courseType === classConfig.courseType &&
      student.year === classConfig.year &&
      (!classConfig.courseDivision || student.courseDivision === classConfig.courseDivision)
    ).length;
  };
  
  // Group classes by type for better organization
  const puCommerceClasses = CLASS_CONFIG.filter(c => c.courseType === 'pu' && c.courseDivision === 'commerce');
  const puScienceClasses = CLASS_CONFIG.filter(c => c.courseType === 'pu' && c.courseDivision === 'science');
  const postPUClasses = CLASS_CONFIG.filter(c => c.courseType === 'post-pu');
  
  if (!user) {
    return null;
  }
  
  const role = user.role || 'teacher';
  
  // Show module based on navigation
  if (activeModule) {
    switch (activeModule) {
      case "attendance":
        return <AttendanceScreen onBack={goBackHome} role={role} />;
      case "namaz":
        return <NamazScreen onBack={goBackHome} role={role} />;
      case "leave":
        return <LeaveScreen onBack={goBackHome} role={role} />;
      case "students":
        return <StudentsScreen onBack={goBackHome} role={role} />;
      case "remarks":
        return <RemarksScreen onBack={goBackHome} role={role} />;
      case "results":
        return <ResultsScreen onBack={goBackHome} role={role} />;
      case "calendar":
        return <CalendarScreen onBack={goBackHome} />;
      case "periods":
        return <PeriodScreen onBack={goBackHome} role={role} />;
      default:
        return null;
    }
  }
  
  // Show class detail if a class is selected
  if (selectedClass) {
    return (
      <ClassDetailScreen
        classConfig={selectedClass}
        onBack={goBackHome}
        role={role}
      />
    );
  }
  
  // Main homepage with class cards
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DrawerNavigation onModuleSelect={setActiveModule} />
      
      <header className={`pt-16 pb-8 px-5 ${role === 'principal' ? 'bg-principal-light' : 'bg-teacher-light'}`}>
        <div className={`inline-block rounded-lg px-3 py-1 mb-3 ${role === 'principal' ? 'bg-principal-primary/10 text-principal-primary' : 'bg-teacher-primary/10 text-teacher-primary'}`}>
          <p className="text-sm font-medium">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome, <span className={role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}>{user.name}</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">Select a class to manage students</p>
      </header>
      
      <main className="p-5 space-y-6">
        {isLoadingStudents ? (
          // Loading skeleton state
          <div className="space-y-6">
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* PU Commerce Classes */}
            <section>
              <h2 className="text-lg font-medium text-gray-700 mb-3">PU Commerce Classes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {puCommerceClasses.map(classConfig => (
                  <Card 
                    key={classConfig.id} 
                    className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border border-gray-200"
                    onClick={() => handleClassSelect(classConfig)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'} flex items-center justify-center mr-3`}>
                          <GraduationCap className={`h-6 w-6 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{classConfig.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            <span>{getStudentCount(classConfig)} students</span>
                            <span className="mx-1">•</span>
                            <span>{classConfig.sections.length} section{classConfig.sections.length > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}

        {!isLoadingStudents && (
          <>
            {/* PU Science Classes */}
            <section>
              <h2 className="text-lg font-medium text-gray-700 mb-3">PU Science Classes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {puScienceClasses.map(classConfig => (
                  <Card 
                    key={classConfig.id} 
                    className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border border-gray-200"
                    onClick={() => handleClassSelect(classConfig)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'} flex items-center justify-center mr-3`}>
                          <GraduationCap className={`h-6 w-6 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{classConfig.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            <span>{getStudentCount(classConfig)} students</span>
                            <span className="mx-1">•</span>
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">Fixed section</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Post-PUC Classes */}
            <section>
              <h2 className="text-lg font-medium text-gray-700 mb-3">Post-PUC Classes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {postPUClasses.map(classConfig => (
                  <Card 
                    key={classConfig.id} 
                    className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border border-gray-200"
                    onClick={() => handleClassSelect(classConfig)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'} flex items-center justify-center mr-3`}>
                          <GraduationCap className={`h-6 w-6 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{classConfig.name}</h3>
                          <div className="flex flex-wrap items-center text-sm text-gray-500 mt-1">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            <span>{getStudentCount(classConfig)} students</span>
                            <span className="mx-1">•</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs 
                              ${classConfig.periodsPerDay >= 8 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {classConfig.periodsPerDay} periods/day
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}