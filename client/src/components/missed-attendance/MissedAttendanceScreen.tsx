import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users,
  RefreshCw,
  Filter,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MissedAttendanceRecord {
  id: number;
  date: string;
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  period: number;
  status: 'taken' | 'not_taken' | 'leave' | 'emergency' | 'holiday';
  takenBy?: number;
  timestamp?: string;
  studentCount?: number;
  remarks?: string;
}

interface MissedAttendanceScreenProps {
  onBack: () => void;
  role: string;
}

// Status color and icon mapping
const statusConfig = {
  taken: { color: 'bg-green-500', textColor: 'text-green-700', icon: CheckCircle, label: 'Taken' },
  not_taken: { color: 'bg-red-500', textColor: 'text-red-700', icon: XCircle, label: 'Missed' },
  holiday: { color: 'bg-blue-500', textColor: 'text-blue-700', icon: Calendar, label: 'Holiday' },
  leave: { color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: Clock, label: 'Leave' },
  emergency: { color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle, label: 'Emergency' }
};

export default function MissedAttendanceScreen({ onBack, role }: MissedAttendanceScreenProps) {
  const [dateRange, setDateRange] = useState(7); // Last 7 days
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<MissedAttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate date range
  const dates = Array.from({ length: dateRange }, (_, i) => {
    const date = subDays(new Date(), i);
    return format(date, 'yyyy-MM-dd');
  }).reverse();

  // Fetch missed attendance data
  const { data: missedRecords = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/missed-attendance', dateRange, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', dates[0]);
      params.append('endDate', dates[dates.length - 1]);
      if (selectedClass !== 'all') {
        const [courseType, year, division] = selectedClass.split('-');
        params.append('courseType', courseType);
        params.append('year', year);
        if (division && division !== 'undefined') {
          params.append('courseDivision', division);
        }
      }
      
      const response = await fetch(`/api/missed-attendance?${params}`);
      return response.json();
    }
  });

  // Fetch students for taking attendance
  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    enabled: !!selectedPeriod
  });

  // Auto-check for missed attendance
  const autoCheckMutation = useMutation({
    mutationFn: async (date: string) => {
      return apiRequest('/api/missed-attendance/check', 'POST', { date });
    },
    onSuccess: () => {
      toast({ title: 'Missed attendance check completed' });
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error checking missed attendance', variant: 'destructive' });
    }
  });

  // Take attendance mutation
  const takeAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/missed-attendance/take', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: 'Attendance taken successfully' });
      setIsModalOpen(false);
      setSelectedPeriod(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error) => {
      toast({ title: 'Error taking attendance', variant: 'destructive' });
    }
  });

  // Class configurations for filtering
  const classOptions = [
    { value: 'all', label: 'All Classes' },
    { value: 'pu-1-commerce', label: '1st PU Commerce' },
    { value: 'pu-2-commerce', label: '2nd PU Commerce' },
    { value: 'pu-1-science', label: '1st PU Science' },
    { value: 'pu-2-science', label: '2nd PU Science' },
    { value: 'post-pu-3-undefined', label: '3rd Year' },
    { value: 'post-pu-4-undefined', label: '4th Year' },
    { value: 'post-pu-5-undefined', label: '5th Year' },
    { value: 'post-pu-6-undefined', label: '6th Year' },
    { value: 'post-pu-7-undefined', label: '7th Year' }
  ];

  // Get maximum periods for timetable
  const maxPeriods = 8;

  // Group records by date and period
  const recordsByDatePeriod = new Map();
  missedRecords.forEach((record: MissedAttendanceRecord) => {
    const key = `${record.date}-${record.period}`;
    if (!recordsByDatePeriod.has(key)) {
      recordsByDatePeriod.set(key, []);
    }
    recordsByDatePeriod.get(key).push(record);
  });

  // Handle period cell click
  const handlePeriodClick = (date: string, period: number) => {
    const records = recordsByDatePeriod.get(`${date}-${period}`) || [];
    const notTakenRecords = records.filter(r => r.status === 'not_taken');
    
    if (notTakenRecords.length > 0) {
      setSelectedPeriod({
        ...notTakenRecords[0],
        date,
        period
      });
      setIsModalOpen(true);
    }
  };

  // Get students for selected period
  const getStudentsForPeriod = () => {
    if (!selectedPeriod) return [];
    
    return students.filter((student: any) => {
      return student.courseType === selectedPeriod.courseType &&
             student.year === selectedPeriod.year &&
             (!selectedPeriod.courseDivision || student.courseDivision === selectedPeriod.courseDivision) &&
             student.batch === selectedPeriod.section;
    });
  };

  // Handle take attendance
  const handleTakeAttendance = () => {
    const periodStudents = getStudentsForPeriod();
    const attendanceData = periodStudents.map(student => ({
      studentId: student.id,
      status: 'present' // Default to present, can be modified in future
    }));

    takeAttendanceMutation.mutate({
      date: selectedPeriod?.date,
      courseType: selectedPeriod?.courseType,
      year: selectedPeriod?.year,
      courseDivision: selectedPeriod?.courseDivision,
      section: selectedPeriod?.section,
      period: selectedPeriod?.period,
      students: attendanceData
    });
  };

  // Auto-check missed attendance for yesterday
  useEffect(() => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    autoCheckMutation.mutate(yesterday);
  }, []);

  return (
    <div className="min-h-screen brand-gray-bg">
      {/* Header */}
      <header className="brand-nav text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Missed Attendance</h1>
              <p className="text-xs opacity-80">Track and manage missed classes</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-white border-white/20 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Filter</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 border-b">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Status Legend</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center text-xs">
                <div className={`w-3 h-3 rounded-full ${config.color} mr-1`}></div>
                <span className={config.textColor}>{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Attendance Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-50 text-left font-medium">Date</th>
                    {Array.from({ length: maxPeriods }, (_, i) => (
                      <th key={i} className="border p-2 bg-gray-50 text-center font-medium">
                        P{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map(date => (
                    <tr key={date}>
                      <td className="border p-2 font-medium">
                        <div>
                          {format(new Date(date), 'MMM dd')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(date), 'EEE')}
                        </div>
                      </td>
                      {Array.from({ length: maxPeriods }, (_, period) => {
                        const periodNumber = period + 1;
                        const records = recordsByDatePeriod.get(`${date}-${periodNumber}`) || [];
                        const notTakenCount = records.filter(r => r.status === 'not_taken').length;
                        const takenCount = records.filter(r => r.status === 'taken').length;
                        const holidayCount = records.filter(r => r.status === 'holiday').length;
                        const leaveCount = records.filter(r => r.status === 'leave').length;
                        const emergencyCount = records.filter(r => r.status === 'emergency').length;
                        
                        const totalClasses = records.length;
                        const isClickable = notTakenCount > 0;
                        
                        return (
                          <td 
                            key={periodNumber} 
                            className={`border p-1 text-center ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                            onClick={() => isClickable && handlePeriodClick(date, periodNumber)}
                          >
                            {totalClasses > 0 ? (
                              <div className="space-y-1">
                                {takenCount > 0 && (
                                  <div className="w-full h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center">
                                    {takenCount}
                                  </div>
                                )}
                                {notTakenCount > 0 && (
                                  <div className="w-full h-4 bg-red-500 rounded text-white text-xs flex items-center justify-center animate-pulse">
                                    {notTakenCount}
                                  </div>
                                )}
                                {holidayCount > 0 && (
                                  <div className="w-full h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center">
                                    {holidayCount}
                                  </div>
                                )}
                                {leaveCount > 0 && (
                                  <div className="w-full h-4 bg-yellow-500 rounded text-white text-xs flex items-center justify-center">
                                    {leaveCount}
                                  </div>
                                )}
                                {emergencyCount > 0 && (
                                  <div className="w-full h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center">
                                    {emergencyCount}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-4 bg-gray-100 rounded"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {isLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading missed attendance data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Take Attendance Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take Missed Attendance</DialogTitle>
            <DialogDescription>
              {selectedPeriod && (
                <>
                  <strong>Date:</strong> {format(new Date(selectedPeriod.date), 'MMM dd, yyyy')}<br />
                  <strong>Period:</strong> {selectedPeriod.period}<br />
                  <strong>Class:</strong> {selectedPeriod.courseType === 'pu' ? `${selectedPeriod.year}${selectedPeriod.year === '1' ? 'st' : 'nd'} PU ${selectedPeriod.courseDivision}` : `${selectedPeriod.year}${selectedPeriod.year === '3' ? 'rd' : 'th'} Year`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium">
                Students: {getStudentsForPeriod().length}
              </span>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">
                This will mark all students as <strong>present</strong> for this missed period. 
                You can edit individual attendance later if needed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTakeAttendance}
              disabled={takeAttendanceMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {takeAttendanceMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Take Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}