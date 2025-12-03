/**
 * Real-Time Attendance Module
 * Implements strict authentic data principles - no mock or placeholder data
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { attendanceAnalytics, StudentAttendanceStats, AttendanceTrend } from "@/lib/attendanceAnalytics";
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, 
  Calendar, Clock, Users, CheckCircle, XCircle, UserX, Download 
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import * as XLSX from 'xlsx';

interface RealTimeAttendanceModuleProps {
  courseType: string;
  year: string;
  courseDivision: string;
  section: string;
}

export default function RealTimeAttendanceModule({
  courseType,
  year,
  courseDivision,
  section
}: RealTimeAttendanceModuleProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("7days");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Get date range based on selection
  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date;
    
    switch (selectedTimeRange) {
      case "7days":
        startDate = subDays(endDate, 7);
        break;
      case "30days":
        startDate = subDays(endDate, 30);
        break;
      case "90days":
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };

  // Fetch attendance trends - only real data
  const { data: attendanceTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/attendance/trends', courseType, year, courseDivision, section, selectedTimeRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return attendanceAnalytics.getAttendanceTrends(
        courseType, year, courseDivision, section, startDate, endDate
      );
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch critical attendance students
  const { data: criticalStudents = [], isLoading: criticalLoading } = useQuery({
    queryKey: ['/api/attendance/critical', courseType, year, courseDivision, section],
    queryFn: () => attendanceAnalytics.getCriticalAttendanceStudents(
      courseType, year, courseDivision, section, 75
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch students for individual analysis
  const { data: students = [] } = useQuery({
    queryKey: ['/api/students', { courseType, year, courseDivision, section }],
    staleTime: 10 * 60 * 1000,
  });

  // Fetch individual student stats
  const { data: studentStats, isLoading: studentStatsLoading } = useQuery({
    queryKey: ['/api/attendance/student-stats', selectedStudentId],
    queryFn: () => selectedStudentId ? attendanceAnalytics.getStudentStats(parseInt(selectedStudentId)) : null,
    enabled: !!selectedStudentId,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate overall trends
  const calculateOverallStats = () => {
    if (attendanceTrends.length === 0) {
      return {
        totalPeriodsMarked: 0,
        averageAttendance: 0,
        totalStudents: 0,
        hasData: false
      };
    }

    const totalPeriodsMarked = attendanceTrends.reduce((sum, trend) => sum + trend.totalPeriodsMarked, 0);
    const averageAttendance = Math.round(
      attendanceTrends.reduce((sum, trend) => sum + trend.attendancePercentage, 0) / attendanceTrends.length
    );
    const totalStudents = Math.max(...attendanceTrends.map(t => t.totalStudents));

    return {
      totalPeriodsMarked,
      averageAttendance,
      totalStudents,
      hasData: true
    };
  };

  const overallStats = calculateOverallStats();

  // Export attendance data
  const exportAttendanceData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Overview sheet
      const overviewData = [
        { Metric: 'Class', Value: `${year} ${courseDivision} Section ${section}` },
        { Metric: 'Date Range', Value: `${startDate} to ${endDate}` },
        { Metric: 'Total Students', Value: overallStats.totalStudents },
        { Metric: 'Total Periods Marked', Value: overallStats.totalPeriodsMarked },
        { Metric: 'Average Attendance', Value: `${overallStats.averageAttendance}%` },
        { Metric: 'Students Below 75%', Value: criticalStudents.length },
      ];
      
      const overviewWS = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWS, 'Overview');
      
      // Daily trends sheet
      if (attendanceTrends.length > 0) {
        const trendsData = attendanceTrends.map(trend => ({
          Date: trend.date,
          'Total Students': trend.totalStudents,
          'Periods Marked': trend.totalPeriodsMarked,
          'Present': trend.presentCount,
          'Absent': trend.absentCount,
          'On Leave': trend.onLeaveCount,
          'Attendance %': `${trend.attendancePercentage}%`
        }));
        
        const trendsWS = XLSX.utils.json_to_sheet(trendsData);
        XLSX.utils.book_append_sheet(wb, trendsWS, 'Daily Trends');
      }
      
      // Critical students sheet
      if (criticalStudents.length > 0) {
        const criticalData = criticalStudents.map(student => ({
          'Roll No': student.rollNo,
          'Student Name': student.studentName,
          'Total Periods': student.totalPeriodsMarked,
          'Present': student.totalPresent,
          'Absent': student.totalAbsent,
          'On Leave': student.totalOnLeave,
          'Attendance %': `${student.attendancePercentage}%`,
          'Missed Classes': student.missedClasses.length,
          'Trend': student.recentTrend
        }));
        
        const criticalWS = XLSX.utils.json_to_sheet(criticalData);
        XLSX.utils.book_append_sheet(wb, criticalWS, 'Critical Students');
      }
      
      // Save file
      const fileName = `attendance_analysis_${courseType}_${year}_${courseDivision}_${section}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error exporting attendance data:', error);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Real-Time Attendance Analytics</h2>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={exportAttendanceData}
            disabled={!overallStats.hasData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.hasData ? overallStats.totalStudents : 'No Data'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Periods Marked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.hasData ? overallStats.totalPeriodsMarked : 'No Data'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Average Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.hasData ? `${overallStats.averageAttendance}%` : 'No Data'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Critical Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalStudents.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Availability Notice */}
      {!overallStats.hasData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>No attendance data available for the selected time period. Attendance must be marked to generate analytics.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Students Alert */}
      {criticalStudents.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Students with Critical Attendance (Below 75%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalStudents.slice(0, 5).map((student) => (
                <div key={student.studentId} className="flex justify-between items-center p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{student.studentName}</span>
                    <span className="text-sm text-gray-600 ml-2">(Roll: {student.rollNo})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {student.attendancePercentage}%
                    </Badge>
                    <div className="flex items-center text-sm text-gray-600">
                      {student.recentTrend === 'improving' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {student.recentTrend === 'declining' && <TrendingDown className="h-4 w-4 text-red-600" />}
                      {student.recentTrend === 'stable' && <Minus className="h-4 w-4 text-gray-600" />}
                    </div>
                  </div>
                </div>
              ))}
              {criticalStudents.length > 5 && (
                <div className="text-sm text-gray-600 text-center">
                  And {criticalStudents.length - 5} more students...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Student Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Student Analysis</CardTitle>
          <CardDescription>
            Select a student to view detailed attendance statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((student: any) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.name} (Roll: {student.rollNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStudentId && studentStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {studentStats.attendancePercentage}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {studentStats.totalPresent} / {studentStats.totalPeriodsMarked} periods
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Missed Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {studentStats.missedClasses.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Unauthorized absences
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      {studentStats.recentTrend === 'improving' && (
                        <>
                          <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                          <span className="text-green-600 font-medium">Improving</span>
                        </>
                      )}
                      {studentStats.recentTrend === 'declining' && (
                        <>
                          <TrendingDown className="h-6 w-6 text-red-600 mr-2" />
                          <span className="text-red-600 font-medium">Declining</span>
                        </>
                      )}
                      {studentStats.recentTrend === 'stable' && (
                        <>
                          <Minus className="h-6 w-6 text-gray-600 mr-2" />
                          <span className="text-gray-600 font-medium">Stable</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedStudentId && !studentStats && !studentStatsLoading && (
              <div className="text-center py-4 text-gray-500">
                No attendance data available for this student
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      {attendanceTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Trends</CardTitle>
            <CardDescription>
              Based on actual attendance records only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceTrends.map((trend) => (
                <div key={trend.date} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{format(parseISO(trend.date), 'MMM dd, yyyy')}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({trend.totalPeriodsMarked} periods marked)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-green-600">{trend.presentCount} present</span>
                      <span className="text-red-600 ml-2">{trend.absentCount} absent</span>
                      <span className="text-yellow-600 ml-2">{trend.onLeaveCount} on leave</span>
                    </div>
                    <Badge variant={trend.attendancePercentage >= 80 ? "default" : "destructive"}>
                      {trend.attendancePercentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}