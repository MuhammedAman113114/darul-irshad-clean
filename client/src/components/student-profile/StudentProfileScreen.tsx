import { useState, useMemo } from "react";
import { ArrowLeft, Download, Calendar, User, FileText, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useNotification } from "@/hooks/use-notification";
import type { Student, Attendance, NamazAttendance, Leave, Remark } from "@shared/schema";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentProfileScreenProps {
  student: Student;
  onBack: () => void;
  role: string;
}

export default function StudentProfileScreen({ student, onBack, role }: StudentProfileScreenProps) {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { showNotification } = useNotification();

  // Fetch student's attendance records
  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance', student.id],
    queryFn: () => fetch(`/api/attendance?studentId=${student.id}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch student's namaz records
  const { data: namazRecords = [] } = useQuery<NamazAttendance[]>({
    queryKey: ['/api/namaz-attendance', student.id],
    queryFn: () => fetch(`/api/namaz-attendance?studentId=${student.id}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch student's leave records
  const { data: leaveRecords = [] } = useQuery<Leave[]>({
    queryKey: ['/api/leaves', student.id],
    queryFn: () => fetch(`/api/leaves?studentId=${student.id}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch student's remarks
  const { data: remarkRecords = [] } = useQuery<Remark[]>({
    queryKey: ['/api/remarks', student.id],
    queryFn: () => fetch(`/api/remarks?studentId=${student.id}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });



  // Calculate date range for filtering
  const getDateRange = (filter: string) => {
    const today = new Date();
    const startDate = new Date();
    
    switch (filter) {
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(today.getMonth() - 3);
        break;
      default:
        return null;
    }
    
    return { startDate, endDate: today };
  };

  // Filter records based on date range
  const filterByDate = (records: any[], dateField: string = 'date') => {
    // Ensure records is always an array
    const safeRecords = Array.isArray(records) ? records : [];
    
    if (dateFilter === "all") return safeRecords;
    
    const range = getDateRange(dateFilter);
    if (!range) return safeRecords;
    
    return safeRecords.filter(record => {
      const recordDate = new Date(record[dateField]);
      return recordDate >= range.startDate && recordDate <= range.endDate;
    });
  };

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const filteredAttendance = filterByDate(attendanceRecords);
    const totalClasses = filteredAttendance.length;
    const presentClasses = filteredAttendance.filter(a => a.status === 'present').length;
    const absentClasses = filteredAttendance.filter(a => a.status === 'absent').length;
    const leaveClasses = filteredAttendance.filter(a => a.status === 'leave').length;
    
    // Calculate conducted classes (excluding leave days)
    const conductedClasses = totalClasses - leaveClasses;
    
    return {
      totalClasses,
      presentClasses,
      absentClasses,
      leaveClasses,
      conductedClasses,
      // Fixed calculation: Present / (Total - Leave) * 100
      attendancePercentage: conductedClasses > 0 ? Math.round((presentClasses / conductedClasses) * 100) : 0
    };
  }, [attendanceRecords, dateFilter]);

  // Calculate namaz statistics
  const namazStats = useMemo(() => {
    const filteredNamaz = filterByDate(namazRecords);
    const totalPrayers = filteredNamaz.length;
    const completedPrayers = filteredNamaz.filter(n => n.status === 'present').length;
    
    return {
      totalPrayers,
      completedPrayers,
      completionPercentage: totalPrayers > 0 ? Math.round((completedPrayers / totalPrayers) * 100) : 0
    };
  }, [namazRecords, dateFilter]);

  // Generate PDF Report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header with institution branding
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Darul Irshad', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Education With Awareness', pageWidth / 2, 30, { align: 'center' });
    
    // Report title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Student Academic Report', pageWidth / 2, 45, { align: 'center' });
    
    // Student info section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Student Information', 20, 60);
    
    const studentInfo = [
      ['Name', student.name || 'Not Available'],
      ['Roll Number', student.rollNo || 'Not Assigned'],
      ['Class', `${student.year}${parseInt(student.year) <= 2 ? 'st' : parseInt(student.year) === 2 ? 'nd' : parseInt(student.year) === 3 ? 'rd' : 'th'} ${parseInt(student.year) <= 2 ? 'PU' : 'Year'} ${student.courseDivision || ''}`],
      ['Section', student.batch || 'Not Assigned'],
      ['Date of Birth', student.dob ? new Date(student.dob).toLocaleDateString() : 'Not Available'],
      ['Father\'s Name', student.fatherName || 'Not Available'],
      ['Mother\'s Name', student.motherName || 'Not Available'],
      ['Blood Group', student.bloodGroup || 'Not Available'],
      ['Contact 1', student.contact1 || 'Not Available'],
      ['Contact 2', student.contact2 || 'Not Available'],
      ['Address', student.address || 'Not Available']
    ];

    autoTable(doc, {
      startY: 65,
      head: [['Field', 'Value']],
      body: studentInfo,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Attendance summary
    let currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Attendance Summary', 20, currentY);
    
    const attendanceSummary = [
      ['Total Classes', attendanceStats.totalClasses.toString()],
      ['Classes Conducted', attendanceStats.conductedClasses.toString()],
      ['Present', attendanceStats.presentClasses.toString()],
      ['Absent', attendanceStats.absentClasses.toString()],
      ['On Leave', attendanceStats.leaveClasses.toString()],
      ['Attendance %', `${attendanceStats.attendancePercentage}% (Present/Conducted)`]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Metric', 'Count']],
      body: attendanceSummary,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113] },
      styles: { fontSize: 10 }
    });

    // Namaz attendance with visual circles and prayer-wise breakdown
    currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Namaz Attendance Overview', 20, currentY);
    
    // Prayer-wise breakdown table
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    const prayerBreakdown = prayers.map(prayer => {
      const prayerRecords = namazRecords.filter(record => record.prayer === prayer);
      const presentCount = prayerRecords.filter(record => record.status === 'present').length;
      const totalCount = prayerRecords.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      
      return [
        prayer.charAt(0).toUpperCase() + prayer.slice(1),
        presentCount.toString(),
        totalCount.toString(),
        `${percentage}%`
      ];
    });

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Prayer', 'Present', 'Total', 'Percentage']],
      body: prayerBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [155, 89, 182] },
      styles: { fontSize: 10, halign: 'center' },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        3: { fontStyle: 'bold' }
      }
    });

    // Overall namaz summary
    currentY = (doc as any).lastAutoTable.finalY + 10;
    const totalNamazExpected = namazRecords.length;
    const totalNamazPresent = namazRecords.filter(record => record.status === 'present').length;
    const totalNamazAbsent = namazRecords.filter(record => record.status === 'absent').length;
    const completionRate = totalNamazExpected > 0 ? Math.round((totalNamazPresent / totalNamazExpected) * 100) : 0;
    
    const namazOverallSummary = [
      ['Total Namaz Expected', totalNamazExpected.toString()],
      ['Present', totalNamazPresent.toString()],
      ['Absent', totalNamazAbsent.toString()],
      ['Completion Rate', `${completionRate}%`]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Summary', 'Count']],
      body: namazOverallSummary,
      theme: 'grid',
      headStyles: { fillColor: [142, 68, 173] },
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        1: { halign: 'center', fontStyle: 'bold' }
      }
    });

    // Academic Performance Overview (only percentages)
    currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Academic Performance Overview', 20, currentY);
    
    const performanceOverview = [
      ['Class Attendance Rate', `${attendanceStats.attendancePercentage}%`],
      ['Namaz Completion Rate', `${namazStats.completionPercentage}%`],
      ['Total Classes Attended', `${attendanceStats.presentClasses}/${attendanceStats.totalClasses}`],
      ['Total Prayers Completed', `${namazStats.completedPrayers}/${namazStats.totalPrayers}`]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Performance Metric', 'Result']],
      body: performanceOverview,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Leave records section (always shown)
    currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Leave Management', 20, currentY);
    
    // Leave statistics
    const filteredLeaves = filterByDate(leaveRecords, 'fromDate');
    const totalLeaves = filteredLeaves.length;
    const activeLeaves = filteredLeaves.filter(leave => leave.status === 'active').length;
    const completedLeaves = filteredLeaves.filter(leave => leave.status === 'completed').length;
    const totalLeaveDays = filteredLeaves.reduce((total, leave) => {
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    // Leave summary table
    const leaveSummary = [
      ['Total Leave Applications', totalLeaves.toString()],
      ['Active Leaves', activeLeaves.toString()],
      ['Completed Leaves', completedLeaves.toString()],
      ['Total Leave Days', totalLeaveDays.toString()]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Leave Summary', 'Count']],
      body: leaveSummary,
      theme: 'grid',
      headStyles: { fillColor: [243, 156, 18] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Individual leave records
    if (filteredLeaves.length > 0) {
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.text('Leave History', 20, currentY);
      
      const leaves = filteredLeaves
        .map(leave => {
          const fromDate = new Date(leave.fromDate);
          const toDate = new Date(leave.toDate);
          const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return [
            fromDate.toLocaleDateString(),
            toDate.toLocaleDateString(),
            leave.reason,
            leave.status,
            `${days} day${days !== 1 ? 's' : ''}`,
            new Date(leave.createdAt).toLocaleDateString()
          ];
        });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['From Date', 'To Date', 'Reason', 'Status', 'Duration', 'Applied On']],
        body: leaves,
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 }
        }
      });
    } else {
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('No leave records found for the selected period.', 20, currentY);
      doc.setTextColor(40, 40, 40); // Reset color
    }

    // Remarks section
    const filteredRemarks = filterByDate(remarkRecords, 'createdAt');
    if (filteredRemarks.length > 0) {
      currentY = (doc as any).lastAutoTable.finalY + 20;
      
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Teacher Remarks', 20, currentY);
      
      const remarks = filteredRemarks
        .slice(0, 20) // Limit to recent 20 remarks
        .map(remark => [
          new Date(remark.createdAt).toLocaleDateString(),
          remark.category || 'General',
          remark.content
        ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Category', 'Remark']],
        body: remarks,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 'auto' }
        }
      });
    }

    // Summary and Report Notes
    currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // Check if we need a new page
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Report Summary', 20, currentY);
    
    const reportSummary = [
      ['Total Attendance Records', attendanceRecords.length.toString()],
      ['Total Namaz Records', namazRecords.length.toString()],
      ['Total Leave Records', leaveRecords.length.toString()],
      ['Total Remarks', remarkRecords.length.toString()],
      ['Report Generated', new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString()],
      ['Data Source', 'Live Database - All data is authentic and real-time']
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Report Information', 'Details']],
      body: reportSummary,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(`${student.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification("PDF report downloaded successfully!", "success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white p-4 bg-[#005c83]">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Student Profile</h1>
        </div>

        {/* Student Header Card */}
        <div className="bg-white rounded-lg p-4 text-gray-900">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Roll: {student.rollNo}
                </Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {student.year}#{parseInt(student.year) <= 2 ? 'st' : parseInt(student.year) === 2 ? 'nd' : parseInt(student.year) === 3 ? 'rd' : 'th'} {parseInt(student.year) <= 2 ? 'PU' : 'Year'} {student.courseDivision || ''}
                </Badge>
                {student.batch && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Section {student.batch}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>DOB: {new Date(student.dob).toLocaleDateString()}</span>
                </div>
                {student.bloodGroup && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>Blood: {student.bloodGroup}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Summary Stats */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Academic Overview</h3>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={generatePDFReport}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 hover:bg-teacher-dark text-white bg-[#005c83]"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceStats.attendancePercentage}%</div>
                <div className="text-sm text-gray-600">Attendance Rate</div>
                <div className="text-xs text-gray-500 mt-1">
                  {attendanceStats.presentClasses}/{attendanceStats.conductedClasses} classes
                </div>
                {attendanceStats.leaveClasses > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    ({attendanceStats.leaveClasses} on leave excluded)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{namazStats.completionPercentage}%</div>
                <div className="text-sm text-gray-600">Namaz Rate</div>
                <div className="text-xs text-gray-500 mt-1">
                  {namazStats.completedPrayers}/{namazStats.totalPrayers} prayers
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="remarks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="remarks">Remarks</TabsTrigger>
            <TabsTrigger value="leaves">Leaves</TabsTrigger>
          </TabsList>



          <TabsContent value="remarks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teacher Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                {filterByDate(remarkRecords, 'createdAt').length > 0 ? (
                  <div className="space-y-3">
                    {filterByDate(remarkRecords, 'createdAt')
                      .slice(0, 20)
                      .map((remark) => (
                        <div
                          key={remark.id}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{remark.category}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(remark.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{remark.content}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No remarks found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leave History</CardTitle>
              </CardHeader>
              <CardContent>
                {filterByDate(leaveRecords, 'fromDate').length > 0 ? (
                  <div className="space-y-3">
                    {filterByDate(leaveRecords, 'fromDate')
                      .map((leave) => {
                        const days = Math.ceil(
                          (new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) / (1000 * 60 * 60 * 24)
                        ) + 1;
                        
                        return (
                          <div
                            key={leave.id}
                            className="p-4 bg-gray-50 rounded-lg border-l-4 border-orange-400"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">
                                {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                              </div>
                              <Badge variant="outline">{days} day{days !== 1 ? 's' : ''}</Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{leave.reason}</p>
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={leave.status === 'active' ? 'default' : 'secondary'}
                              >
                                {leave.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Submitted: {new Date(leave.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No leave records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}