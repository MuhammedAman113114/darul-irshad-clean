import React, { useState, useEffect } from 'react';
import { hybridStorage } from '@/lib/hybridStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  FileText,
  ArrowLeft
} from 'lucide-react';

interface HybridStorageAdminProps {
  onBack: () => void;
}

export default function HybridStorageAdmin({ onBack }: HybridStorageAdminProps) {
  const [status, setStatus] = useState({ isOnline: false, queueSize: 0, lastSync: 0 });
  const [localData, setLocalData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  useEffect(() => {
    updateStatus();
    loadLocalData();
    
    const interval = setInterval(() => {
      updateStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
    setStatus(hybridStorage.getStatus());
  };

  const loadLocalData = () => {
    const data = {
      students: {},
      attendance: {},
      namaz: {},
      leaves: 0,
      holidays: 0
    };

    // Count students by section
    const studentSections = ['pu_1_commerce_A', 'pu_1_commerce_B', 'pu_2_commerce_A', 'pu_2_commerce_B', 
                            'pu_1_science_A', 'pu_2_science_A', 'post-pu_3_A', 'post-pu_4_A', 
                            'post-pu_5_A', 'post-pu_6_A', 'post-pu_7_A'];
    
    studentSections.forEach(section => {
      const stored = localStorage.getItem(section);
      if (stored) {
        try {
          const students = JSON.parse(stored);
          if (Array.isArray(students) && students.length > 0) {
            data.students[section] = students.length;
          }
        } catch (error) {
          console.error(`Error parsing ${section}:`, error);
        }
      }
    });

    // Count attendance and namaz records
    let attendanceCount = 0;
    let namazCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('attendance_')) {
        attendanceCount++;
      } else if (key?.startsWith('namaz_')) {
        namazCount++;
      }
    }
    
    data.attendance.totalRecords = attendanceCount;
    data.namaz.totalRecords = namazCount;

    // Count leaves
    const leaves = localStorage.getItem('leaves');
    if (leaves) {
      try {
        const leaveArray = JSON.parse(leaves);
        data.leaves = Array.isArray(leaveArray) ? leaveArray.length : 0;
      } catch (error) {
        data.leaves = 0;
      }
    }

    // Count holidays
    const holidays = localStorage.getItem('holidays');
    if (holidays) {
      try {
        const holidayArray = JSON.parse(holidays);
        data.holidays = Array.isArray(holidayArray) ? holidayArray.length : 0;
      } catch (error) {
        data.holidays = 0;
      }
    }

    setLocalData(data);
  };

  const handleForceSync = async () => {
    setIsLoading(true);
    try {
      await hybridStorage.forceSync();
      updateStatus();
      
      setSyncHistory(prev => [{
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'completed',
        itemsProcessed: status.queueSize
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error('Force sync failed:', error);
      setSyncHistory(prev => [{
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLocalData = () => {
    if (confirm('Are you sure you want to clear all local data? This action cannot be undone.')) {
      hybridStorage.clearLocalData();
      loadLocalData();
      updateStatus();
    }
  };

  const getStorageSize = () => {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return (totalSize / 1024).toFixed(2);
  };

  const getLastSyncText = () => {
    if (status.lastSync === 0) return 'Never synced';
    const diff = Date.now() - status.lastSync;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    return `${Math.floor(diff / 3600000)} hours ago`;
  };

  const totalStudents = Object.values(localData.students || {}).reduce((sum: number, count: any) => sum + count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hybrid Storage Admin</h1>
              <p className="text-gray-600">Database + LocalStorage Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {status.isOnline ? (
              <Badge variant="default" className="bg-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {status.isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.isOnline ? 'Online' : 'Offline'}</div>
              <p className="text-xs text-muted-foreground">
                {status.isOnline ? 'Database connected' : 'Using local storage only'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Queue</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.queueSize}</div>
              <p className="text-xs text-muted-foreground">
                Items pending sync
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{getLastSyncText()}</div>
              <p className="text-xs text-muted-foreground">
                Database synchronization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Size</CardTitle>
              <HardDrive className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStorageSize()} KB</div>
              <p className="text-xs text-muted-foreground">
                Local storage used
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Management</CardTitle>
            <CardDescription>Control database synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.queueSize > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Pending Changes</AlertTitle>
                <AlertDescription>
                  You have {status.queueSize} changes waiting to sync with the database.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex space-x-2">
              <Button
                onClick={handleForceSync}
                disabled={isLoading || !status.isOnline}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Syncing...' : 'Force Sync'}</span>
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleClearLocalData}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Local Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Overview */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Data Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="sync-history">Sync History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground">Across all sections</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localData.attendance?.totalRecords || 0}</div>
                  <p className="text-xs text-muted-foreground">Daily attendance entries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Namaz Records</CardTitle>
                  <Calendar className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localData.namaz?.totalRecords || 0}</div>
                  <p className="text-xs text-muted-foreground">Prayer tracking entries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leave Records</CardTitle>
                  <FileText className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localData.leaves || 0}</div>
                  <p className="text-xs text-muted-foreground">Student leave applications</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Students by Section</CardTitle>
                <CardDescription>Number of students in each section stored locally</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(localData.students || {}).map(([section, count]: [string, any]) => (
                    <div key={section} className="flex items-center justify-between py-2 border-b">
                      <span className="font-medium">{section.replace(/_/g, ' ').toUpperCase()}</span>
                      <Badge variant="secondary">{count} students</Badge>
                    </div>
                  ))}
                  {Object.keys(localData.students || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No student data found in local storage</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync-history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization History</CardTitle>
                <CardDescription>Recent sync operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncHistory.length > 0 ? (
                    syncHistory.map((sync, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center space-x-3">
                          {sync.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{sync.type === 'manual' ? 'Manual Sync' : 'Auto Sync'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(sync.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={sync.status === 'completed' ? 'default' : 'destructive'}>
                          {sync.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No sync history available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}