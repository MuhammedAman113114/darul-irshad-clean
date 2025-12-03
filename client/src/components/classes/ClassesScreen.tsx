import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search, BookOpen, GraduationCap } from "lucide-react";
import ClassDetailScreen from './ClassDetailScreen';

interface ClassesScreenProps {
  onBack: () => void;
  role: string;
}

export default function ClassesScreen({ onBack, role }: ClassesScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  // Mock data for classes
  const classes = [
    // PU College - Commerce
    {
      id: 1,
      title: "1st PUC Commerce",
      courseType: "pu",
      courseDivision: "commerce",
      year: "1",
      section: "A",
      studentCount: 45,
      periods: 3
    },
    {
      id: 2,
      title: "1st PUC Commerce",
      courseType: "pu",
      courseDivision: "commerce",
      year: "1",
      section: "B",
      studentCount: 42,
      periods: 3
    },
    {
      id: 3,
      title: "2nd PUC Commerce",
      courseType: "pu",
      courseDivision: "commerce",
      year: "2",
      section: "A",
      studentCount: 48,
      periods: 3
    },
    {
      id: 4,
      title: "2nd PUC Commerce",
      courseType: "pu",
      courseDivision: "commerce",
      year: "2",
      section: "B",
      studentCount: 40,
      periods: 3
    },
    
    // PU College - Science
    {
      id: 5,
      title: "1st PUC Science",
      courseType: "pu",
      courseDivision: "science",
      year: "1",
      section: "A",
      studentCount: 38,
      periods: 3
    },
    {
      id: 6,
      title: "2nd PUC Science",
      courseType: "pu",
      courseDivision: "science",
      year: "2",
      section: "A",
      studentCount: 35,
      periods: 3
    },
    
    // Post-PUC Years
    {
      id: 7,
      title: "3rd Year",
      courseType: "post-pu",
      year: "3",
      studentCount: 52,
      periods: 7
    },
    {
      id: 8,
      title: "4th Year",
      courseType: "post-pu",
      year: "4",
      studentCount: 48,
      periods: 7
    },
    {
      id: 9,
      title: "5th Year",
      courseType: "post-pu",
      year: "5",
      studentCount: 45,
      periods: 8
    },
    {
      id: 10,
      title: "6th Year",
      courseType: "post-pu",
      year: "6",
      studentCount: 40,
      periods: 8
    },
    {
      id: 11,
      title: "7th Year",
      courseType: "post-pu",
      year: "7",
      studentCount: 38,
      periods: 8
    }
  ];
  
  // Filter classes based on search term
  const filteredClasses = classes.filter(cls => 
    cls.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group classes by type and division
  const puCommerceClasses = filteredClasses.filter(cls => cls.courseType === "pu" && cls.courseDivision === "commerce");
  const puScienceClasses = filteredClasses.filter(cls => cls.courseType === "pu" && cls.courseDivision === "science");
  const postPuClasses = filteredClasses.filter(cls => cls.courseType === "post-pu");
  
  // Handle selecting a class
  const handleSelectClass = (cls: any) => {
    setSelectedClass(cls);
  };
  
  // Handle back button from class detail
  const handleBackFromDetail = () => {
    setSelectedClass(null);
  };
  
  // If a class is selected, show the detail screen
  if (selectedClass) {
    return (
      <ClassDetailScreen 
        onBack={handleBackFromDetail} 
        classConfig={selectedClass} 
        role={role} 
      />
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className={`flex items-center p-4 ${role === 'principal' ? 'bg-principal-primary' : 'bg-teacher-primary'} text-white`}>
        <button 
          type="button"
          className="mr-3"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-medium">Classes</h1>
          <p className="text-xs opacity-80">Manage all classes</p>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="bg-white p-4 shadow-sm z-10">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search classes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg bg-gray-50 border-gray-200"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* PU Commerce Classes */}
        {puCommerceClasses.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3 border-b pb-2">PU College - Commerce</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {puCommerceClasses.map(cls => (
                <div 
                  key={cls.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => handleSelectClass(cls)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'}`}>
                      <BookOpen className={`h-5 w-5 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{cls.title}</h3>
                      <p className="text-sm text-gray-500">Section {cls.section}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-gray-500">Students: {cls.studentCount}</span>
                    <span className="text-gray-500">Periods: {cls.periods}/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* PU Science Classes */}
        {puScienceClasses.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3 border-b pb-2">PU College - Science</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {puScienceClasses.map(cls => (
                <div 
                  key={cls.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => handleSelectClass(cls)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'}`}>
                      <BookOpen className={`h-5 w-5 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{cls.title}</h3>
                      <p className="text-sm text-gray-500">Section {cls.section}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-gray-500">Students: {cls.studentCount}</span>
                    <span className="text-gray-500">Periods: {cls.periods}/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Post-PUC Classes */}
        {postPuClasses.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-3 border-b pb-2">Post-PUC Years</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {postPuClasses.map(cls => (
                <div 
                  key={cls.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => handleSelectClass(cls)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${role === 'principal' ? 'bg-principal-primary/10' : 'bg-teacher-primary/10'}`}>
                      <GraduationCap className={`h-5 w-5 ${role === 'principal' ? 'text-principal-primary' : 'text-teacher-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{cls.title}</h3>
                      <p className="text-sm text-gray-500">Advanced Studies</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-gray-500">Students: {cls.studentCount}</span>
                    <span className="text-gray-500">Periods: {cls.periods}/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}