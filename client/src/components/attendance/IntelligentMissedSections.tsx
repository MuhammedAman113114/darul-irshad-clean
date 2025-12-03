import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  Users,
  BarChart3,
  RefreshCw,
  Play,
  CheckCheck,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MissedSection {
  id: string | number;
  courseType: string;
  year: string;
  stream?: string;
  section: string;
  subject?: string;
  subjectCode?: string;
  subjectName: string;
  missedDate?: string;
  scheduledDate?: string;
  periodNumber: number;
  dayOfWeek: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  detectedAt?: string;
  isCompleted?: boolean;
  completedAt?: string;
  makeupDate?: string;
  priority?: 'high' | 'normal' | 'low';
  daysPending?: number;
  autoDetected?: boolean;
  remarks?: string;
  fullClassName?: string;
  formattedDate?: string;
  timeSlot?: string;
  status?: string;
  className?: string;
  missedHours?: number;
  subjectId?: number;
}

interface MissedSectionStats {
  totalPending: number;
  highPriority: number;
  overdue: number;
  byClass: Record<string, number>;
  lastDetectionRun: string;
  systemStatus: string;
}

interface IntelligentMissedSectionsProps {
  classConfig: {
    courseType: string;
    year: string;
    courseDivision?: string;
    section?: string;
  };
}

export function IntelligentMissedSections({ classConfig }: IntelligentMissedSectionsProps) {
  const [selectedMissedSection, setSelectedMissedSection] = useState<MissedSection | null>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const queryClient = useQueryClient();

  // Fetch missed sections for ALL classes (PU & Post-PU, all sections)
  const { data: missedSectionsData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/missed-sections'], // Remove classConfig to get all classes
    queryFn: async () => {
      console.log('🔍 Fetching ALL missed sections for entire school');
      
      try {
        // Get all missed sections without any class filtering
        const result = await apiRequest('/api/missed-sections');
        console.log('📋 All missed sections API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching missed sections:', error);
        return [];
      }
    }
  });

  // Handle different API response formats
  let missedSections = [];
  
  if (Array.isArray(missedSectionsData)) {
    // Direct array response
    missedSections = missedSectionsData;
  } else if (missedSectionsData && missedSectionsData.missedSections && Array.isArray(missedSectionsData.missedSections)) {
    // Wrapped in missedSections property
    missedSections = missedSectionsData.missedSections;
  } else if (missedSectionsData && typeof missedSectionsData === 'object') {
    // Single object, wrap in array
    missedSections = [missedSectionsData];
  }
  
  console.log('🔍 Final missed sections data:', { 
    raw: missedSectionsData, 
    processed: missedSections,
    isArray: Array.isArray(missedSections),
    length: missedSections.length 
  });

  // Fetch system statistics
  const { data: stats } = useQuery<MissedSectionStats>({
    queryKey: ['/api/missed-sections/stats'],
    queryFn: () => apiRequest('/api/missed-sections/stats'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Manual detection trigger
  const triggerDetection = useMutation({
    mutationFn: () => apiRequest('/api/missed-sections/detect', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missed-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/missed-sections/stats'] });
    }
  });

  // Load students for the missed section's class
  const loadStudentsForMissedSection = async (section: MissedSection) => {
    console.log('👥 Loading students for missed section:', section);
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        courseType: section.courseType,
        year: section.year,
        ...(section.stream && { courseDivision: section.stream }),
        ...(section.section && { section: section.section })
      });
      
      console.log('🔍 Student API call:', `/api/students?${params}`);
      const response = await apiRequest(`/api/students?${params}`);
      console.log('👥 Students loaded:', response);
      setStudentsData(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudentsData([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Save attendance for missed section
  const saveMissedAttendance = useMutation({
    mutationFn: async ({ section, attendance }: { section: MissedSection; attendance: Record<string, string> }) => {
      // Save attendance records
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        courseType: section.courseType,
        year: section.year,
        courseName: section.stream,
        section: section.section,
        period: section.periodNumber,
        date: section.scheduledDate || section.missedDate,
        status,
        recordedAt: new Date().toISOString()
      }));

      // Save all attendance records
      await Promise.all(
        attendanceRecords.map(record => 
          apiRequest('/api/attendance', 'POST', record)
        )
      );

      // Mark missed section as completed
      return apiRequest(`/api/missed-sections/${section.id}/complete`, 'PUT', { 
        makeupDate: new Date().toISOString().split('T')[0] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missed-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/missed-sections/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setSelectedMissedSection(null);
      setStudentsData([]);
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyBadge = (daysPending: number) => {
    if (daysPending > 7) return <Badge variant="destructive">Overdue</Badge>;
    if (daysPending > 3) return <Badge variant="outline" className="border-orange-500 text-orange-600">Urgent</Badge>;
    return <Badge variant="secondary">Recent</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading missed sections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalPending || 0}</p>
                <p className="text-sm text-gray-600">Total Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.overdue || 0}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.highPriority || 0}</p>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Auto-Detection</p>
                  <p className="text-xs text-gray-600">{stats?.systemStatus || 'Active'}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerDetection.mutate()}
                disabled={triggerDetection.isPending}
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Detection Info */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Smart Detection Active:</strong> System automatically detects missed periods at 12:00 AM daily. 
          Only periods with timetable entries and no holiday declarations are tracked.
          {stats?.lastDetectionRun && (
            <span className="ml-2 text-sm text-gray-600">
              Last run: {new Date(stats.lastDetectionRun).toLocaleString()}
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* All Classes Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>All Missed Sections - School Wide</span>
          </CardTitle>
          <CardDescription>
            Showing missed sections across all classes: PU (1st-2nd Commerce A/B, Science) & Post-PU (3rd-7th Year)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missedSections.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No missed sections detected across all classes.</p>
              <p className="text-sm text-gray-500 mt-2">The system checks for missed attendance after 12:00 AM daily.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group sections by class */}
              {Object.entries(
                missedSections.reduce((groups: any, section: MissedSection) => {
                  const classKey = section.className || `${section.courseType?.toUpperCase()} ${section.year} ${section.stream || ''} ${section.section || ''}`.trim();
                  if (!groups[classKey]) groups[classKey] = [];
                  groups[classKey].push(section);
                  return groups;
                }, {})
              ).map(([className, sections]: [string, any]) => (
                <div key={`class-${className}-${sections.length}`} className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-lg text-gray-800">{className}</h3>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {sections.length} missed {sections.length === 1 ? 'section' : 'sections'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 ml-4">
                    {sections.map((section: MissedSection, index: number) => (
                      <Card key={`${section.id}-${section.periodNumber}-${index}`} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold text-lg">{section.subjectName}</h4>
                                <Badge variant="outline">{section.subject || section.subjectCode}</Badge>
                                {/* Remove individual class badge since we're grouping by class */}
                                {section.priority && (
                                  <Badge className={getPriorityColor(section.priority)}>
                                    {section.priority}
                                  </Badge>
                                )}
                                {section.status && <Badge variant="secondary">{section.status}</Badge>}
                                {(section.daysPending || section.missedHours) && getUrgencyBadge(section.daysPending || section.missedHours || 0)}
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span>{section.formattedDate || section.missedDate || section.scheduledDate}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span>{section.timeSlot || `${section.startTime || section.scheduledStartTime} - ${section.endTime || section.scheduledEndTime}`}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Day:</span> {section.dayOfWeek}
                                </div>
                                <div>
                                  <span className="font-medium">Pending:</span> {section.daysPending || section.missedHours || 'N/A'} {section.missedHours ? 'hours' : 'days'}
                                </div>
                              </div>
                              
                              <div className="mt-3 text-sm text-gray-600">
                                <span className="font-medium">Reason:</span> {section.reason || 'Attendance not taken'}
                                {section.autoDetected && (
                                  <Badge variant="secondary" className="ml-2">Auto-detected</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 w-full sm:w-auto justify-end">
                              <Button
                                size="sm"
                                onClick={() => {
                                  console.log('🎯 Take Attendance clicked for:', section);
                                  setSelectedMissedSection(section);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                              >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Take Attendance
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Take Attendance for Missed Section Dialog */}
      {selectedMissedSection && (
        <TakeAttendanceDialog 
          section={selectedMissedSection}
          students={studentsData}
          loading={loadingStudents}
          onClose={() => {
            setSelectedMissedSection(null);
            setStudentsData([]);
          }}
          onSave={(attendance) => saveMissedAttendance.mutate({ 
            section: selectedMissedSection, 
            attendance 
          })}
          saving={saveMissedAttendance.isPending}
          onLoadStudents={() => loadStudentsForMissedSection(selectedMissedSection)}
        />
      )}
    </div>
  );
}

// Take Attendance Dialog Component for Missed Sections
interface TakeAttendanceDialogProps {
  section: MissedSection;
  students: any[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (attendance: Record<string, string>) => void;
  onLoadStudents: () => void;
}

function TakeAttendanceDialog({ 
  section, 
  students, 
  loading, 
  saving, 
  onClose, 
  onSave, 
  onLoadStudents 
}: TakeAttendanceDialogProps) {
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  // Load students when dialog opens
  useEffect(() => {
    if (section && students.length === 0 && !loading) {
      onLoadStudents();
    }
  }, [section, students.length, loading, onLoadStudents]);

  // Initialize attendance state when students are loaded
  useEffect(() => {
    if (students.length > 0) {
      const initialAttendance: Record<string, string> = {};
      students.forEach(student => {
        initialAttendance[student.id] = 'present'; // Default to present
      });
      setAttendance(initialAttendance);
    }
  }, [students]);

  const handleSave = () => {
    if (Object.keys(attendance).length > 0) {
      onSave(attendance);
    }
  };

  const updateAttendance = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const setAllStatus = (status: string) => {
    const newAttendance: Record<string, string> = {};
    students.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  };

  return (
    <Card className="border-2 border-green-500 mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-green-700">Take Attendance - Missed Section</CardTitle>
            <CardDescription>
              Fill attendance for "{section.subjectName}" from {section.scheduledDate || section.missedDate}
            </CardDescription>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Section Details */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><strong>Class:</strong> {section.className || `${section.courseType?.toUpperCase()} ${section.year} ${section.stream || ''} ${section.section || ''}`.trim()}</div>
              <div><strong>Period:</strong> {section.periodNumber}</div>
              <div><strong>Time:</strong> {section.timeSlot || `${section.startTime} - ${section.endTime}`}</div>
              <div><strong>Day:</strong> {section.dayOfWeek}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-2">
            <Button
              onClick={() => setAllStatus('present')}
              size="sm"
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 min-h-[44px] touch-manipulation"
            >
              All Present
            </Button>
            <Button
              onClick={() => setAllStatus('absent')}
              size="sm"
              variant="outline"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 min-h-[44px] touch-manipulation"
            >
              All Absent
            </Button>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No students found for this class</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                      {student.rollNo || student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-500">Roll: {student.rollNo}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <Button
                      onClick={() => updateAttendance(student.id.toString(), 'present')}
                      size="sm"
                      variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                      className={`flex-1 sm:flex-none ${attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50'} min-h-[44px] touch-manipulation`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Present
                    </Button>
                    <Button
                      onClick={() => updateAttendance(student.id.toString(), 'absent')}
                      size="sm"
                      variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                      className={`flex-1 sm:flex-none ${attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50'} min-h-[44px] touch-manipulation`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving Attendance...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Save Attendance & Remove From Missed
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}