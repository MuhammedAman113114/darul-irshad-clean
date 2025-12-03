import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, RefreshCw, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PeriodService } from '@/services/periodService';

interface Period {
  id?: number;
  name: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  createdBy?: number;
  createdAt?: string;
}

interface PeriodFormData {
  name: string;
  startTime: string;
  endTime: string;
}

interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section?: string;
}

interface PeriodManagementProps {
  courseType?: string;
  year?: string;
  courseDivision?: string;
  section?: string;
  onPeriodsChange?: (periods: Period[]) => void;
}

const PeriodManagement: React.FC<PeriodManagementProps> = ({ 
  courseType: propCourseType,
  year: propYear,
  courseDivision: propCourseDivision,
  section: propSection,
  onPeriodsChange
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassConfig>({
    courseType: propCourseType || 'pu',
    year: propYear || '1',
    courseDivision: propCourseDivision || 'commerce',
    section: propSection || 'A'
  });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [formData, setFormData] = useState<PeriodFormData>({
    name: '',
    startTime: '',
    endTime: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update selectedClass when props change
  useEffect(() => {
    if (propCourseType || propYear || propCourseDivision || propSection) {
      setSelectedClass({
        courseType: propCourseType || 'pu',
        year: propYear || '1',
        courseDivision: propCourseDivision || 'commerce',
        section: propSection || 'A'
      });
    }
  }, [propCourseType, propYear, propCourseDivision, propSection]);

  // Fetch periods for selected class
  const { data: periods = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/periods', selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('courseType', selectedClass.courseType);
      params.append('year', selectedClass.year);
      if (selectedClass.courseDivision) {
        params.append('courseDivision', selectedClass.courseDivision);
      }
      
      const response = await fetch(`/api/periods?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch periods');
      return response.json();
    }
  });

  // Add period mutation
  const addPeriodMutation = useMutation({
    mutationFn: async (periodData: Omit<Period, 'id'>) => {
      const response = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(periodData)
      });
      
      if (!response.ok) throw new Error('Failed to add period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Period added successfully" });
      // Notify parent of periods change
      if (onPeriodsChange) {
        refetch().then((result) => {
          if (result.data) onPeriodsChange(result.data);
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error adding period", description: error.message, variant: "destructive" });
    }
  });

  // Update period mutation
  const updatePeriodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Period> }) => {
      const response = await fetch(`/api/periods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to update period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      setIsEditDialogOpen(false);
      setEditingPeriod(null);
      resetForm();
      toast({ title: "Period updated successfully" });
      // Notify parent of periods change
      if (onPeriodsChange) {
        refetch().then((result) => {
          if (result.data) onPeriodsChange(result.data);
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error updating period", description: error.message, variant: "destructive" });
    }
  });

  // Delete period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/periods/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to delete period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      toast({ title: "Period deleted successfully" });
      // Notify parent of periods change
      if (onPeriodsChange) {
        refetch().then((result) => {
          if (result.data) onPeriodsChange(result.data);
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error deleting period", description: error.message, variant: "destructive" });
    }
  });

  // Generate default template
  const generateDefaultTemplate = () => {
    const defaultPeriods = getDefaultPeriodsForClass(selectedClass);
    
    defaultPeriods.forEach((period, index) => {
      const periodData = {
        ...period,
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        courseDivision: selectedClass.courseDivision,
        periodNumber: index + 1,
        createdBy: 1 // Demo user ID
      };
      
      addPeriodMutation.mutate(periodData);
    });
  };

  // Get default periods based on course configuration
  const getDefaultPeriodsForClass = (classConfig: ClassConfig): Omit<Period, 'id' | 'courseType' | 'year' | 'courseDivision' | 'periodNumber' | 'createdBy'>[] => {
    const { courseType, year } = classConfig;
    
    if (courseType === 'pu') {
      // PU courses have 3 periods
      return [
        { name: 'First Period', startTime: '09:00', endTime: '10:00' },
        { name: 'Second Period', startTime: '10:15', endTime: '11:15' },
        { name: 'Third Period', startTime: '11:30', endTime: '12:30' }
      ];
    } else {
      // Post-PU courses
      const yearNum = parseInt(year);
      const totalPeriods = (yearNum === 6 || yearNum === 7) ? 8 : 7;
      
      const periods = [];
      for (let i = 1; i <= totalPeriods; i++) {
        const startHour = 8 + i;
        const endHour = startHour + 1;
        periods.push({
          name: `Period ${i}`,
          startTime: `${startHour.toString().padStart(2, '0')}:00`,
          endTime: `${endHour.toString().padStart(2, '0')}:00`
        });
      }
      
      return periods;
    }
  };

  const resetForm = () => {
    setFormData({ name: '', startTime: '', endTime: '' });
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime
    });
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    const nextPeriodNumber = periods.length + 1;
    const maxPeriods = getMaxPeriodsForClass(selectedClass);
    
    if (nextPeriodNumber > maxPeriods) {
      toast({ 
        title: "Maximum periods reached", 
        description: `Maximum ${maxPeriods} periods allowed for this class`,
        variant: "destructive" 
      });
      return;
    }
    
    setIsAddDialogOpen(true);
  };

  const getMaxPeriodsForClass = (classConfig: ClassConfig): number => {
    const { courseType, year } = classConfig;
    
    if (courseType === 'pu') return 3;
    
    const yearNum = parseInt(year);
    return (yearNum === 6 || yearNum === 7) ? 8 : 7;
  };

  const submitForm = () => {
    if (!formData.name || !formData.startTime || !formData.endTime) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (editingPeriod) {
      updatePeriodMutation.mutate({
        id: editingPeriod.id!,
        data: {
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime
        }
      });
    } else {
      const periodData: Omit<Period, 'id'> = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        courseDivision: selectedClass.courseDivision,
        periodNumber: periods.length + 1,
        createdBy: 1
      };
      
      addPeriodMutation.mutate(periodData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Period Management</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Course Type</Label>
              <Select 
                value={selectedClass.courseType} 
                onValueChange={(value) => setSelectedClass(prev => ({ ...prev, courseType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pu">PU College</SelectItem>
                  <SelectItem value="post-pu">Post PU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Select 
                value={selectedClass.year} 
                onValueChange={(value) => setSelectedClass(prev => ({ ...prev, year: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedClass.courseType === 'pu' ? (
                    <>
                      <SelectItem value="1">1st PU</SelectItem>
                      <SelectItem value="2">2nd PU</SelectItem>
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

            {selectedClass.courseType === 'pu' && (
              <div>
                <Label>Stream</Label>
                <Select 
                  value={selectedClass.courseDivision || ''} 
                  onValueChange={(value) => setSelectedClass(prev => ({ ...prev, courseDivision: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedClass.courseType === 'pu' && selectedClass.courseDivision === 'commerce' && (
              <div>
                <Label>Section</Label>
                <Select 
                  value={selectedClass.section || ''} 
                  onValueChange={(value) => setSelectedClass(prev => ({ ...prev, section: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Periods List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Periods for {selectedClass.courseType.toUpperCase()} {selectedClass.year}
              {selectedClass.courseDivision && ` ${selectedClass.courseDivision}`}
              {selectedClass.section && ` Section ${selectedClass.section}`}
            </CardTitle>
            <div className="flex gap-2">
              {periods.length === 0 && (
                <Button onClick={generateDefaultTemplate} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Default Template
                </Button>
              )}
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Period
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading periods...</p>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No periods configured for this class</p>
              <p className="text-sm">Click "Generate Default Template" to create default periods</p>
            </div>
          ) : (
            <div className="space-y-4">
              {periods.map((period: Period) => (
                <div 
                  key={period.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                      {period.periodNumber}
                    </div>
                    <div>
                      <h4 className="font-medium">{period.name}</h4>
                      <p className="text-sm text-gray-500">
                        {period.startTime} - {period.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(period)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deletePeriodMutation.mutate(period.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Configuration:</strong> {periods.length} / {getMaxPeriodsForClass(selectedClass)} periods configured
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Period Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., First Period, Mathematics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitForm}>Add Period</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Period Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., First Period, Mathematics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitForm}>Update Period</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeriodManagement;