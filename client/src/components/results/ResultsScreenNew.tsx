import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Upload, Search, Calendar, FileText, Download, Trash, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type Result, type Student } from "@shared/schema";

interface ResultsScreenProps {
  onBack: () => void;
  role: string;
}

export default function ResultsScreen({ onBack, role }: ResultsScreenProps) {
  const [year, setYear] = useState(""); // E.g. "1st PU", "2nd PU", "3rd Year"
  const [courseType, setCourseType] = useState(""); // E.g. "pu", "post-pu"
  const [courseName, setCourseName] = useState(""); // E.g. "commerce", "science"
  const [section, setSection] = useState(""); // E.g. "A", "B"
  const [examType, setExamType] = useState(""); // E.g. "Mid Term", "Final Exam", "Unit Test"
  const [fileType, setFileType] = useState(""); // "pdf" or "excel"
  const [notes, setNotes] = useState(""); // Any extra info
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
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
    if (!title || !year) {
      showNotification("Please fill all required fields.", "error");
      return;
    }

    // For PU years (1-2), require course division
    if ((year === "1" || year === "2") && !courseDivision) {
      showNotification("Please select course division for PU.", "error");
      return;
    }

    // For Commerce courses, require section
    if (courseDivision === "commerce" && !batch) {
      showNotification("Please select section for Commerce.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    if (!resultFile) {
      showNotification("Please select a PDF file to upload.", "error");
      setIsUploading(false);
      return;
    }

    // Convert file to base64 for storage
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const base64Data = fileReader.result as string;
      
      const data = {
        title,
        courseType: (year === "1" || year === "2") ? "pu" : "post-pu",
        courseDivision: courseDivision || null,
        year,
        batch: batch || null,
        fileUrl: base64Data, // Store base64 data
        fileName: resultFile.name,
        fileSize: resultFile.size
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
    setTitle("");
    setCourseType("");
    setCourseDivision("");
    setYear("");
    setBatch("");
    setResultFile(null);
  };

  const deleteResult = (id: number) => {
    if (confirm("Are you sure you want to delete this result?")) {
      deleteMutation.mutate(id);
    }
  };

  const clearFilters = () => {
    setFilterCourseType("");
    setFilterCourseDivision("");
    setFilterYear("");
    setFilterBatch("");
    setSearchTerm("");
  };

  // Helper functions for cascading filters (same logic as Remarks section)
  const getAvailableYears = () => {
    return ["1", "2", "3", "4", "5", "6", "7"];
  };

  const getAvailableCourses = (year: string) => {
    if (year === "all" || !year) return [];
    
    // For PU years (1st and 2nd), return both commerce and science
    if (year === "1" || year === "2") {
      return ["commerce", "science"];
    }
    
    // For Post-PUC years (3rd-7th), no course divisions
    return [];
  };

  const getAvailableSections = (year: string, course: string) => {
    if (year === "all" || course === "all" || !year || !course) return [];
    
    // For Commerce courses, return sections A and B
    if (course === "commerce") {
      return ["A", "B"];
    }
    
    // For Science courses and Post-PUC years, no sections
    return [];
  };

  const filteredResults = useMemo(() => {
    if (!Array.isArray(results)) return [];
    
    return results.filter((result: Result) => {
      // Search term filter
      const matchesSearch = result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Year filter
      if (filterYear && filterYear !== "all" && result.year !== filterYear) return false;
      
      // Course division filter
      if (filterCourseDivision && filterCourseDivision !== "all" && result.courseDivision !== filterCourseDivision) return false;
      
      // Batch filter (only applicable for Commerce)
      if (filterBatch && filterBatch !== "all" && result.batch !== filterBatch) return false;
      
      return true;
    });
  }, [results, searchTerm, filterYear, filterCourseDivision, filterBatch]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (result: Result) => {
    try {
      // Convert base64 data URL to blob for proper download/viewing
      const base64Data = result.fileUrl;
      
      if (base64Data.startsWith('data:')) {
        // Create blob from base64 data
        const byteCharacters = atob(base64Data.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create URL and open in new tab for viewing
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        
        // Clean up the URL after some time
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        // Fallback for non-base64 URLs
        window.open(result.fileUrl, '_blank');
      }
    } catch (error) {
      showNotification("Error opening PDF file", "error");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
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
              <Input 
                type="text"
                placeholder="Result Title (e.g., Midterm Examination Results)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
              />
              
              <div className="grid grid-cols-1 gap-2">
                <Select value={year} onValueChange={(value) => {
                  setYear(value);
                  setCourseDivision(""); // Reset when year changes
                  setBatch(""); // Reset when year changes
                }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((yearOption: string) => (
                      <SelectItem key={yearOption} value={yearOption}>
                        {yearOption === "1" || yearOption === "2" 
                          ? `${yearOption}${yearOption === "1" ? "st" : "nd"} PU`
                          : `${yearOption}th Year`
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {getAvailableCourses(year).length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  <Select value={courseDivision} onValueChange={(value) => {
                    setCourseDivision(value);
                    setBatch(""); // Reset when course changes
                  }}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Course Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCourses(year).map((division: string) => (
                        <SelectItem key={division} value={division}>
                          {division.charAt(0).toUpperCase() + division.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {getAvailableSections(year, courseDivision).length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  <Select value={batch} onValueChange={setBatch}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSections(year, courseDivision).map((section: string) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="border-dashed border-2 border-gray-300 rounded-lg p-4 text-center">
                <input 
                  type="file" 
                  id="result-upload" 
                  className="hidden" 
                  accept=".pdf" 
                  onChange={handleFileChange}
                />
                <label htmlFor="result-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <Upload className="h-6 w-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 font-medium">Click to upload PDF</span>
                  <span className="text-xs text-gray-500 mt-1">PDF files only, max 5MB</span>
                </label>
              </div>
              
              {resultFile && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">{resultFile.name}</p>
                        <p className="text-xs text-blue-600">{formatFileSize(resultFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResultFile(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpload}
                  disabled={isUploading || !title || !year}
                  className="flex-1"
                >
                  {isUploading ? 'Uploading...' : 'Upload Result'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  Clear
                </Button>
              </div>
              
              {/* Debug info - shows what's needed */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Required: {!title && "Title, "}{!year && "Year, "}
                {title && year && "Ready to upload!"}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter Results
            </h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              Clear All
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by title or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={filterYear} onValueChange={(value) => {
              setFilterYear(value);
              setFilterCourseDivision(""); // Reset when year changes
              setFilterBatch(""); // Reset when year changes
            }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getAvailableYears().map((yearOption: string) => (
                  <SelectItem key={yearOption} value={yearOption}>
                    {yearOption === "1" || yearOption === "2" 
                      ? `${yearOption}${yearOption === "1" ? "st" : "nd"} PU`
                      : `${yearOption}th Year`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(filterYear === "1" || filterYear === "2") && (
              <Select value={filterCourseDivision} onValueChange={(value) => {
                setFilterCourseDivision(value);
                setFilterBatch(""); // Reset when course changes
              }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {getAvailableCourses(filterYear).map((division: string) => (
                    <SelectItem key={division} value={division}>
                      {division.charAt(0).toUpperCase() + division.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {filterCourseDivision === "commerce" && (
              <Select value={filterBatch} onValueChange={setFilterBatch}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {getAvailableSections(filterYear, filterCourseDivision).map((section: string) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Results List */}
        {isLoading ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-500">Loading results...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <FileText className="h-10 w-10 mx-auto text-red-300 mb-2" />
            <p className="text-red-500">Error loading results</p>
            <p className="text-sm text-gray-400">Please try again later</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No results found</p>
            <p className="text-sm text-gray-400">
              {Array.isArray(results) && results.length === 0 ? 'Upload your first result to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((result: Result) => (
              <div 
                key={result.id}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{result.title}</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {result.courseType === 'pu' ? 'PU College' : 'Post-PUC'}
                      </Badge>
                      {result.courseDivision && (
                        <Badge variant="outline" className="text-xs">
                          {result.courseDivision}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Year {result.year}
                      </Badge>
                      {result.batch && (
                        <Badge variant="outline" className="text-xs">
                          Batch {result.batch}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Uploaded {format(new Date(result.uploadedAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600"
                      onClick={() => downloadFile(result)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-500"
                      onClick={() => deleteResult(result.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-gray-100 h-6 w-6 flex items-center justify-center rounded mr-2">
                    <FileText className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 truncate">{result.fileName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(result.fileSize)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}