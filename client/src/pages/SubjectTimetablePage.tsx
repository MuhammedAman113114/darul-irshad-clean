import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, GraduationCap } from "lucide-react";
import SubjectManagement from "@/components/subjects/SubjectManagement";
import TimetableBuilder from "@/components/timetable/TimetableBuilder";

interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
}

export default function SubjectTimetablePage() {
  const [selectedClass, setSelectedClass] = useState<ClassConfig | undefined>();
  const [role] = useState("principal"); // For demo - in real app this would come from auth

  // Class options based on your academic structure
  const courseOptions = [
    { value: "pu", label: "PU College" },
    { value: "post-pu", label: "Post-PU" }
  ];

  const getYearOptions = (courseType: string) => {
    if (courseType === "pu") {
      return [
        { value: "1", label: "1st Year" },
        { value: "2", label: "2nd Year" }
      ];
    } else if (courseType === "post-pu") {
      return [
        { value: "3", label: "3rd Year" },
        { value: "4", label: "4th Year" },
        { value: "5", label: "5th Year" },
        { value: "6", label: "6th Year" },
        { value: "7", label: "7th Year" }
      ];
    }
    return [];
  };

  const getDivisionOptions = (courseType: string, year: string) => {
    if (courseType === "pu" && (year === "1" || year === "2")) {
      return [
        { value: "commerce", label: "Commerce" },
        { value: "science", label: "Science" }
      ];
    }
    return [];
  };

  const getSectionOptions = (courseType: string, year: string, division?: string) => {
    if (courseType === "pu" && (year === "1" || year === "2")) {
      if (division === "commerce") {
        return [
          { value: "A", label: "Section A" },
          { value: "B", label: "Section B" },
          { value: "C", label: "Section C" }
        ];
      } else if (division === "science") {
        return [{ value: "A", label: "Section A" }]; // Science has only one section
      }
    } else if (courseType === "post-pu") {
      return [{ value: "A", label: "Section A" }]; // Post-PU has single sections
    }
    return [];
  };

  const handleClassChange = (field: string, value: string) => {
    setSelectedClass(prev => {
      if (!prev && field === "courseType") {
        return { courseType: value, year: "", section: "A" };
      }
      
      const updated = { ...prev!, [field]: value };
      
      // Reset dependent fields when parent changes
      if (field === "courseType") {
        updated.year = "";
        updated.courseDivision = undefined;
        updated.section = "A";
      } else if (field === "year") {
        updated.courseDivision = undefined;
        updated.section = "A";
      } else if (field === "courseDivision") {
        updated.section = "A";
      }
      
      return updated;
    });
  };

  const isClassSelected = selectedClass && selectedClass.courseType && selectedClass.year && selectedClass.section;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <GraduationCap className="h-6 w-6 mr-2" />
            Subject & Timetable Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage subjects and build weekly timetables with automatic sync to attendance system
          </p>
        </div>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="courseType">Course Type</Label>
              <Select
                value={selectedClass?.courseType || ""}
                onValueChange={(value) => handleClassChange("courseType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Select
                value={selectedClass?.year || ""}
                onValueChange={(value) => handleClassChange("year", value)}
                disabled={!selectedClass?.courseType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClass?.courseType && getYearOptions(selectedClass.courseType).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Division (only for PU) */}
            {selectedClass?.courseType === "pu" && (
              <div>
                <Label htmlFor="division">Division</Label>
                <Select
                  value={selectedClass?.courseDivision || ""}
                  onValueChange={(value) => handleClassChange("courseDivision", value)}
                  disabled={!selectedClass?.year}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClass?.year && getDivisionOptions(selectedClass.courseType, selectedClass.year).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="section">Section</Label>
              <Select
                value={selectedClass?.section || ""}
                onValueChange={(value) => handleClassChange("section", value)}
                disabled={!selectedClass?.year || (selectedClass?.courseType === "pu" && !selectedClass?.courseDivision)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClass?.year && getSectionOptions(
                    selectedClass.courseType, 
                    selectedClass.year, 
                    selectedClass.courseDivision
                  ).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject & Timetable Tabs */}
      {isClassSelected ? (
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subjects" className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Subject Management
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Timetable Builder
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="subjects" className="mt-6">
            <SubjectManagement selectedClass={selectedClass} role={role} />
          </TabsContent>
          
          <TabsContent value="timetable" className="mt-6">
            <TimetableBuilder selectedClass={selectedClass} role={role} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Class Selection</h3>
            <p className="text-gray-500">
              Please select course type, year, {selectedClass?.courseType === "pu" ? "division, " : ""}and section to manage subjects and timetables.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}