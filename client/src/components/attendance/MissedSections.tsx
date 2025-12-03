import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Search, Filter, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MissedSectionsOfflineService } from '@/lib/missedSectionsOffline';

interface MissedSection {
  id: string;
  courseType: string;
  year: string;
  stream: string;
  section: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  scheduledDate: string;
  scheduledEndTime: string;
  status: string;
  className: string;
  missedHours: number;
}

interface MissedSectionsProps {
  courseType: string;
  year: string;
  courseDivision: string;
  section: string;
}

export const MissedSections: React.FC<MissedSectionsProps> = ({
  courseType,
  year,
  courseDivision,
  section
}) => {
  const [missedSections, setMissedSections] = useState<MissedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDays, setFilterDays] = useState('30');
  const [filterSubject, setFilterSubject] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadMissedSections = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        days: filterDays,
        ...(courseType && { courseType }),
        ...(year && { year }),
        ...(courseDivision && { courseDivision }),
        ...(section && { section })
      };

      const data = await MissedSectionsOfflineService.getMissedSections(filters);
      setMissedSections(data.missedSections || []);
      setTotalCount(data.totalCount || 0);
      setDateRange(data.dateRange || null);
      setLastUpdated(data.lastFetch);

      console.log(`📋 Loaded ${data.totalCount} missed sections`);
    } catch (error) {
      console.error('Failed to load missed attendance:', error);
      setError('Failed to load missed sections');
    } finally {
      setLoading(false);
    }
  };

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (MissedSectionsOfflineService.isOnline()) {
        loadMissedSections(); // Refresh when back online
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

  useEffect(() => {
    loadMissedSections();
  }, [courseType, year, courseDivision, section, filterDays]);

  const handleRefresh = async () => {
    await MissedSectionsOfflineService.refreshCache();
    loadMissedSections();
  };

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadMissedSections();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [courseType, year, courseDivision, section, filterDays]);

  // Filter missed sections based on search term and subject filter
  const filteredSections = missedSections.filter(section => {
    const matchesSearch = searchTerm === '' || 
      section.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.scheduledDate.includes(searchTerm);
    
    const matchesSubject = filterSubject === '' || filterSubject === 'all' || section.subjectName === filterSubject;
    
    return matchesSearch && matchesSubject;
  });

  // Get unique subjects for filter dropdown
  const uniqueSubjects = Array.from(new Set(missedSections.map(s => s.subjectName))).sort();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getMissedDurationBadge = (hours: number) => {
    if (hours < 24) {
      return <Badge variant="destructive">{hours}h ago</Badge>;
    } else if (hours < 168) { // 7 days
      return <Badge variant="destructive">{Math.floor(hours / 24)}d ago</Badge>;
    } else {
      return <Badge variant="secondary">{Math.floor(hours / 168)}w ago</Badge>;
    }
  };

  const handleScheduleMakeup = (section: MissedSection) => {
    // TODO: Implement schedule makeup functionality
    console.log('Schedule makeup for:', section);
    alert(`Scheduling makeup for ${section.subjectName} - ${section.className}\nDate: ${section.scheduledDate}\nPeriod: ${section.periodNumber}`);
  };

  const handleMarkCancelled = (section: MissedSection) => {
    // TODO: Implement mark as cancelled functionality
    console.log('Mark as cancelled:', section);
    alert(`Marking as cancelled: ${section.subjectName} - ${section.className}\nDate: ${section.scheduledDate}\nPeriod: ${section.periodNumber}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading missed sections...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-red-600">{error}</p>
        <Button onClick={loadMissedSections} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Missed Sections
            </div>
            <div className="flex items-center gap-2">
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
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="h-7 px-2"
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalCount}</div>
              <div className="text-sm text-gray-600">Total Missed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredSections.length}</div>
              <div className="text-sm text-gray-600">After Filters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{uniqueSubjects.length}</div>
              <div className="text-sm text-gray-600">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{filterDays}</div>
              <div className="text-sm text-gray-600">Days Range</div>
            </div>
          </div>
          
          {dateRange && (
            <p className="text-sm text-gray-600 text-center">
              Showing missed sections from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by subject, class, or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={filterDays} onValueChange={setFilterDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={loadMissedSections} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missed Sections List */}
      {filteredSections.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Missed Sections Found</h3>
              <p className="text-gray-600">
                {totalCount === 0 
                  ? "Great! All classes have been conducted as scheduled."
                  : "No missed sections match your current filters."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSections.map((section) => (
            <Card key={section.id} className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{section.className}</h3>
                      {getMissedDurationBadge(section.missedHours)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <strong>{section.subjectName}</strong>
                        <Badge variant="outline">{section.subjectCode}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(section.scheduledDate)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Period {section.periodNumber}
                        {section.startTime && section.endTime && (
                          <span> • {formatTime(section.startTime)} - {formatTime(section.endTime)}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{section.dayOfWeek}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-2">
                    <Button 
                      onClick={() => handleScheduleMakeup(section)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Schedule Makeup
                    </Button>
                    <Button 
                      onClick={() => handleMarkCancelled(section)}
                      size="sm"
                      variant="outline"
                    >
                      Mark Cancelled
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};