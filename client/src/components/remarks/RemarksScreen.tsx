import { useState, useEffect } from "react";
import { ArrowLeft, Search, User, Calendar, MessageSquare, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student, Remark as RemarkRecord, InsertRemark } from "@shared/schema";
import "@/lib/clearOldData"; // Auto-clear old localStorage student data

interface RemarksScreenProps {
  onBack: () => void;
  role: string;
}

const REMARK_CATEGORIES = [
  { value: "discipline", label: "Discipline", color: "bg-red-100 text-red-800" },
  { value: "homework", label: "Homework", color: "bg-orange-100 text-orange-800" },
  { value: "absence", label: "Absence", color: "bg-yellow-100 text-yellow-800" },
  { value: "behavior", label: "Behavior", color: "bg-blue-100 text-blue-800" },
  { value: "performance", label: "Performance", color: "bg-green-100 text-green-800" },
  { value: "general", label: "General", color: "bg-gray-100 text-gray-800" },
];

export default function RemarksScreen({ onBack, role }: RemarksScreenProps) {
  const [activeTab, setActiveTab] = useState<"add" | "view">("add");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkCategory, setRemarkCategory] = useState<string>("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [expandedRemarks, setExpandedRemarks] = useState<Set<number>>(new Set());
  
  // Classroom filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch authentic students from database
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch authentic remarks data  
  const { data: remarks = [], isLoading: remarksLoading } = useQuery<RemarkRecord[]>({
    queryKey: ['/api/remarks'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Create remark mutation
  const createRemarkMutation = useMutation({
    mutationFn: async (remarkData: InsertRemark) => {
      const response = await fetch('/api/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remarkData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create remark');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remarks'] });
      setSelectedStudentId("");
      setRemarkContent("");
      setRemarkCategory("");
      setStudentSearchTerm("");
      showNotification("Remark added successfully!", "success");
    },
    onError: () => {
      showNotification("Failed to add remark", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId || !remarkContent.trim()) {
      showNotification("Please select a student and enter a remark.", "error");
      return;
    }

    if (remarkContent.length > 500) {
      showNotification("Remark must be less than 500 characters.", "error");
      return;
    }
    
    const remarkData: InsertRemark = {
      studentId: parseInt(selectedStudentId),
      content: remarkContent.trim(),
      category: remarkCategory || "general",
      submittedBy: 1, // Teacher ID
    };
    
    createRemarkMutation.mutate(remarkData);
  };

  // Helper functions
  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const getStudentInfo = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    const yearNum = parseInt(student.year);
    return {
      name: student.name,
      rollNo: student.rollNo,
      class: `${student.year}${yearNum <= 2 ? 'st PU' : 'th Year'} ${student.courseDivision || ''}`,
      section: student.batch || ''
    };
  };

  const getCategoryColor = (category: string) => {
    const categoryData = REMARK_CATEGORIES.find(cat => cat.value === category);
    return categoryData ? categoryData.color : "bg-gray-100 text-gray-800";
  };

  // Helper functions for classroom filtering
  const getAvailableYears = () => {
    // Return all possible years regardless of current student data
    return ["1", "2", "3", "4", "5", "6", "7"];
  };

  const getAvailableCourses = (year: string) => {
    if (year === "all") return [];
    
    // For PU years (1st and 2nd), return both commerce and science
    if (year === "1" || year === "2") {
      return ["commerce", "science"];
    }
    
    // For Post-PUC years (3rd-7th), no course divisions
    return [];
  };

  const getAvailableSections = (year: string, course: string) => {
    if (year === "all" || course === "all") return [];
    
    // For Commerce courses, return sections A and B
    if (course === "commerce") {
      return ["a", "b"];
    }
    
    // For Science courses and Post-PUC years, no sections
    return [];
  };

  // Filter students for universal search with classroom filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(studentSearchTerm.toLowerCase());
    
    const matchesYear = selectedYear === "all" || student.year === selectedYear;
    const matchesCourse = selectedCourse === "all" || student.courseDivision === selectedCourse;
    const matchesSection = selectedSection === "all" || student.batch?.toLowerCase() === selectedSection.toLowerCase();
    
    return matchesSearch && matchesYear && matchesCourse && matchesSection;
  });

  // Filter and sort remarks with classroom filters
  const filteredRemarks = remarks
    .filter(remark => {
      const studentName = getStudentName(remark.studentId);
      const student = students.find(s => s.id === remark.studentId);
      
      const matchesSearch = searchTerm === "" || 
                           studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           remark.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || remark.category === filterCategory;
      
      // Classroom filters
      const matchesYear = selectedYear === "all" || (student && student.year === selectedYear);
      const matchesCourse = selectedCourse === "all" || (student && student.courseDivision === selectedCourse);
      const matchesSection = selectedSection === "all" || (student && student.batch?.toLowerCase() === selectedSection.toLowerCase());
      
      return matchesSearch && matchesCategory && matchesYear && matchesCourse && matchesSection;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  const toggleExpanded = (remarkId: number) => {
    const newExpanded = new Set(expandedRemarks);
    if (newExpanded.has(remarkId)) {
      newExpanded.delete(remarkId);
    } else {
      newExpanded.add(remarkId);
    }
    setExpandedRemarks(newExpanded);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center p-4 text-white bg-[#005c83]">
        <button 
          className="mr-3 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors" 
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Student Remarks</h2>
      </div>
      {/* Tab Navigation */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "add"
              ? "text-emerald-600 border-b-2 border-emerald-600 bg-white"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Add Remark
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "view"
              ? "text-emerald-600 border-b-2 border-emerald-600 bg-white"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          View Remarks ({remarks.length})
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "add" ? (
          /* Add Remark Tab */
          (<div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Classroom Filters */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                  <Select value={selectedYear} onValueChange={(value) => {
                    setSelectedYear(value);
                    setSelectedCourse("all");
                    setSelectedSection("all");
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {getAvailableYears().map(year => (
                        <SelectItem key={year} value={year}>
                          {year}{parseInt(year) <= 2 ? 'st PU' : 'th Year'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                  <Select 
                    value={selectedCourse} 
                    onValueChange={(value) => {
                      setSelectedCourse(value);
                      setSelectedSection("all");
                    }}
                    disabled={selectedYear === "all"}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {getAvailableCourses(selectedYear).map(course => (
                        <SelectItem key={course} value={course || ""}>
                          {course ? course.charAt(0).toUpperCase() + course.slice(1) : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                    disabled={selectedYear === "all" || selectedCourse === "all"}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {getAvailableSections(selectedYear, selectedCourse).map(section => (
                        <SelectItem key={section} value={section || ""}>
                          Section {section ? section.toUpperCase() : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedYear === "all" ? "Global Student Search" : "Search Students in Selected Class"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={selectedYear === "all" ? "Search all students by name or roll..." : "Search by name or roll number..."}
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {(selectedYear !== "all" || selectedCourse !== "all" || selectedSection !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear("all");
                        setSelectedCourse("all");
                        setSelectedSection("all");
                        setStudentSearchTerm("");
                      }}
                      className="absolute right-2 top-2 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Filtered Student List Display */}
              {(studentSearchTerm || selectedYear !== "all" || selectedCourse !== "all" || selectedSection !== "all") && (
                <div className="border rounded-md max-h-64 overflow-y-auto bg-white shadow-sm">
                  <div className="p-2 bg-gray-50 border-b text-xs font-medium text-gray-600">
                    {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                    {selectedYear !== "all" && (
                      <span className="ml-2 text-emerald-600">
                        in {selectedYear}{parseInt(selectedYear) <= 2 ? 'st PU' : 'th Year'}
                        {selectedCourse !== "all" && ` ${selectedCourse.charAt(0).toUpperCase() + selectedCourse.slice(1)}`}
                        {selectedSection !== "all" && ` Section ${selectedSection.toUpperCase()}`}
                      </span>
                    )}
                  </div>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(student.id.toString());
                          setStudentSearchTerm(student.name);
                        }}
                        className={`w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center space-x-3 ${
                          selectedStudentId === student.id.toString() ? 'bg-emerald-50 border-emerald-200' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            Roll: {student.rollNo} • {student.year}{parseInt(student.year) <= 2 ? 'st PU' : 'th Year'} {student.courseDivision ? student.courseDivision.charAt(0).toUpperCase() + student.courseDivision.slice(1) : ''}
                            {student.batch && ` • Section ${student.batch.toUpperCase()}`}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-gray-500 text-center">
                      {selectedYear !== "all" || selectedCourse !== "all" || selectedSection !== "all" 
                        ? "No students found in selected class" 
                        : "No students found matching search"}
                    </div>
                  )}
                </div>
              )}

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={remarkCategory} onValueChange={setRemarkCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMARK_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Remark Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark
                </label>
                <Textarea
                  placeholder="Enter your remark here..."
                  value={remarkContent}
                  onChange={(e) => setRemarkContent(e.target.value)}
                  className="w-full"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{remarkContent.length}/500 characters</span>
                  {remarkContent.length > 450 && (
                    <span className="text-orange-500">Character limit approaching</span>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={createRemarkMutation.isPending || !selectedStudentId || !remarkContent.trim()}
              >
                {createRemarkMutation.isPending ? "Adding..." : "Add Remark"}
              </Button>
            </form>
          </div>)
        ) : (
          /* View Remarks Tab */
          (<div className="p-4">
            {/* Classroom Filters */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <Select value={selectedYear} onValueChange={(value) => {
                  setSelectedYear(value);
                  setSelectedCourse("all");
                  setSelectedSection("all");
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {getAvailableYears().map(year => (
                      <SelectItem key={year} value={year}>
                        {year}{parseInt(year) <= 2 ? 'st PU' : 'th Year'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={(value) => {
                    setSelectedCourse(value);
                    setSelectedSection("all");
                  }}
                  disabled={selectedYear === "all"}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {getAvailableCourses(selectedYear).map(course => (
                      <SelectItem key={course} value={course || ""}>
                        {course ? course.charAt(0).toUpperCase() + course.slice(1) : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                <Select 
                  value={selectedSection} 
                  onValueChange={setSelectedSection}
                  disabled={selectedYear === "all" || selectedCourse === "all"}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {getAvailableSections(selectedYear, selectedCourse).map(section => (
                      <SelectItem key={section} value={section || ""}>
                        Section {section ? section.toUpperCase() : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Search and Category Filters */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search remarks or students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex space-x-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {REMARK_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Remarks List */}
            {remarksLoading ? (
              <div className="text-center py-8 text-gray-500">Loading remarks...</div>
            ) : filteredRemarks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No remarks found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRemarks.map((remark) => {
                  const studentInfo = getStudentInfo(remark.studentId);
                  const isExpanded = expandedRemarks.has(remark.id);
                  const isLongText = remark.content.length > 150;
                  
                  return (
                    <div key={remark.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {studentInfo?.name || 'Unknown Student'}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {studentInfo ? `Roll: ${studentInfo.rollNo} • ${studentInfo.class}` : 'Student details unavailable'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(remark.category)}`}>
                            {REMARK_CATEGORIES.find(cat => cat.value === remark.category)?.label || remark.category}
                          </span>
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(remark.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-gray-700 mb-3">
                        {isLongText && !isExpanded ? (
                          <>
                            {remark.content.substring(0, 150)}...
                            <button
                              onClick={() => toggleExpanded(remark.id)}
                              className="text-emerald-600 hover:text-emerald-700 ml-1"
                            >
                              <ChevronDown className="inline h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {remark.content}
                            {isLongText && (
                              <button
                                onClick={() => toggleExpanded(remark.id)}
                                className="text-emerald-600 hover:text-emerald-700 ml-1"
                              >
                                <ChevronUp className="inline h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 border-t pt-2">
                        By: Teacher Demo • {new Date(remark.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>)
        )}
      </div>
    </div>
  );
}