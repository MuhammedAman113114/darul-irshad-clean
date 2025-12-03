import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useNotification } from '@/hooks/use-notification';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PeriodScreenProps {
  onBack: () => void;
  role: string;
}

interface ClassConfig {
  id: string;
  courseName: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  section?: string;
  periodsPerDay: number;
  canModifySections: boolean;
  sections?: string[];
}

interface PeriodData {
  id: number;
  name: string;
  courseType: string;
  courseDivision?: string;
  year: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  createdBy?: number;
}

export default function PeriodScreen({ onBack, role }: PeriodScreenProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('pu-commerce');
  const [selectedClass, setSelectedClass] = useState<ClassConfig | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [periodDialog, setPeriodDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodData | null>(null);
  
  // Default class configurations based on the provided structure
  const classConfigs: ClassConfig[] = [
    // PU Commerce
    { 
      id: 'pu-commerce-1', 
      courseName: '1st PU Commerce', 
      courseType: 'pu', 
      courseDivision: 'commerce', 
      year: '1', 
      periodsPerDay: 3, 
      canModifySections: true,
      sections: ['A', 'B']
    },
    { 
      id: 'pu-commerce-2', 
      courseName: '2nd PU Commerce', 
      courseType: 'pu', 
      courseDivision: 'commerce', 
      year: '2', 
      periodsPerDay: 3, 
      canModifySections: true,
      sections: ['A', 'B']
    },
    
    // PU Science
    { 
      id: 'pu-science-1', 
      courseName: '1st PU Science', 
      courseType: 'pu', 
      courseDivision: 'science', 
      year: '1', 
      periodsPerDay: 3, 
      canModifySections: false,
      sections: ['A']
    },
    { 
      id: 'pu-science-2', 
      courseName: '2nd PU Science', 
      courseType: 'pu', 
      courseDivision: 'science', 
      year: '2', 
      periodsPerDay: 3, 
      canModifySections: false,
      sections: ['A']
    },
    
    // Post-PUC Classes
    { 
      id: 'post-pu-3', 
      courseName: '3rd Year', 
      courseType: 'post-pu', 
      year: '3', 
      periodsPerDay: 7, 
      canModifySections: true,
      sections: ['A']
    },
    { 
      id: 'post-pu-4', 
      courseName: '4th Year', 
      courseType: 'post-pu', 
      year: '4', 
      periodsPerDay: 7, 
      canModifySections: true,
      sections: ['A']
    },
    { 
      id: 'post-pu-5', 
      courseName: '5th Year', 
      courseType: 'post-pu', 
      year: '5', 
      periodsPerDay: 7, 
      canModifySections: true,
      sections: ['A']
    },
    { 
      id: 'post-pu-6', 
      courseName: '6th Year', 
      courseType: 'post-pu', 
      year: '6', 
      periodsPerDay: 8, 
      canModifySections: true,
      sections: ['A']
    },
    { 
      id: 'post-pu-7', 
      courseName: '7th Year', 
      courseType: 'post-pu', 
      year: '7', 
      periodsPerDay: 8, 
      canModifySections: true,
      sections: ['A']
    },
  ];

  // Fetch periods data
  const { data: periods, isLoading } = useQuery({
    queryKey: ['/api/periods'],
    enabled: role === 'principal', // Only fetch for principal
  });

  // Add/Edit period mutation
  const { mutate: savePeriod, isPending: isSavingPeriod } = useMutation({
    mutationFn: async (data: Partial<PeriodData>) => {
      if (editingPeriod?.id) {
        return apiRequest(`/api/periods/${editingPeriod.id}`, 'PATCH', data);
      } else {
        return apiRequest('/api/periods', 'POST', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      setPeriodDialog(false);
      setEditingPeriod(null);
      showNotification('Period saved successfully', 'success');
    },
    onError: (error) => {
      showNotification(`Error saving period: ${error.message}`, 'error');
    }
  });

  // Delete period mutation
  const { mutate: deletePeriod, isPending: isDeletingPeriod } = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/periods/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      showNotification('Period deleted successfully', 'success');
    },
    onError: (error) => {
      showNotification(`Error deleting period: ${error.message}`, 'error');
    }
  });

  // Handle adding a new section
  const handleAddSection = () => {
    if (!selectedClass || !newSectionName.trim()) return;
    
    const updatedSections = [...(selectedClass.sections || []), newSectionName.trim()];
    const updatedConfig = { ...selectedClass, sections: updatedSections };
    
    // Update the class config in the state
    const updatedConfigs = classConfigs.map(config => 
      config.id === selectedClass.id ? updatedConfig : config
    );
    
    // Save to database or store here
    setSelectedClass(updatedConfig);
    setIsAddingSection(false);
    setNewSectionName('');
    showNotification('Section added successfully', 'success');
  };

  // Handle removing a section
  const handleRemoveSection = (section: string) => {
    if (!selectedClass) return;
    
    const updatedSections = selectedClass.sections?.filter(s => s !== section) || [];
    const updatedConfig = { ...selectedClass, sections: updatedSections };
    
    // Update the class config in the state
    const updatedConfigs = classConfigs.map(config => 
      config.id === selectedClass.id ? updatedConfig : config
    );
    
    // Save to database or store here
    setSelectedClass(updatedConfig);
    showNotification('Section removed successfully', 'success');
  };

  // Handle opening the period dialog for editing or creating
  const handleOpenPeriodDialog = (period?: PeriodData) => {
    if (period) {
      setEditingPeriod(period);
    } else {
      setEditingPeriod({
        id: 0,
        name: '',
        courseType: selectedClass?.courseType || 'pu',
        courseDivision: selectedClass?.courseDivision,
        year: selectedClass?.year || '1',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00'
      });
    }
    setPeriodDialog(true);
  };

  // Handle saving the period
  const handleSavePeriod = () => {
    if (!editingPeriod || !selectedClass) return;
    
    savePeriod({
      name: editingPeriod.name,
      courseType: selectedClass.courseType,
      courseDivision: selectedClass.courseDivision,
      year: selectedClass.year,
      periodNumber: editingPeriod.periodNumber,
      startTime: editingPeriod.startTime,
      endTime: editingPeriod.endTime,
      createdBy: user?.id || 0,
    });
  };

  // Handle deleting a period
  const handleDeletePeriod = (id: number) => {
    if (window.confirm('Are you sure you want to delete this period?')) {
      deletePeriod(id);
    }
  };

  // Filter periods based on selected class
  const filteredPeriods = Array.isArray(periods) 
    ? periods.filter((period: PeriodData) => 
        period.courseType === selectedClass?.courseType &&
        period.year === selectedClass?.year &&
        (
          !selectedClass?.courseDivision || 
          period.courseDivision === selectedClass.courseDivision
        )
      ) 
    : [];

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
        <h2 className="text-lg font-semibold">Class & Period Management</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pu-commerce">PU Commerce</TabsTrigger>
            <TabsTrigger value="pu-science">PU Science</TabsTrigger>
            <TabsTrigger value="post-pu">Post-PUC</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {/* PU Commerce Classes */}
          <TabsContent value="pu-commerce" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classConfigs
                .filter(config => config.courseType === 'pu' && config.courseDivision === 'commerce')
                .map(config => (
                  <Card 
                    key={config.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedClass?.id === config.id ? 'border-2 border-blue-500' : ''}`}
                    onClick={() => setSelectedClass(config)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{config.courseName}</h3>
                      <p className="text-sm text-gray-500">Periods per day: {config.periodsPerDay}</p>
                      <p className="text-sm text-gray-500">
                        Sections: {config.sections?.join(', ') || 'None'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </TabsContent>
          
          {/* PU Science Classes */}
          <TabsContent value="pu-science" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classConfigs
                .filter(config => config.courseType === 'pu' && config.courseDivision === 'science')
                .map(config => (
                  <Card 
                    key={config.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedClass?.id === config.id ? 'border-2 border-blue-500' : ''}`}
                    onClick={() => setSelectedClass(config)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{config.courseName}</h3>
                      <p className="text-sm text-gray-500">Periods per day: {config.periodsPerDay}</p>
                      <p className="text-sm text-gray-500">
                        Section: {config.sections?.join(', ') || 'None'} (Fixed)
                      </p>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </TabsContent>
          
          {/* Post-PUC Classes */}
          <TabsContent value="post-pu" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classConfigs
                .filter(config => config.courseType === 'post-pu')
                .map(config => (
                  <Card 
                    key={config.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedClass?.id === config.id ? 'border-2 border-blue-500' : ''}`}
                    onClick={() => setSelectedClass(config)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{config.courseName}</h3>
                      <p className="text-sm text-gray-500">Periods per day: {config.periodsPerDay}</p>
                      <p className="text-sm text-gray-500">
                        Classes: {config.sections?.join(', ') || 'None'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      {selectedClass && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{selectedClass.courseName} Details</h3>
            {role === 'principal' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenPeriodDialog()}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Period
              </Button>
            )}
          </div>
          
          {/* Section Management (for classes with modifiable sections) */}
          {selectedClass.canModifySections && role === 'principal' && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Sections / Classes</h4>
                {!isAddingSection && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingSection(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Section
                  </Button>
                )}
              </div>
              
              {isAddingSection && (
                <div className="flex gap-2 mb-3">
                  <Input 
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name (e.g. C)"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddSection}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsAddingSection(false);
                      setNewSectionName('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {selectedClass.sections?.map(section => (
                  <div 
                    key={section} 
                    className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center"
                  >
                    {section}
                    {selectedClass.sections && selectedClass.sections.length > 1 && (
                      <button 
                        onClick={() => handleRemoveSection(section)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Periods Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h4 className="font-medium p-4 border-b">Periods Schedule</h4>
            
            {isLoading ? (
              <div className="p-8 text-center">Loading periods...</div>
            ) : filteredPeriods.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No periods configured for this class yet.
                {role === 'principal' && (
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenPeriodDialog()}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add First Period
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    {role === 'principal' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeriods
                    .sort((a: PeriodData, b: PeriodData) => a.periodNumber - b.periodNumber)
                    .map((period: PeriodData) => (
                      <TableRow key={period.id}>
                        <TableCell>{period.periodNumber}</TableCell>
                        <TableCell>{period.name}</TableCell>
                        <TableCell>{period.startTime}</TableCell>
                        <TableCell>{period.endTime}</TableCell>
                        {role === 'principal' && (
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleOpenPeriodDialog(period)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeletePeriod(period.id)}
                                disabled={isDeletingPeriod}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
      
      {/* Period Edit Dialog */}
      <Dialog open={periodDialog} onOpenChange={setPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod?.id ? 'Edit Period' : 'Add New Period'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="period-name" className="text-sm font-medium">Period Name</label>
              <Input
                id="period-name"
                value={editingPeriod?.name || ''}
                onChange={(e) => setEditingPeriod(prev => prev ? {...prev, name: e.target.value} : null)}
                placeholder="e.g., Morning Prayer, Mathematics, etc."
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="period-number" className="text-sm font-medium">Period Number</label>
              <Input
                id="period-number"
                type="number"
                min="1"
                max={selectedClass?.periodsPerDay || 8}
                value={editingPeriod?.periodNumber || 1}
                onChange={(e) => setEditingPeriod(prev => prev ? {...prev, periodNumber: parseInt(e.target.value)} : null)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="start-time" className="text-sm font-medium">Start Time</label>
                <Input
                  id="start-time"
                  type="time"
                  value={editingPeriod?.startTime || ''}
                  onChange={(e) => setEditingPeriod(prev => prev ? {...prev, startTime: e.target.value} : null)}
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="end-time" className="text-sm font-medium">End Time</label>
                <Input
                  id="end-time"
                  type="time"
                  value={editingPeriod?.endTime || ''}
                  onChange={(e) => setEditingPeriod(prev => prev ? {...prev, endTime: e.target.value} : null)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePeriod} 
              disabled={isSavingPeriod || !editingPeriod?.name || !editingPeriod?.startTime || !editingPeriod?.endTime}
            >
              {isSavingPeriod ? 'Saving...' : 'Save Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}