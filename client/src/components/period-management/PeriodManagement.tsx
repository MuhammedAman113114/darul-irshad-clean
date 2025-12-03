import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Clock, Save, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Period {
  id: number;
  name: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  createdBy: number;
  createdAt: string;
}

interface PeriodManagementProps {
  courseType: string;
  year: string;
  courseDivision?: string;
  section?: string;
  onPeriodsChange?: (periods: Period[]) => void;
}

export default function PeriodManagement({ 
  courseType, 
  year, 
  courseDivision, 
  section,
  onPeriodsChange 
}: PeriodManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startTime: '',
    endTime: '',
    periodNumber: 1
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch periods for current class configuration
  const { data: periods = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/periods', courseType, year, courseDivision],
    queryFn: () => apiRequest(`/api/periods?courseType=${courseType}&year=${year}${courseDivision ? `&courseDivision=${courseDivision}` : ''}`),
    enabled: !!(courseType && year)
  });

  // Create period mutation
  const createPeriodMutation = useMutation({
    mutationFn: (periodData: any) => apiRequest('/api/periods', 'POST', periodData),
    onSuccess: () => {
      toast({ title: 'Period created successfully' });
      setIsAddDialogOpen(false);
      setNewPeriod({ name: '', startTime: '', endTime: '', periodNumber: 1 });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating period', 
        description: error.message || 'Failed to create period',
        variant: 'destructive' 
      });
    }
  });

  // Update period mutation
  const updatePeriodMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/periods/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({ title: 'Period updated successfully' });
      setEditingPeriod(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating period', 
        description: error.message || 'Failed to update period',
        variant: 'destructive' 
      });
    }
  });

  // Delete period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/periods/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: 'Period deleted successfully' });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting period', 
        description: error.message || 'Failed to delete period',
        variant: 'destructive' 
      });
    }
  });

  // Bulk create periods mutation
  const bulkCreateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/periods/bulk', 'POST', data),
    onSuccess: () => {
      toast({ title: 'Periods saved successfully' });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error saving periods', 
        description: error.message || 'Failed to save periods',
        variant: 'destructive' 
      });
    }
  });

  // Notify parent component when periods change
  useEffect(() => {
    if (onPeriodsChange && periods) {
      onPeriodsChange(periods);
    }
  }, [periods, onPeriodsChange]);

  // Get maximum allowed periods based on course type and year
  const getMaxPeriods = () => {
    if (courseType === "pu" || (courseType === "post-pu" && ["1", "2"].includes(year))) {
      return 6;
    } else if (courseType === "post-pu" && ["3", "4", "5"].includes(year)) {
      return 8;
    } else {
      return 10;
    }
  };

  // Get next period number
  const getNextPeriodNumber = () => {
    if (periods.length === 0) return 1;
    const maxPeriod = Math.max(...periods.map(p => p.periodNumber));
    return maxPeriod + 1;
  };

  // Validate time format and logic
  const validateTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      return 'Both start and end times are required';
    }
    
    if (startTime >= endTime) {
      return 'Start time must be before end time';
    }
    
    return null;
  };

  // Handle create period
  const handleCreatePeriod = () => {
    const validation = validateTime(newPeriod.startTime, newPeriod.endTime);
    if (validation) {
      toast({ title: 'Validation Error', description: validation, variant: 'destructive' });
      return;
    }

    if (!newPeriod.name.trim()) {
      toast({ title: 'Validation Error', description: 'Period name is required', variant: 'destructive' });
      return;
    }

    if (periods.length >= getMaxPeriods()) {
      toast({ 
        title: 'Maximum periods reached', 
        description: `Cannot add more than ${getMaxPeriods()} periods for this class`,
        variant: 'destructive' 
      });
      return;
    }

    createPeriodMutation.mutate({
      ...newPeriod,
      courseType,
      year,
      courseDivision: courseDivision || null,
      periodNumber: getNextPeriodNumber()
    });
  };

  // Handle update period
  const handleUpdatePeriod = () => {
    if (!editingPeriod) return;

    const validation = validateTime(editingPeriod.startTime, editingPeriod.endTime);
    if (validation) {
      toast({ title: 'Validation Error', description: validation, variant: 'destructive' });
      return;
    }

    if (!editingPeriod.name.trim()) {
      toast({ title: 'Validation Error', description: 'Period name is required', variant: 'destructive' });
      return;
    }

    updatePeriodMutation.mutate(editingPeriod);
  };

  // Generate default periods template
  const generateDefaultPeriods = () => {
    const maxPeriods = getMaxPeriods();
    const startHour = 9; // Start at 9:00 AM
    const periodDuration = 45; // 45 minutes per period
    const breakDuration = 5; // 5 minutes break between periods
    
    const defaultPeriods = [];
    for (let i = 0; i < maxPeriods; i++) {
      const startMinutes = startHour * 60 + (i * (periodDuration + breakDuration));
      const endMinutes = startMinutes + periodDuration;
      
      const startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      
      defaultPeriods.push({
        name: `Period ${i + 1}`,
        startTime,
        endTime
      });
    }
    
    return defaultPeriods;
  };

  // Apply template
  const applyTemplate = () => {
    const defaultPeriods = generateDefaultPeriods();
    
    bulkCreateMutation.mutate({
      periods: defaultPeriods,
      courseType,
      year,
      courseDivision: courseDivision || null
    });
  };

  if (!courseType || !year) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Period Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please select course type and year to manage periods.</p>
        </CardContent>
      </Card>
    );
  }

  const classInfo = `${courseType === "pu" ? "PU College" : "Post-PUC"} - ${year}${courseDivision ? ` - ${courseDivision}` : ""}${section ? ` - Section ${section}` : ""}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Period Management
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {isPreviewMode ? 'Edit Mode' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">{classInfo}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Statistics */}
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between items-center text-sm">
            <span><strong>Current Periods:</strong> {periods.length}</span>
            <span><strong>Max Allowed:</strong> {getMaxPeriods()}</span>
          </div>
        </div>

        {/* Template Actions */}
        {periods.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500 mb-3">No periods configured for this class</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={applyTemplate} disabled={bulkCreateMutation.isPending}>
                Generate Default Template
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom Period
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Period</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="periodName">Period Name</Label>
                      <Input
                        id="periodName"
                        value={newPeriod.name}
                        onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        placeholder="e.g., Physics, Mathematics"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newPeriod.startTime}
                          onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newPeriod.endTime}
                          onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreatePeriod} 
                      disabled={createPeriodMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Period
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Period List */}
        {periods.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Configured Periods</h4>
              {!isPreviewMode && periods.length < getMaxPeriods() && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Period
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Period</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="periodName">Period Name</Label>
                        <Input
                          id="periodName"
                          value={newPeriod.name}
                          onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                          placeholder="e.g., Physics, Mathematics"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={newPeriod.startTime}
                            onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime">End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={newPeriod.endTime}
                            onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleCreatePeriod} 
                        disabled={createPeriodMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Period
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {periods.map((period) => (
              <div key={period.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Period {period.periodNumber}</span>
                      <span className="text-sm text-gray-500">
                        {period.startTime} - {period.endTime}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{period.name}</p>
                  </div>
                  
                  {!isPreviewMode && (
                    <div className="flex gap-1">
                      <Dialog open={editingPeriod?.id === period.id} onOpenChange={(open) => !open && setEditingPeriod(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPeriod(period)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Period</DialogTitle>
                          </DialogHeader>
                          {editingPeriod && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="editPeriodName">Period Name</Label>
                                <Input
                                  id="editPeriodName"
                                  value={editingPeriod.name}
                                  onChange={(e) => setEditingPeriod({ ...editingPeriod, name: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editStartTime">Start Time</Label>
                                  <Input
                                    id="editStartTime"
                                    type="time"
                                    value={editingPeriod.startTime}
                                    onChange={(e) => setEditingPeriod({ ...editingPeriod, startTime: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="editEndTime">End Time</Label>
                                  <Input
                                    id="editEndTime"
                                    type="time"
                                    value={editingPeriod.endTime}
                                    onChange={(e) => setEditingPeriod({ ...editingPeriod, endTime: e.target.value })}
                                  />
                                </div>
                              </div>
                              <Button 
                                onClick={handleUpdatePeriod} 
                                disabled={updatePeriodMutation.isPending}
                                className="w-full"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save Changes
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Period</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{period.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePeriodMutation.mutate(period.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Mode Notice */}
        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <strong>Preview Mode:</strong> This shows how periods will appear in attendance screens. 
              Switch to Edit Mode to make changes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}