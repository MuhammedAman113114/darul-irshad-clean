import { useState } from "react";
import { ArrowLeft, Upload, Search, Calendar, FileText, Download, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotification } from "@/hooks/use-notification";

interface ResultsScreenProps {
  onBack: () => void;
  role: string;
}

interface Result {
  id: number;
  title: string;
  courseType: string; // "pu" or "post-pu"
  courseDivision?: string; // "commerce" or "science" for PU
  year: string; // "1" to "7"
  batch?: string; // batch code for Commerce, null for Science & Post-PUC
  fileUrl: string;
  fileName: string;
  fileSize: number; // Size in bytes
  uploadedAt: Date;
}

export default function ResultsScreen({ onBack, role }: ResultsScreenProps) {
  const [courseType, setCourseType] = useState("");
  const [courseDivision, setCourseDivision] = useState("");
  const [year, setYear] = useState("");
  const [batch, setBatch] = useState("");
  const [title, setTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const { showNotification } = useNotification();
  
  // Mock data - in a real app, this would come from an API call
  const [results, setResults] = useState<Result[]>([
    {
      id: 1,
      title: "Midterm Examination Results",
      courseType: "pu",
      courseDivision: "commerce",
      year: "1",
      batch: "A",
      fileUrl: "https://example.com/results1.pdf",
      fileName: "midterm_results_pu_commerce_1_A.pdf",
      fileSize: 1024 * 500, // 500 KB
      uploadedAt: new Date(2025, 3, 10) // April 10, 2025
    },
    {
      id: 2,
      title: "Final Examination Results",
      courseType: "pu",
      courseDivision: "science",
      year: "2",
      fileUrl: "https://example.com/results2.pdf",
      fileName: "final_results_pu_science_2.pdf",
      fileSize: 1024 * 750, // 750 KB
      uploadedAt: new Date(2025, 3, 25) // April 25, 2025
    },
    {
      id: 3,
      title: "Annual Assessment",
      courseType: "post-pu",
      year: "4",
      fileUrl: "https://example.com/results3.pdf",
      fileName: "annual_assessment_post_pu_4.pdf",
      fileSize: 1024 * 1200, // 1.2 MB
      uploadedAt: new Date(2025, 4, 5) // May 5, 2025
    }
  ]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setResultFile(file);
        showNotification(`File "${file.name}" selected.`, "success");
      } else {
        showNotification("Please select a PDF file.", "error");
      }
    }
  };
  
  const uploadResult = () => {
    if (!title) {
      showNotification("Please enter a title for the result.", "error");
      return;
    }
    
    if (!courseType) {
      showNotification("Please select a course type.", "error");
      return;
    }
    
    if (courseType === "pu" && !courseDivision) {
      showNotification("Please select a course division for PU College.", "error");
      return;
    }
    
    if (!year) {
      showNotification("Please select a year.", "error");
      return;
    }
    
    if (courseType === "pu" && courseDivision === "commerce" && !batch) {
      showNotification("Please select a batch for Commerce division.", "error");
      return;
    }
    
    if (!resultFile) {
      showNotification("Please select a PDF file to upload.", "error");
      return;
    }
    
    // Simulate a file upload with progress
    setIsUploading(true);
    setUploadProgress(0);
    
    // Create interval to simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    // Simulate network delay
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // In a real app, we would upload the file to a server and get a URL back
      // For now, we'll just mock a URL
      const newResult: Result = {
        id: results.length + 1,
        title,
        courseType,
        courseDivision: courseType === "pu" ? courseDivision : undefined,
        year,
        batch: courseType === "pu" && courseDivision === "commerce" ? batch : undefined,
        fileUrl: URL.createObjectURL(resultFile),
        fileName: resultFile.name,
        fileSize: resultFile.size,
        uploadedAt: new Date()
      };
      
      setResults([...results, newResult]);
      setTitle("");
      setCourseType("");
      setCourseDivision("");
      setYear("");
      setBatch("");
      setResultFile(null);
      setIsUploading(false);
      
      // Provide haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Pattern vibration for completion
      }
      
      showNotification("Result uploaded successfully!", "success");
    }, 2500);
  };
  
  const deleteResult = (id: number) => {
    if (confirm("Are you sure you want to delete this result?")) {
      setResults(results.filter(result => result.id !== id));
      showNotification("Result deleted successfully.", "success");
    }
  };
  
  const filteredResults = results.filter(result => {
    // Search term filter
    const matchesSearch = result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Course type filter
    if (courseType && courseType !== "all" && result.courseType !== courseType) return false;
    
    // Division filter (only for PU)
    if (courseType === "pu" && courseDivision && courseDivision !== "all" && result.courseDivision !== courseDivision) return false;
    
    // Year filter
    if (year && year !== "all" && result.year !== year) return false;
    
    // Batch filter (only applicable for PU Commerce)
    if (courseType === "pu" && courseDivision === "commerce" && batch && batch !== "all" && result.batch !== batch) return false;
    
    return true;
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
        <h2 className="text-lg font-semibold">Results Management</h2>
      </div>
      
      <div className="p-4 bg-gray-50 space-y-4">
        {/* Upload Form */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Upload New Result</h3>
          
          <div className="space-y-2">
            <Input 
              type="text"
              placeholder="Result Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Select value={courseType} onValueChange={setCourseType}>
                <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                  <SelectValue placeholder="Select Course Type" />
                </SelectTrigger>
                <SelectContent>
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
                  {courseType === "pu" ? (
                    <>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="5">5th Year</SelectItem>
                      <SelectItem value="6">6th Year</SelectItem>
                      <SelectItem value="7">7th Year</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {courseType === "pu" && courseDivision === "commerce" && (
                <Select value={batch} onValueChange={setBatch}>
                  <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Batch A</SelectItem>
                    <SelectItem value="B">Batch B</SelectItem>
                    <SelectItem value="C">Batch C</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
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
                <span className="text-xs text-gray-500 mt-1">PDF files only</span>
              </label>
            </div>
            
            {resultFile && (
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-1 rounded mr-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-800">{resultFile.name}</p>
                    <p className="text-xs text-blue-600">
                      {(resultFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isUploading ? (
              <div className="space-y-2">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${role === 'principal' ? 'bg-principal-primary' : 'bg-teacher-primary'} transition-all duration-300 ease-out`}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center text-gray-500">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            ) : (
              <Button 
                className={`w-full ${role === 'principal' ? 'bg-principal-primary hover:bg-principal-dark' : 'bg-teacher-primary hover:bg-teacher-dark'} text-white`}
                onClick={uploadResult}
                disabled={isUploading}
              >
                Upload Result
              </Button>
            )}
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              type="text"
              className="pl-10 text-sm"
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Select value={courseType} onValueChange={setCourseType}>
              <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                <SelectValue placeholder="Course Type" />
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
                  <SelectValue placeholder="Division" />
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
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {courseType === "pu" ? (
                  <>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                  </>
                ) : courseType === "post-pu" ? (
                  <>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                    <SelectItem value="6">6th Year</SelectItem>
                    <SelectItem value="7">7th Year</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                    <SelectItem value="6">6th Year</SelectItem>
                    <SelectItem value="7">7th Year</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            
            {courseType === "pu" && courseDivision === "commerce" && (
              <Select value={batch} onValueChange={setBatch}>
                <SelectTrigger className="p-2 rounded-lg border border-gray-300 text-sm">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="A">Batch A</SelectItem>
                  <SelectItem value="B">Batch B</SelectItem>
                  <SelectItem value="C">Batch C</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No results found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or upload a new result</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map(result => (
              <div 
                key={result.id} 
                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{result.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.courseType === "pu" ? "PU College" : "Post-PUC"} • 
                      {result.courseDivision && ` ${result.courseDivision.charAt(0).toUpperCase() + result.courseDivision.slice(1)} •`} 
                      Year {result.year}
                      {result.batch && ` • Batch ${result.batch}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.uploadedAt.toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <a 
                      href={result.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full hover:bg-gray-100"
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </a>
                    <button 
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-500"
                      onClick={() => deleteResult(result.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center">
                  <div className="bg-gray-100 h-6 w-6 flex items-center justify-center rounded mr-2">
                    <FileText className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 truncate">{result.fileName}</p>
                    <p className="text-xs text-gray-400">{(result.fileSize / 1024).toFixed(1)} KB</p>
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