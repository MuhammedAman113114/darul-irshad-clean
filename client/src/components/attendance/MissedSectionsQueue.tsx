import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Users,
  BookOpen,
  Filter,
  Plus,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface MissedSection {
  id: number;
  courseType: string;
  year: string;
  courseDivision: string | null;
  section: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  missedDate: string;
  periodNumber: number;
  detectedAt: string;
  reason: string;
  priority: 'high' | 'normal' | 'low';
  daysPending: number;
  autoDetected: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  makeupDate: string | null;
  makeupPeriod: number | null;
  completedBy: number | null;
  remarks: string | null;
  className: string;
  urgencyLevel: 'high' | 'medium' | 'low';
}

interface MissedSectionsQueueResponse {
  success: boolean;
  totalMissed: number;
  groupedQueue: Record<string, MissedSection[]>;
  summary: {
    high_priority: number;
    normal_priority: number;
    urgent_pending: number;
    auto_detected: number;
  };
}

interface Student {
  id: number;
  name: string;
  rollNo: string;
}

export default function MissedSectionsQueue() {
  const [filters, setFilters] = useState({
    courseType: '',
    year: '',
    courseDivision: '',
    section: '',
    priority: '',
    status: 'pending'
  });
  
  const [selectedMissedSection, setSelectedMissedSection] = useState<MissedSection | null>(null);
  const [makeupFormData, setMakeupFormData] = useState({
    makeupDate: '',
    makeupPeriod: '',
    remarks: ''
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [showMakeupDialog, setShowMakeupDialog] = useState(false);
  const [showAutoDetectDialog, setShowAutoDetectDialog] = useState(false);

  const queryClient = useQueryClient();

  // Fetch missed sections queue
  const { data: missedQueue, isLoading, refetch } = useQuery<MissedSectionsQueueResponse>({
    queryKey: ['missed-sections-queue', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/missed-sections/queue?${params}`);
      if (!response.ok) throw new Error('Failed to fetch missed sections');
      return response.json();
    }
  });

  // Auto-detection mutation
  const autoDetectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/missed-sections/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Auto-detection failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missed-sections-queue'] });
      setShowAutoDetectDialog(false);
    }
  });

  // Makeup attendance mutation
  const makeupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/missed-sections/${selectedMissedSection?.id}/makeup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Makeup submission failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missed-sections-queue'] });
      setShowMakeupDialog(false);
      setSelectedMissedSection(null);
      setAttendanceData([]);
    }
  });

  // Fetch students for makeup attendance
  const { data: students } = useQuery<Student[]>({
    queryKey: ['students-for-makeup', selectedMissedSection?.courseType, selectedMissedSection?.year, selectedMissedSection?.courseDivision, selectedMissedSection?.section],
    queryFn: async () => {
      if (!selectedMissedSection) return [];
      
      const params = new URLSearchParams({
        courseType: selectedMissedSection.courseType,
        year: selectedMissedSection.year,
        ...(selectedMissedSection.courseDivision && { courseDivision: selectedMissedSection.courseDivision }),
        ...(selectedMissedSection.section && { section: selectedMissedSection.section })
      });
      
      const response = await fetch(`/api/students?${params}`);
      if (!response.ok) throw new Error('Failed to fetch students');
      return response.json();
    },
    enabled: !!selectedMissedSection
  });

  // Initialize attendance data when students are loaded
  useEffect(() => {
    if (students && students.length > 0 && selectedMissedSection) {
      setAttendanceData(students.map(student => ({
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        status: 'present'
      })));
    }
  }, [students, selectedMissedSection]);

  const handleMakeupSubmit = () => {
    if (!selectedMissedSection || !makeupFormData.makeupDate || !makeupFormData.makeupPeriod) {
      return;
    }

    makeupMutation.mutate({
      attendanceData,
      makeupDate: makeupFormData.makeupDate,
      makeupPeriod: parseInt(makeupFormData.makeupPeriod),
      remarks: makeupFormData.remarks
    });
  };

  const getUrgencyBadge = (urgencyLevel: string, daysPending: number) => {
    const variants: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <Badge className={variants[urgencyLevel] || variants.low}>
        {urgencyLevel.toUpperCase()} ({daysPending} days)
      </Badge>
    );
  };

  const getPriorityIcon = (priority: string) => {
    return priority === 'high' ? (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    ) : (
      <Target className="h-4 w-4 text-blue-500" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading missed sections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Missed Sections Queue</h2>
          <p className="text-gray-600">Intelligent auto-detection system for makeup classes</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAutoDetectDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-Detect
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {missedQueue?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold">{missedQueue.summary.high_priority}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Urgent (7+ days)</p>
                  <p className="text-2xl font-bold">{missedQueue.summary.urgent_pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Auto-Detected</p>
                  <p className="text-2xl font-bold">{missedQueue.summary.auto_detected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Missed</p>
                  <p className="text-2xl font-bold">{missedQueue.totalMissed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <Select value={filters.courseType} onValueChange={(value) => setFilters(prev => ({ ...prev, courseType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="pu">PU</SelectItem>
              <SelectItem value="post-pu">Post-PU</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Years</SelectItem>
              <SelectItem value="1">1st</SelectItem>
              <SelectItem value="2">2nd</SelectItem>
              <SelectItem value="3">3rd</SelectItem>
              <SelectItem value="4">4th</SelectItem>
              <SelectItem value="5">5th</SelectItem>
              <SelectItem value="6">6th</SelectItem>
              <SelectItem value="7">7th</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.courseDivision} onValueChange={(value) => setFilters(prev => ({ ...prev, courseDivision: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Divisions</SelectItem>
              <SelectItem value="commerce">Commerce</SelectItem>
              <SelectItem value="science">Science</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.section} onValueChange={(value) => setFilters(prev => ({ ...prev, section: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sections</SelectItem>
              <SelectItem value="A">Section A</SelectItem>
              <SelectItem value="B">Section B</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Missed sections grouped by class */}
      {missedQueue?.groupedQueue && Object.keys(missedQueue.groupedQueue).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(missedQueue.groupedQueue).map(([className, sections]) => (
            <Card key={className}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {className}
                  </span>
                  <Badge variant="outline">{sections.length} missed</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {sections.map((section) => (
                    <div 
                      key={section.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        {getPriorityIcon(section.priority)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{section.subjectName}</h4>
                            <Badge variant="outline">{section.subjectCode}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(section.missedDate), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Period {section.periodNumber}
                            </span>
                            <span>{section.reason}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getUrgencyBadge(section.urgencyLevel, section.daysPending)}
                        {section.isCompleted ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMissedSection(section);
                              setShowMakeupDialog(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Take Makeup
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No missed sections found
            </h3>
            <p className="text-gray-600">
              {filters.status === 'pending' 
                ? "All classes are up to date! Run auto-detection to check for new missed sections."
                : "No completed makeup classes found with current filters."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Auto-detect dialog */}
      <Dialog open={showAutoDetectDialog} onOpenChange={setShowAutoDetectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Detect Missed Sections</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              This will automatically scan yesterday's schedule and detect any periods where attendance was not taken by 12:00 AM rule.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAutoDetectDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => autoDetectMutation.mutate()}
                disabled={autoDetectMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {autoDetectMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  'Start Detection'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Makeup attendance dialog */}
      <Dialog open={showMakeupDialog} onOpenChange={setShowMakeupDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Take Makeup Attendance - {selectedMissedSection?.subjectName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMissedSection && (
            <div className="space-y-6">
              {/* Missed section details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Missed Section Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Class:</span> {selectedMissedSection.className}
                  </div>
                  <div>
                    <span className="text-gray-600">Subject:</span> {selectedMissedSection.subjectName} ({selectedMissedSection.subjectCode})
                  </div>
                  <div>
                    <span className="text-gray-600">Missed Date:</span> {format(new Date(selectedMissedSection.missedDate), 'MMM d, yyyy')}
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span> {selectedMissedSection.periodNumber}
                  </div>
                </div>
              </div>

              {/* Makeup details form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Makeup Date</label>
                  <Input
                    type="date"
                    value={makeupFormData.makeupDate}
                    onChange={(e) => setMakeupFormData(prev => ({ ...prev, makeupDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Makeup Period</label>
                  <Select 
                    value={makeupFormData.makeupPeriod} 
                    onValueChange={(value) => setMakeupFormData(prev => ({ ...prev, makeupPeriod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((period) => (
                        <SelectItem key={period} value={period.toString()}>
                          Period {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Remarks</label>
                  <Input
                    placeholder="Optional notes"
                    value={makeupFormData.remarks}
                    onChange={(e) => setMakeupFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>

              {/* Student attendance */}
              {students && students.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Student Attendance ({students.length} students)</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendanceData.map((student, index) => (
                      <div key={student.studentId} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{student.name}</span>
                          <span className="text-gray-600 ml-2">({student.rollNo})</span>
                        </div>
                        <Select 
                          value={student.status} 
                          onValueChange={(value) => {
                            const newData = [...attendanceData];
                            newData[index].status = value;
                            setAttendanceData(newData);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMakeupDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMakeupSubmit}
                  disabled={makeupMutation.isPending || !makeupFormData.makeupDate || !makeupFormData.makeupPeriod}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {makeupMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Makeup Attendance'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}