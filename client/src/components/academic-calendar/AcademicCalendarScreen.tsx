import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit3, Trash2, Clock, AlertTriangle, Users, BookOpen, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
// Removed deprecated fetchAllStudents import - using React Query instead

interface AcademicEvent {
  id: string;
  title: string;
  type: 'holiday' | 'exam' | 'vacation' | 'event' | 'break';
  startDate: string;
  endDate: string;
  description?: string;
  isRecurring?: boolean;
  classes?: string[]; // Which classes this affects
  isEditable: boolean;
}

interface StudentLeave {
  id: string;
  studentId: number;
  studentName: string;
  rollNo: string;
  type: 'emergency' | 'monthly' | 'medical' | 'family' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  approvedBy?: string;
  notes?: string;
}

interface AcademicCalendarScreenProps {
  onBack: () => void;
}

export default function AcademicCalendarScreen({ onBack }: AcademicCalendarScreenProps) {
  const [currentView, setCurrentView] = useState<'calendar' | 'events' | 'leaves'>('calendar');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<StudentLeave[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  const [editingLeave, setEditingLeave] = useState<StudentLeave | null>(null);
  
  const { toast } = useToast();

  // Fetch authentic students from database (same as attendance module)
  const { data: databaseStudents = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  // Load data on component mount
  useEffect(() => {
    loadAcademicEvents();
    loadStudentLeaves();
  }, []);

  const loadAcademicEvents = () => {
    const savedEvents = localStorage.getItem('academic_events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      // Initialize with default college calendar
      const defaultEvents: AcademicEvent[] = [
        {
          id: '1',
          title: 'Independence Day',
          type: 'holiday',
          startDate: '2025-08-15',
          endDate: '2025-08-15',
          description: 'National Holiday',
          isEditable: false
        },
        {
          id: '2',
          title: 'Gandhi Jayanti',
          type: 'holiday',
          startDate: '2025-10-02',
          endDate: '2025-10-02',
          description: 'National Holiday',
          isEditable: false
        },
        {
          id: '3',
          title: 'Winter Break',
          type: 'vacation',
          startDate: '2025-12-20',
          endDate: '2026-01-05',
          description: 'Winter vacation for all classes',
          classes: ['all'],
          isEditable: true
        },
        {
          id: '4',
          title: 'Annual Exams',
          type: 'exam',
          startDate: '2025-11-15',
          endDate: '2025-11-30',
          description: 'Annual examination period',
          classes: ['all'],
          isEditable: true
        }
      ];
      setEvents(defaultEvents);
      localStorage.setItem('academic_events', JSON.stringify(defaultEvents));
    }
  };

  const loadStudentLeaves = () => {
    const savedLeaves = localStorage.getItem('student_leaves');
    if (savedLeaves) {
      setStudentLeaves(JSON.parse(savedLeaves));
    }
  };

  const saveAcademicEvents = (newEvents: AcademicEvent[]) => {
    setEvents(newEvents);
    localStorage.setItem('academic_events', JSON.stringify(newEvents));
  };

  const saveStudentLeaves = (newLeaves: StudentLeave[]) => {
    setStudentLeaves(newLeaves);
    localStorage.setItem('student_leaves', JSON.stringify(newLeaves));
  };

  const handleAddEvent = (eventData: Partial<AcademicEvent>) => {
    const newEvent: AcademicEvent = {
      id: Date.now().toString(),
      title: eventData.title || '',
      type: eventData.type || 'event',
      startDate: eventData.startDate || '',
      endDate: eventData.endDate || eventData.startDate || '',
      description: eventData.description || '',
      classes: eventData.classes || ['all'],
      isEditable: true
    };

    const updatedEvents = [...events, newEvent];
    saveAcademicEvents(updatedEvents);
    setShowEventDialog(false);
    
    toast({
      title: "Event Added",
      description: `${newEvent.title} has been added to the calendar`,
    });
  };

  const handleEditEvent = (eventData: Partial<AcademicEvent>) => {
    if (!editingEvent) return;

    const updatedEvents = events.map(event =>
      event.id === editingEvent.id
        ? { ...event, ...eventData }
        : event
    );

    saveAcademicEvents(updatedEvents);
    setEditingEvent(null);
    setShowEventDialog(false);
    
    toast({
      title: "Event Updated",
      description: `${eventData.title} has been updated`,
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event?.isEditable) {
      toast({
        title: "Cannot Delete",
        description: "This is a fixed college event and cannot be deleted",
        variant: "destructive"
      });
      return;
    }

    const updatedEvents = events.filter(e => e.id !== eventId);
    saveAcademicEvents(updatedEvents);
    
    toast({
      title: "Event Deleted",
      description: "The event has been removed from the calendar",
    });
  };

  const handleAddStudentLeave = (leaveData: Partial<StudentLeave>) => {
    const newLeave: StudentLeave = {
      id: Date.now().toString(),
      studentId: leaveData.studentId || 0,
      studentName: leaveData.studentName || '',
      rollNo: leaveData.rollNo || '',
      type: leaveData.type || 'other',
      startDate: leaveData.startDate || '',
      endDate: leaveData.endDate || '',
      reason: leaveData.reason || '',
      status: 'approved', // Auto-approve for now
      appliedDate: new Date().toISOString().split('T')[0],
      approvedBy: 'Admin'
    };

    const updatedLeaves = [...studentLeaves, newLeave];
    saveStudentLeaves(updatedLeaves);
    setShowLeaveDialog(false);

    // Also save to main leaves storage for attendance system
    const mainLeaves = JSON.parse(localStorage.getItem('leaves') || '[]');
    const attendanceLeave = {
      id: Date.now(),
      studentId: newLeave.studentId,
      fromDate: newLeave.startDate,
      toDate: newLeave.endDate,
      reason: newLeave.reason,
      status: 'active',
      createdBy: 'Admin',
      createdAt: new Date().toISOString()
    };
    mainLeaves.push(attendanceLeave);
    localStorage.setItem('leaves', JSON.stringify(mainLeaves));
    
    toast({
      title: "Leave Added",
      description: `Leave for ${newLeave.studentName} has been approved`,
    });
  };

  const getMonthEvents = () => {
    const [year, month] = selectedMonth.split('-');
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0);
      
      return (eventStart <= monthEnd && eventEnd >= monthStart);
    });
  };

  const getMonthLeaves = () => {
    const [year, month] = selectedMonth.split('-');
    return studentLeaves.filter(leave => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0);
      
      return (leaveStart <= monthEnd && leaveEnd >= monthStart);
    });
  };

  const generateCalendarDays = () => {
    const [year, month] = selectedMonth.split('-');
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === parseInt(month) - 1;
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        return current >= eventStart && current <= eventEnd;
      });
      
      const dayLeaves = studentLeaves.filter(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return current >= leaveStart && current <= leaveEnd;
      });

      days.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth,
        events: dayEvents,
        leaves: dayLeaves
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => {
              console.log('Back button clicked, navigating to home');
              if (onBack) {
                onBack();
              } else {
                window.location.href = '/';
              }
            }} className="flex items-center space-x-2">
              <span>←</span>
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Academic Calendar</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <Button
            variant={currentView === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('calendar')}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
          <Button
            variant={currentView === 'events' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('events')}
            className="flex-1"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Events & Holidays
          </Button>
          <Button
            variant={currentView === 'leaves' ? 'default' : 'ghost'}
            onClick={() => setCurrentView('leaves')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Student Leaves
          </Button>
        </div>

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <CalendarView
            days={generateCalendarDays()}
            selectedMonth={selectedMonth}
            onEventClick={(event: AcademicEvent) => {
              setEditingEvent(event);
              setShowEventDialog(true);
            }}
          />
        )}

        {/* Events View */}
        {currentView === 'events' && (
          <EventsView
            events={getMonthEvents()}
            onAddEvent={() => {
              setEditingEvent(null);
              setShowEventDialog(true);
            }}
            onEditEvent={(event: AcademicEvent) => {
              setEditingEvent(event);
              setShowEventDialog(true);
            }}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {/* Leaves View */}
        {currentView === 'leaves' && (
          <LeavesView
            leaves={getMonthLeaves()}
            onAddLeave={() => {
              setEditingLeave(null);
              setShowLeaveDialog(true);
            }}
            onEditLeave={(leave: StudentLeave) => {
              setEditingLeave(leave);
              setShowLeaveDialog(true);
            }}
          />
        )}

        {/* Event Dialog */}
        <EventDialog
          open={showEventDialog}
          onClose={() => {
            setShowEventDialog(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          onSave={editingEvent ? handleEditEvent : handleAddEvent}
        />

        {/* Leave Dialog */}
        <LeaveDialog
          open={showLeaveDialog}
          onClose={() => {
            setShowLeaveDialog(false);
            setEditingLeave(null);
          }}
          leave={editingLeave}
          onSave={handleAddStudentLeave}
        />
      </div>
    </div>
  );
}

// Calendar View Component
function CalendarView({ days, selectedMonth, onEventClick }: any) {
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{monthName}</h2>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {days.map((day: any, index: number) => (
          <CalendarDay key={index} day={day} onEventClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}

function CalendarDay({ day, onEventClick }: any) {
  const hasEvents = day.events.length > 0;
  const hasLeaves = day.leaves.length > 0;
  
  return (
    <div 
      className={`min-h-[100px] p-2 border border-gray-200 ${
        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
      } ${hasEvents ? 'bg-blue-50' : ''} ${hasLeaves ? 'bg-yellow-50' : ''}`}
    >
      <div className={`text-sm font-medium ${
        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
      }`}>
        {day.date.getDate()}
      </div>
      
      {/* Events */}
      <div className="mt-1 space-y-1">
        {day.events.slice(0, 2).map((event: AcademicEvent) => (
          <div
            key={event.id}
            onClick={() => onEventClick(event)}
            className={`text-xs p-1 rounded cursor-pointer truncate ${
              event.type === 'holiday' ? 'bg-red-100 text-red-800' :
              event.type === 'exam' ? 'bg-orange-100 text-orange-800' :
              event.type === 'vacation' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}
          >
            {event.title}
          </div>
        ))}
        
        {/* Leaves indicator */}
        {hasLeaves && (
          <div className="text-xs p-1 rounded bg-yellow-100 text-yellow-800">
            {day.leaves.length} student{day.leaves.length > 1 ? 's' : ''} on leave
          </div>
        )}
        
        {day.events.length > 2 && (
          <div className="text-xs text-gray-500">
            +{day.events.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
}

// Events View Component
function EventsView({ events, onAddEvent, onEditEvent, onDeleteEvent }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Events & Holidays</h2>
        <Button onClick={onAddEvent} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Event</span>
        </Button>
      </div>
      
      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events scheduled for this month</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event: AcademicEvent) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => onEditEvent(event)}
              onDelete={() => onDeleteEvent(event.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }: any) {
  const getEventColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-red-100 text-red-800 border-red-200';
      case 'exam': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'vacation': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'break': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
  };

  return (
    <Card className={`border-l-4 ${getEventColor(event.type)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <CardTitle className="text-lg">{event.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {formatDateRange(event.startDate, event.endDate)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getEventColor(event.type)}>
              {event.type}
            </Badge>
            {event.isEditable && (
              <div className="flex space-x-1">
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      {event.description && (
        <CardContent className="pt-0">
          <p className="text-gray-700">{event.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

// Leaves View Component
function LeavesView({ leaves, onAddLeave, onEditLeave }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Student Leaves</h2>
        <Button onClick={onAddLeave} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Leave</span>
        </Button>
      </div>
      
      <div className="grid gap-4">
        {leaves.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No student leaves for this month</p>
            </CardContent>
          </Card>
        ) : (
          leaves.map((leave: StudentLeave) => (
            <LeaveCard
              key={leave.id}
              leave={leave}
              onEdit={() => onEditLeave(leave)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LeaveCard({ leave, onEdit }: any) {
  const getLeaveColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'medical': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'family': return 'bg-green-100 text-green-800 border-green-200';
      case 'monthly': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
  };

  return (
    <Card className={`border-l-4 ${getLeaveColor(leave.type)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {leave.studentName} (Roll: {leave.rollNo})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {formatDateRange(leave.startDate, leave.endDate)}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getLeaveColor(leave.type)}>
              {leave.type}
            </Badge>
            <Badge 
              variant={leave.status === 'approved' ? 'default' : 'secondary'}
              className={leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
            >
              {leave.status}
            </Badge>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-gray-700 mb-2"><strong>Reason:</strong> {leave.reason}</p>
        {leave.notes && (
          <p className="text-gray-600 text-sm"><strong>Notes:</strong> {leave.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Event Dialog Component
function EventDialog({ open, onClose, event, onSave }: any) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'event' as AcademicEvent['type'],
    startDate: '',
    endDate: '',
    description: '',
    classes: ['all']
  });
  


  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        type: event.type || 'event',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        description: event.description || '',
        classes: event.classes || ['all']
      });
    } else {
      setFormData({
        title: '',
        type: 'event',
        startDate: '',
        endDate: '',
        description: '',
        classes: ['all']
      });
    }
  }, [event, open]);

  const handleSave = () => {
    if (!formData.title || !formData.startDate) {
      return;
    }
    
    onSave({
      ...formData,
      endDate: formData.endDate || formData.startDate
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              disabled={event && !event.isEditable}
            />
          </div>
          
          <div>
            <Label htmlFor="type">Event Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value as AcademicEvent['type'] })}
              disabled={event && !event.isEditable}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="break">Break</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={event && !event.isEditable}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date (For Multi-Day Events)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={event && !event.isEditable}
              />
            </div>
          </div>
          
          {formData.startDate && formData.endDate && formData.startDate !== formData.endDate && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Multi-Day Event:</strong> {new Date(formData.startDate).toLocaleDateString()} to {new Date(formData.endDate).toLocaleDateString()}
                <span className="ml-2">
                  ({Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
                </span>
              </p>
            </div>
          )}
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter event description"
              rows={3}
              disabled={event && !event.isEditable}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {(!event || event.isEditable) && (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Leave Dialog Component
function LeaveDialog({ open, onClose, leave, onSave }: any) {
  const [formData, setFormData] = useState({
    studentId: 0,
    studentName: '',
    rollNo: '',
    type: 'other' as StudentLeave['type'],
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  });
  
  // Load students from database
  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['/api/students'],
    enabled: true
  });

  useEffect(() => {
    if (leave) {
      setFormData({
        studentId: leave.studentId || 0,
        studentName: leave.studentName || '',
        rollNo: leave.rollNo || '',
        type: leave.type || 'other',
        startDate: leave.startDate || '',
        endDate: leave.endDate || '',
        reason: leave.reason || '',
        notes: leave.notes || ''
      });
    } else {
      setFormData({
        studentId: 0,
        studentName: '',
        rollNo: '',
        type: 'other',
        startDate: '',
        endDate: '',
        reason: '',
        notes: ''
      });
    }
  }, [leave, open]);

  const handleStudentSelect = (studentId: string) => {
    const student = students.find(s => s.id.toString() === studentId);
    if (student) {
      setFormData({
        ...formData,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo
      });
    }
  };

  const handleSave = () => {
    if (!formData.studentId || !formData.startDate || !formData.reason) {
      return;
    }
    
    onSave({
      ...formData,
      endDate: formData.endDate || formData.startDate
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {leave ? 'Edit Student Leave' : 'Add Student Leave'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="student">Select Student</Label>
            <Select 
              value={formData.studentId.toString()} 
              onValueChange={handleStudentSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.name} (Roll: {student.rollNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="type">Leave Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value as StudentLeave['type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emergency">Emergency Leave</SelectItem>
                <SelectItem value="monthly">Monthly Leave</SelectItem>
                <SelectItem value="medical">Medical Leave</SelectItem>
                <SelectItem value="family">Family Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for leave"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Leave
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}