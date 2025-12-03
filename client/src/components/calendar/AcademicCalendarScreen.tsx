import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, School, AlertTriangle, X, Trash2, Edit, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'academic' | 'emergency';
  reason?: string;
  affectedCourses: string[];
  triggeredAt?: string;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
}

interface AcademicCalendarScreenProps {
  onBack?: () => void;
}

const AcademicCalendarScreen: React.FC<AcademicCalendarScreenProps> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState<'academic' | 'emergency'>('academic');
  const [reason, setReason] = useState('');
  const [affectedCourses, setAffectedCourses] = useState<string[]>(['PUC', 'Post-PUC']);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Academic holidays support multiple date selection
  // (Emergency holiday logic removed per user request)

  // Fetch holidays
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['/api/holidays'],
    queryFn: async () => {
      const response = await fetch('/api/holidays?isDeleted=false', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch holidays');
      return response.json() as Holiday[];
    }
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (holidayData: Partial<Holiday>) => {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayData),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create holiday');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Failed to create holiday:', error.message);
    }
  });

  // Update holiday mutation (for undo/delete)
  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, update }: { id: number; update: Partial<Holiday> }) => {
      const response = await fetch(`/api/holidays/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update holiday');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    }
  });

  const resetForm = () => {
    setSelectedDates([]);
    setHolidayName('');
    setHolidayType('academic');
    setReason('');
    setAffectedCourses(['PUC', 'Post-PUC']);
    setEditingHoliday(null);
  };

  const handleDeclareHoliday = () => {
    if (selectedDates.length === 0 || !holidayName) return;

    // Create academic holidays for all selected dates
    const holidayPromises = selectedDates.map(date => {
      const holidayData = {
        date,
        name: holidayName,
        type: holidayType,
        reason: reason || undefined,
        affectedCourses,
        isDeleted: false
      };
      return createHolidayMutation.mutateAsync(holidayData);
    });

    Promise.all(holidayPromises).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      resetForm();
    }).catch(error => {
      console.error('Failed to create holidays:', error);
    });
  };

  const handleUndoHoliday = (holiday: Holiday) => {
    updateHolidayMutation.mutate({
      id: holiday.id,
      update: { isDeleted: true }
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getHolidayForDate = (day: number) => {
    if (!day) return null;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date === dateStr && !h.isDeleted);
  };

  const isToday = (day: number) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonth.getMonth() && 
           today.getFullYear() === currentMonth.getFullYear();
  };

  const formatDateForInput = (day: number) => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Handle date selection logic - Academic holidays support multiple selection
  const handleDateClick = (dateStr: string) => {
    setSelectedDates(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const selectedDateHoliday = selectedDates.length === 1 ? holidays.find(h => h.date === selectedDates[0] && !h.isDeleted) : null;
  const today = new Date().toISOString().split('T')[0];



  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            className="mr-3 back-button p-2 rounded-xl hover:bg-white hover:bg-opacity-20 active:bg-opacity-30 transition-all duration-200 cursor-pointer backdrop-blur-sm border border-gray-300" 
            aria-label="Go back"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Calendar className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
        </div>
        <Badge variant="secondary" className="text-sm">
          Smart Holiday Scheduling System
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Component */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  >
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} className="p-2"></div>;
                  
                  const holiday = getHolidayForDate(day);
                  const dateStr = formatDateForInput(day);
                  const isSelectedDay = selectedDates.includes(dateStr);
                  const todayClass = isToday(day) ? 'ring-2 ring-blue-500' : '';
                  
                  return (
                    <div
                      key={`day-${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`}
                      className={`
                        p-2 text-center cursor-pointer rounded-lg border transition-colors
                        ${isSelectedDay ? 'bg-blue-100 border-blue-500' : 'border-gray-200 hover:bg-gray-50'}
                        ${todayClass}
                        ${holiday ? 'bg-blue-50 border-blue-300' : ''}
                      `}
                      onClick={() => handleDateClick(dateStr)}
                    >
                      <div className="text-sm font-medium">{day}</div>
                      {holiday && (
                        <div className="text-xs mt-1 px-1 py-0.5 rounded bg-blue-200 text-blue-700">
                          Holiday
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-200 rounded"></div>
                  <span>Academic Holiday</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-blue-500 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded"></div>
                  <span>Selected</span>
                </div>
              </div>
              {selectedDates.length > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-medium">
                    {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected for holiday declaration
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Click additional dates to add them, or click selected dates to remove them
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Declare Holiday Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {selectedDateHoliday ? 'Holiday Declared' : 'Declare Holiday'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDates.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">
                    Selected Date{selectedDates.length > 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-1">
                    {selectedDates.slice(0, 5).map(date => (
                      <p key={date} className="text-sm">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    ))}
                    {selectedDates.length > 5 && (
                      <p className="text-xs text-gray-500">
                        +{selectedDates.length - 5} more dates
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Click dates to toggle selection for multiple holidays
                  </p>
                </div>
              )}

              {selectedDateHoliday ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Holiday already declared for this date
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-3 border rounded-lg">
                    <h3 className="font-medium">{selectedDateHoliday.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      Academic Holiday
                    </Badge>
                    {selectedDateHoliday.reason && (
                      <p className="text-sm text-gray-600 mt-2">{selectedDateHoliday.reason}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Affects: {selectedDateHoliday.affectedCourses.join(', ')}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={() => handleUndoHoliday(selectedDateHoliday)}
                    disabled={updateHolidayMutation.isPending}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Undo Holiday
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Holiday Name</label>
                    <Input
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="e.g., Independence Day, Eid"
                    />
                  </div>

                  {/* Holiday Type - Hidden for now, only Academic holidays supported */}
                  <div className="hidden">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={holidayType} onValueChange={(value: 'academic' | 'emergency') => setHolidayType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-1">Academic Holiday</p>
                    <p className="text-xs text-blue-600">
                      Click multiple dates on the calendar to create holidays for consecutive days or select individual dates as needed.
                    </p>
                  </div>



                  <div>
                    <label className="text-sm font-medium mb-2 block">Affected Courses</label>
                    <div className="space-y-2">
                      {['PUC', 'Post-PUC'].map(course => (
                        <div key={course} className="flex items-center space-x-2">
                          <Checkbox
                            checked={affectedCourses.includes(course)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAffectedCourses([...affectedCourses, course]);
                              } else {
                                setAffectedCourses(affectedCourses.filter(c => c !== course));
                              }
                            }}
                          />
                          <label className="text-sm">{course}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleDeclareHoliday}
                    disabled={selectedDates.length === 0 || !holidayName || affectedCourses.length === 0 || createHolidayMutation.isPending}
                    className="w-full"
                  >
                    <School className="h-4 w-4 mr-2" />
                    Declare Academic Holiday{selectedDates.length > 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {selectedDates.length > 0 && selectedDates.some(date => date >= today) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Declaring a holiday will:
                    • Block attendance for affected courses
                    • Disable namaz tracking
                    • Mark the day as "Holiday" in exports
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Scheduled Holidays Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Holidays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No holidays scheduled</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Affected Courses</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays
                    .filter(holiday => !holiday.isDeleted)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(holiday => (
                    <tr key={holiday.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {new Date(holiday.date).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-medium">{holiday.name}</td>
                      <td className="p-2">
                        <Badge variant={holiday.type === 'emergency' ? 'destructive' : 'secondary'}>
                          {holiday.type === 'emergency' ? 'Emergency' : 'Academic'}
                        </Badge>
                      </td>
                      <td className="p-2">{holiday.affectedCourses.join(', ')}</td>
                      <td className="p-2">
                        {holiday.triggeredAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            {holiday.triggeredAt}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoHoliday(holiday)}
                          disabled={updateHolidayMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademicCalendarScreen;