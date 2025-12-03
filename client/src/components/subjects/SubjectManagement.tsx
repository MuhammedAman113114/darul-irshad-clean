import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, BookOpen, AlertTriangle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SubjectTimetableOfflineService } from "@/lib/subjectTimetableOffline";

interface Subject {
  id: number;
  subject: string;
  subjectCode: string;
  courseType: string;
  year: string;
  stream?: string;
  section: string;
  createdBy: number;
  createdAt: string;
}

interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
}

interface SubjectManagementProps {
  selectedClass?: ClassConfig;
  role: string;
}

export default function SubjectManagement({ selectedClass, role }: SubjectManagementProps) {
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    subject: "",
    subjectCode: ""
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueueSize, setSyncQueueSize] = useState(0);

  const queryClient = useQueryClient();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when back online
      if (SubjectTimetableOfflineService.isOnline()) {
        SubjectTimetableOfflineService.syncOfflineData();
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update sync queue size periodically
  useEffect(() => {
    const updateQueueSize = () => {
      setSyncQueueSize(SubjectTimetableOfflineService.getQueueSize());
    };
    
    updateQueueSize();
    const interval = setInterval(updateQueueSize, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to get class display name
  const getClassDisplayName = (config: ClassConfig) => {
    if (config.courseType === "pu") {
      const sectionText = config.section ? ` - Section ${config.section}` : '';
      return `${config.year}${config.year === '1' ? 'st' : 'nd'} PU ${config.courseDivision?.toUpperCase()}${sectionText}`;
    } else {
      return `${config.year}${config.year === '3' ? 'rd' : 'th'} Year`;
    }
  };

  // Fetch subjects data - offline-first with caching
  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ['/api/subjects', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      const filters = {
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        ...(selectedClass.courseDivision && { stream: selectedClass.courseDivision }),
        ...(selectedClass.section !== undefined && { section: selectedClass.section })
      };
      
      console.log(`📚 Fetching subjects for class:`, selectedClass);
      return await SubjectTimetableOfflineService.getSubjects(filters);
    },
    enabled: !!selectedClass,
  });

  // Add/Edit subject mutation with class-specific data
  const { mutate: saveSubject, isPending: isSavingSubject } = useMutation({
    mutationFn: async (data: any) => {
      // Add class-specific fields to subject data
      const subjectData = {
        ...data,
        courseType: selectedClass?.courseType,
        year: selectedClass?.year,
        stream: selectedClass?.courseDivision,
        section: selectedClass?.section,
        isActive: true
      };
      
      console.log(`📝 Saving subject with class data:`, subjectData);
      
      if (editingSubject?.id) {
        return await SubjectTimetableOfflineService.updateSubject(editingSubject.id, subjectData);
      } else {
        return await SubjectTimetableOfflineService.createSubject(subjectData);
      }
    },
    onSuccess: (result) => {
      console.log(`✅ Subject saved successfully:`, result);
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setSubjectDialog(false);
      setEditingSubject(null);
      resetForm();
      setSyncQueueSize(SubjectTimetableOfflineService.getQueueSize());
    },
    onError: (error) => {
      console.error('Error saving subject:', error);
    },
  });

  // Delete subject mutation
  const { mutate: deleteSubject, isPending: isDeletingSubject } = useMutation({
    mutationFn: (id: number) => {
      return SubjectTimetableOfflineService.deleteSubject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setDeleteConfirmDialog(false);
      setSubjectToDelete(null);
      setSyncQueueSize(SubjectTimetableOfflineService.getQueueSize());
    },
    onError: (error) => {
      console.error('Error deleting subject:', error);
    },
  });

  const handleDeleteConfirm = (subject: Subject) => {
    setSubjectToDelete(subject);
    setDeleteConfirmDialog(true);
  };

  const confirmDelete = () => {
    if (subjectToDelete) {
      deleteSubject(subjectToDelete.id);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      subjectCode: ""
    });
  };

  const handleOpenSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        subject: subject.subject,
        subjectCode: subject.subjectCode,
        courseType: subject.courseType
      });
    } else {
      setEditingSubject(null);
      resetForm();
    }
    setSubjectDialog(true);
  };

  const handleRefresh = async () => {
    try {
      await SubjectTimetableOfflineService.syncOfflineData();
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setSyncQueueSize(SubjectTimetableOfflineService.getQueueSize());
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.subjectCode) {
      return;
    }

    saveSubject(formData);
  };

  // Subjects are already filtered by the API query
  const filteredSubjects = Array.isArray(subjects) ? subjects : [];

  if (!selectedClass) {
    return (
      <Card className="mt-4">
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
          <p className="text-gray-500">Please select a class to manage subjects for that specific course.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Subject Management
            <div className="flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-red-500" />
                    Offline
                  </>
                )}
              </div>
              {syncQueueSize > 0 && (
                <Badge variant="outline" className="text-xs px-1">
                  {syncQueueSize} pending
                </Badge>
              )}
            </div>
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage subjects for {getClassDisplayName(selectedClass)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            className="h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''} mr-2`} />
            Refresh
          </Button>
          
          <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenSubjectDialog()} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Arabic, Tajweed, Fiqh"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  type="text"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., ARB, TJW, FQH"
                  maxLength={4}
                  required
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <Label className="text-sm font-medium text-blue-800">Creating Subject For:</Label>
                <div className="text-sm text-blue-700 mt-1">
                  {selectedClass && getClassDisplayName(selectedClass)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  This subject will be specific to this class configuration
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSubjectDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingSubject}>
                  {isSavingSubject ? "Saving..." : editingSubject ? "Update" : "Add Subject"}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Excel-like Subjects Table */}
      <div className="border rounded overflow-hidden bg-white">
        {/* Header Bar */}
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Subjects ({filteredSubjects.length})
          </span>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="text-gray-500 text-sm mb-3">No subjects added yet</div>
            <Button size="sm" variant="outline" onClick={() => handleOpenSubjectDialog()}>
              <Plus className="h-3 w-3 mr-1" />
              Add First Subject
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Subject</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Code</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Class Info</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject: Subject, index) => (
                  <tr 
                    key={subject.id} 
                    className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                  >
                    <td className="px-3 py-2 border-r font-medium">{subject.subject}</td>
                    <td className="px-3 py-2 border-r">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {subject.subjectCode}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r text-gray-600 text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {subject.courseType === "pu" ? "PUC" : "Post-PUC"}
                          {subject.year ? ` ${subject.year}${subject.year === '1' ? 'st' : subject.year === '2' ? 'nd' : subject.year === '3' ? 'rd' : 'th'}` : ''}
                        </span>
                        {subject.stream && (
                          <span className="text-gray-500">
                            {subject.stream.toUpperCase()}
                            {subject.section ? ` - Sec ${subject.section}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          onClick={() => handleOpenSubjectDialog(subject)}
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          onClick={() => handleDeleteConfirm(subject)}
                          disabled={isDeletingSubject}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">Error loading subjects: {error.message}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Subject
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{subjectToDelete?.subject}</strong> ({subjectToDelete?.subjectCode})?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will also remove all related timetable entries. This action cannot be undone.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmDialog(false)}
              disabled={isDeletingSubject}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeletingSubject}
            >
              {isDeletingSubject ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}