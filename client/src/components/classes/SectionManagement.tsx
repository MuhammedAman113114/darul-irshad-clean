import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Users, BookOpen } from "lucide-react";
import { useNotification } from '@/hooks/use-notification';
import { useSections } from '@/hooks/use-sections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

interface SectionManagementProps {
  onBack: () => void;
  role: string;
}

interface ClassSection {
  id: string;
  name: string;
  courseType: string;
  year: string;
  courseDivision: string;
  sections: string[];
}

export default function SectionManagement({ onBack, role }: SectionManagementProps) {
  const { showNotification } = useNotification();
  const { sectionsConfig, getSections, addSection: addSectionHook, deleteSection: deleteSectionHook, loadSections } = useSections();
  const [selectedYear, setSelectedYear] = useState<string>("1");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<string>("");
  const [deleteYear, setDeleteYear] = useState<string>("");

  // Load sections on component mount
  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // Get current sections for selected year
  const getCurrentSections = () => {
    return getSections("pu", selectedYear, "commerce");
  };

  // Add new section
  const addSection = () => {
    if (!newSectionName.trim()) {
      showNotification("Please enter a section name", "error");
      return;
    }

    const success = addSectionHook("pu", selectedYear, "commerce", newSectionName.trim());
    if (success) {
      setNewSectionName("");
      setShowAddDialog(false);
    }
  };

  // Delete section
  const deleteSection = () => {
    const success = deleteSectionHook("pu", deleteYear, "commerce", sectionToDelete);
    if (success) {
      setShowDeleteDialog(false);
      setSectionToDelete("");
      setDeleteYear("");
    }
  };

  // Get student count for a section (placeholder - you can integrate with actual student data)
  const getStudentCount = (year: string, section: string) => {
    // This would connect to your actual student storage system
    try {
      const storageKey = `students_pu_${year}_commerce_${section.toLowerCase()}`;
      const students = localStorage.getItem(storageKey);
      return students ? JSON.parse(students).length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="flex items-center p-4 from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg bg-[#005c83]">
        <button 
          className="mr-3 back-button p-2 rounded-xl hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-all duration-200 cursor-pointer backdrop-blur-sm border border-white/20" 
          aria-label="Go back"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Section Management</h2>
            <p className="text-xs text-white/80">Commerce Course Sections</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Year Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Manage Commerce Sections</h3>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="hover:bg-blue-700 text-white bg-[#005c83]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st PU Commerce</SelectItem>
                <SelectItem value="2">2nd PU Commerce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sections Display */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">
              {selectedYear === "1" ? "1st PU" : "2nd PU"} Commerce Sections
            </h4>
            
            {getCurrentSections().length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCurrentSections().map((section: string) => (
                  <div key={section} className="bg-gray-50 rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-700 font-bold text-sm">{section}</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-800">Section {section}</h5>
                          <p className="text-xs text-gray-500">
                            {selectedYear === "1" ? "1st PU" : "2nd PU"} Commerce
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{getStudentCount(selectedYear, section)} students</span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSectionToDelete(section);
                          setDeleteYear(selectedYear);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No sections found for {selectedYear === "1" ? "1st PU" : "2nd PU"} Commerce</p>
                <p className="text-sm">Click "Add Section" to create your first section</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Add Section Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Add a new section to {selectedYear === "1" ? "1st PU" : "2nd PU"} Commerce
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Section Name</label>
              <Input
                placeholder="Enter section name (e.g., C, D)"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="uppercase"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addSection} className="bg-blue-600 hover:bg-blue-700">
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Section Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Section {sectionToDelete} from {deleteYear === "1" ? "1st PU" : "2nd PU"} Commerce?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={deleteSection} variant="destructive">
              Delete Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}