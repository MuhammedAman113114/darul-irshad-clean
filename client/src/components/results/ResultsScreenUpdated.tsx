import { useState, useMemo } from "react";
import { ArrowLeft, Upload, Search, Calendar, FileText, Download, Trash, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotification } from "@/hooks/use-notification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type Result, type Student } from "@shared/schema";

interface ResultsScreenProps {
  onBack: () => void;
  role: string;
}

export default function ResultsScreen({ onBack, role }: ResultsScreenProps) {
  // Form state matching new schema
  const [year, setYear] = useState("");
  const [courseType, setCourseType] = useState("");
  const [courseName, setCourseName] = useState("");
  const [section, setSection] = useState("");
  const [examType, setExamType] = useState("");
  const [fileType, setFileType] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Filter state
  const [filterCourseType, setFilterCourseType] = useState("");
  const [filterCourseName, setFilterCourseName] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Fetch results from API
  const { data: results = [], isLoading, error } = useQuery<Result[]>({
    queryKey: ['/api/results'],
  });

  // Fetch students to get dynamic options
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  // Upload result mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/results'] });
      showNotification("Result uploaded successfully!", "success");
      resetForm();
      setShowUploadForm(false);
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to upload result. Please try again.", "error");
    }
  });

  // Delete result mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/results/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/results'] });
      showNotification("Result deleted successfully.", "success");
    },
    onError: (error: Error) => {
      showNotification(error.message || "Failed to delete result.", "error");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf';
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel';
      
      if (!isPdf && !isExcel) {
        showNotification("Please select a PDF or Excel file only.", "error");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification("File size must be less than 5MB.", "error");
        return;
      }
      
      setResultFile(file);
      setFileType(isPdf ? 'pdf' : 'excel');
    }
  };

  const handleUpload = async () => {
    if (!year || !examType || !fileType) {
      showNotification("Please fill all required fields.", "error");
      return;
    }

    if (!resultFile) {
      showNotification("Please select a file to upload.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Convert file to base64 for storage
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const base64Data = fileReader.result as string;
      
      const data = {
        year,
        courseType,
        courseName: courseName || null,
        section: section || null,
        examType,
        fileUrl: base64Data, // Store base64 data
        fileType,
        notes: notes || null
      };

      try {
        await uploadMutation.mutateAsync(data);
        setUploadProgress(100);
      } finally {
        setIsUploading(false);
        clearInterval(progressInterval);
        setUploadProgress(0);
      }
    };
    
    fileReader.readAsDataURL(resultFile);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetForm = () => {
    setYear("");
    setCourseType("");
    setCourseName("");
    setSection("");
    setExamType("");
    setFileType("");
    setNotes("");
    setResultFile(null);
  };

  const deleteResult = (id: number) => {
    if (confirm("Are you sure you want to delete this result?")) {
      deleteMutation.mutate(id);
    }
  };

  const clearFilters = () => {
    setFilterCourseType("all");
    setFilterCourseName("all");
    setFilterYear("all");
    setFilterSection("all");
    setSearchTerm("");
  };

  // Clear dependent filters when parent selections change
  const handleCourseTypeChange = (value: string) => {
    setFilterCourseType(value);
    setFilterCourseName("all"); // Clear course name when type changes
    setFilterYear("all"); // Clear year when type changes
    setFilterSection("all"); // Clear section when type changes
  };

  const handleCourseNameChange = (value: string) => {
    setFilterCourseName(value);
    setFilterSection("all"); // Clear section when course name changes
  };

  // Filter and search results
  const filteredResults = useMemo(() => {
    let filtered = results;
    
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.year.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (result.courseName && result.courseName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (result.section && result.section.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterCourseType && filterCourseType !== "all") {
      filtered = filtered.filter(result => result.courseType === filterCourseType);
    }
    
    if (filterCourseName && filterCourseName !== "all") {
      filtered = filtered.filter(result => result.courseName === filterCourseName);
    }
    
    if (filterYear && filterYear !== "all") {
      filtered = filtered.filter(result => result.year === filterYear);
    }
    
    if (filterSection && filterSection !== "all") {
      filtered = filtered.filter(result => result.section === filterSection);
    }
    
    return filtered;
  }, [results, searchTerm, filterCourseType, filterCourseName, filterYear, filterSection]);

  // Define academic structure options
  const courseTypeOptions = [
    { value: "pu", label: "PUC" },
    { value: "post-pu", label: "Post-PUC" }
  ];

  const courseNameOptions = [
    { value: "commerce", label: "Commerce" },
    { value: "science", label: "Science" }
  ];

  const yearOptions = [
    { value: "1", label: "1st PU" },
    { value: "2", label: "2nd PU" },
    { value: "3", label: "3rd Year" },
    { value: "4", label: "4th Year" },
    { value: "5", label: "5th Year" },
    { value: "6", label: "6th Year" },
    { value: "7", label: "7th Year" }
  ];

  const sectionOptions = [
    { value: "A", label: "Section A" },
    { value: "B", label: "Section B" }
  ];

  // Filter sections based on course selection (for form)
  const getAvailableSectionsForForm = () => {
    if (courseType === "pu" && courseName === "commerce") {
      return sectionOptions; // Commerce has A & B sections
    }
    return []; // Science and Post-PUC have no sections
  };

  // Filter sections based on course selection (for filters)
  const getAvailableSections = () => {
    if (filterCourseType === "pu" && filterCourseName === "commerce") {
      return sectionOptions; // Commerce has A & B sections
    }
    return []; // Science and Post-PUC have no sections
  };

  // Filter years based on course type (for form)
  const getAvailableYearsForForm = () => {
    if (courseType === "pu") {
      return yearOptions.filter(y => ["1", "2"].includes(y.value));
    } else if (courseType === "post-pu") {
      return yearOptions.filter(y => ["3", "4", "5", "6", "7"].includes(y.value));
    }
    return yearOptions;
  };

  // Filter years based on course type (for filters)
  const getAvailableYears = () => {
    if (filterCourseType === "pu") {
      return yearOptions.filter(y => ["1", "2"].includes(y.value));
    } else if (filterCourseType === "post-pu") {
      return yearOptions.filter(y => ["3", "4", "5", "6", "7"].includes(y.value));
    }
    return yearOptions;
  };

  // Filter course names based on course type (for form)
  const getAvailableCourseNamesForForm = () => {
    if (courseType === "pu") {
      return courseNameOptions; // PUC has both Commerce and Science
    }
    return []; // Post-PUC has no course divisions
  };

  // Filter course names based on course type (for filters)
  const getAvailableCourseNames = () => {
    if (filterCourseType === "pu") {
      return courseNameOptions; // PUC has both Commerce and Science
    }
    return []; // Post-PUC has no course divisions
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center p-4 text-white bg-[#005c83]">
        <button 
          className="mr-3 back-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-colors relative z-30 cursor-pointer" 
          aria-label="Go back"
          onClick={onBack}
          type="button"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Results Management</h2>
        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            {showUploadForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showUploadForm ? 'Cancel' : 'Upload Result'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 space-y-4 p-4">
        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Result
            </h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course Type *</label>
                  <Select value={courseType} onValueChange={(value) => {
                    setCourseType(value);
                    setCourseName(""); // Clear dependent fields
                    setSection("");
                    setYear("");
                  }}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Course Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
                  <Select value={year} onValueChange={setYear} disabled={!courseType}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYearsForForm().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course Name</label>
                  <Select value={courseName} onValueChange={(value) => {
                    setCourseName(value);
                    setSection(""); // Clear section when course changes
                  }} disabled={!courseType || courseType === "post-pu"}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCourseNamesForForm().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <Select value={section} onValueChange={setSection} disabled={!(courseType === "pu" && courseName === "commerce")}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSectionsForForm().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type *</label>
                <Input
                  type="text"
                  placeholder="Enter exam type (e.g., Mid Term, Final Exam, Unit Test)"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File Upload *</label>
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="text-sm"
                />
                {resultFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {resultFile.name} ({fileType})
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <Textarea
                  placeholder="Any additional information (e.g., includes practical marks)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
              
              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              <Button 
                onClick={handleUpload}
                disabled={isUploading || uploadMutation.isPending}
                className="w-full bg-[#005c83] hover:bg-[#004563]"
              >
                {isUploading ? "Uploading..." : "Upload Result"}
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by exam type, year, course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <Select value={filterCourseType} onValueChange={handleCourseTypeChange}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Course Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {courseTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterCourseName} onValueChange={handleCourseNameChange} disabled={!filterCourseType || filterCourseType === "post-pu"}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Course Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {getAvailableCourseNames().map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterYear} onValueChange={setFilterYear} disabled={!filterCourseType}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getAvailableYears().map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterSection} onValueChange={setFilterSection} disabled={!(filterCourseType === "pu" && filterCourseName === "commerce")}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {getAvailableSections().map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Results ({filteredResults.length})
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading results...</div>
          ) : filteredResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No results found.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredResults.map((result) => (
                <div key={result.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {result.examType}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {result.fileType.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.year}
                        </Badge>
                        {result.courseName && (
                          <Badge variant="outline" className="text-xs">
                            {result.courseName}
                          </Badge>
                        )}
                        {result.section && (
                          <Badge variant="outline" className="text-xs">
                            Section {result.section}
                          </Badge>
                        )}
                      </div>
                      
                      {result.notes && (
                        <p className="text-xs text-gray-600 mb-2">{result.notes}</p>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(result.uploadDate), 'MMM dd, yyyy')}
                        </span>
                        {result.uploadedBy && (
                          <span>By: {result.uploadedBy}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1.5 rounded-full hover:bg-blue-50 text-blue-500"
                        onClick={() => window.open(result.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {role === "principal" && (
                        <button
                          className="p-1.5 rounded-full hover:bg-red-50 text-red-500"
                          onClick={() => deleteResult(result.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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