import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, ArrowLeft, Filter } from "lucide-react";
import SubjectManagement from "./SubjectManagement";
import TimetableBuilder from "../timetable/TimetableBuilder";

interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
}

interface SubjectTimetableManagerProps {
  role: string;
}

// All possible class configurations
const CLASS_CONFIGURATIONS: ClassConfig[] = [
  // PU Classes - Commerce has A & B sections, Science has no sections
  { courseType: "pu", year: "1", courseDivision: "commerce", section: "A" },
  { courseType: "pu", year: "1", courseDivision: "commerce", section: "B" },
  { courseType: "pu", year: "1", courseDivision: "science", section: "" },
  { courseType: "pu", year: "2", courseDivision: "commerce", section: "A" },
  { courseType: "pu", year: "2", courseDivision: "commerce", section: "B" },
  { courseType: "pu", year: "2", courseDivision: "science", section: "" },
  // Post-PU Classes - No sections for any year
  { courseType: "post-pu", year: "3", section: "" },
  { courseType: "post-pu", year: "4", section: "" },
  { courseType: "post-pu", year: "5", section: "" },
  { courseType: "post-pu", year: "6", section: "" },
  { courseType: "post-pu", year: "7", section: "" },
];

export default function SubjectTimetableManager({ role }: SubjectTimetableManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState("subjects");
  const [selectedClass, setSelectedClass] = useState<ClassConfig>(CLASS_CONFIGURATIONS[0]);

  const getClassDisplayName = (config: ClassConfig) => {
    if (config.courseType === "pu") {
      const sectionText = config.section ? ` - Section ${config.section}` : '';
      return `${config.year}st PU ${config.courseDivision?.toUpperCase()}${sectionText}`;
    } else {
      return `${config.year}${config.year === "3" ? "rd" : "th"} Year`;
    }
  };

  const handleFilterChange = (field: keyof ClassConfig, value: string) => {
    setSelectedClass(prev => {
      const newClass = { ...prev, [field]: value };
      
      // Reset dependent fields when parent changes
      if (field === 'courseType') {
        if (value === 'post-pu') {
          newClass.courseDivision = undefined;
          newClass.year = '3'; // Default to 3rd year for post-pu
          newClass.section = ''; // Post-PU has no sections
        } else {
          newClass.year = '1'; // Default to 1st year for pu
          newClass.courseDivision = 'commerce'; // Default to commerce
          newClass.section = 'A'; // Commerce default section A
        }
      }
      
      if (field === 'courseDivision' && prev.courseType === 'pu') {
        // Reset section when stream changes
        if (value === 'science') {
          newClass.section = ''; // Science has no sections
        } else {
          newClass.section = 'A'; // Commerce default section A
        }
      }
      
      return newClass;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto h-full">
      <div className="p-4 space-y-4 min-h-full">
        {/* Individual Filter Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Course Type Filter */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Course Type</Label>
            <Select 
              value={selectedClass.courseType}
              onValueChange={(value) => handleFilterChange('courseType', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pu">PU College</SelectItem>
                <SelectItem value="post-pu">Post-PU</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
            <Select 
              value={selectedClass.year}
              onValueChange={(value) => handleFilterChange('year', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {selectedClass.courseType === "pu" ? (
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
          </div>

          {/* Stream/Division Filter (only for PU) */}
          {selectedClass.courseType === "pu" && (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Stream</Label>
              <Select 
                value={selectedClass.courseDivision || ""}
                onValueChange={(value) => handleFilterChange('courseDivision', value)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commerce">Commerce</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section Filter - Only show if Commerce stream */}
          {selectedClass.courseType === "pu" && selectedClass.courseDivision === "commerce" && (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Section</Label>
              <Select 
                value={selectedClass.section}
                onValueChange={(value) => handleFilterChange('section', value)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Minimal Excel-like Tabs */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            {/* Simple Tab Headers - Excel Style */}
            <div className="border-b bg-gray-50">
              <TabsList className="w-full grid grid-cols-2 bg-transparent rounded-none h-auto p-0 gap-0">
                <TabsTrigger 
                  value="subjects" 
                  className="rounded-none border-r data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 px-4 py-2 text-sm font-medium"
                >
                  Subjects
                </TabsTrigger>
                <TabsTrigger 
                  value="timetable" 
                  className="rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 px-4 py-2 text-sm font-medium"
                >
                  Timetable
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content - Minimal Style */}
            <div className="overflow-y-auto max-h-[70vh]">
              {/* Subjects Tab */}
              <TabsContent value="subjects" className="mt-0 p-0">
                <SubjectManagement 
                  selectedClass={selectedClass} 
                  role={role}
                />
              </TabsContent>

              {/* Timetable Tab */}
              <TabsContent value="timetable" className="mt-0 p-0">
                <TimetableBuilder 
                  selectedClass={selectedClass} 
                  role={role}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}