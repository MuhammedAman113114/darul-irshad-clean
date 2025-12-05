// Enhanced multi-period attendance export utility
export const exportAttendanceToExcel = async (
  sheetData: any[],
  sheetMonth: string,
  courseType: string,
  year: string,
  courseDivision?: string,
  section?: string
) => {
  if (sheetData.length === 0) {
    console.log("No data to export");
    return;
  }

  try {
    // Dynamic import of XLSX
    const XLSX = await import('xlsx');
    
    const [yearNum, monthNum] = sheetMonth.split('-');
    const daysInMonth = new Date(parseInt(yearNum), parseInt(monthNum), 0).getDate();
    const monthName = new Date(parseInt(yearNum), parseInt(monthNum) - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
    
    // Ensure we only show dates within the selected month
    const selectedYear = parseInt(yearNum);
    const selectedMonth = parseInt(monthNum);
    
    // Load holidays for holiday integration
    let holidays: any[] = [];
    try {
      const holidaysResponse = await fetch('/api/holidays?isDeleted=false');
      if (holidaysResponse.ok) {
        holidays = await holidaysResponse.json();
        console.log(`📅 EXCEL EXPORT: Loaded ${holidays.length} holidays for integration`);
      }
    } catch (error) {
      console.warn('Could not load holidays for Excel export:', error);
    }
    
    // Load timetable data for class scheduling check  
    let timetableData: any[] = [];
    try {
      const timetableParams = new URLSearchParams({
        courseType,
        year,
        courseDivision: courseDivision || '',
        section: section || ''
      });
      const timetableResponse = await fetch(`/api/timetable?${timetableParams}`);
      if (timetableResponse.ok) {
        timetableData = await timetableResponse.json();
        console.log(`🗓️ EXCEL EXPORT: Loaded ${timetableData.length} timetable entries for class scheduling check`);
      }
    } catch (error) {
      console.warn('Could not load timetable data for Excel export:', error);
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Class info for headers
    const classInfo = `${courseType?.toUpperCase()} - ${year}${courseDivision ? ` ${courseDivision.toUpperCase()}` : ''} ${section ? ` Section ${section}` : ''}`;
    
    // Define periods based on course type
    let periods: {id: string, name: string}[] = [];
    if (courseType === 'pu') {
      periods = [
        { id: '1', name: 'Period 1' },
        { id: '2', name: 'Period 2' },
        { id: '3', name: 'Period 3' }
      ];
    } else {
      // Post-PU has more periods
      const periodCount = (year === '6' || year === '7') ? 8 : 6;
      periods = Array.from({ length: periodCount }, (_, i) => ({
        id: (i + 1).toString(),
        name: `Period ${i + 1}`
      }));
    }

    // Fetch attendance data from database for period-specific data
    const startDate = `${yearNum}-${monthNum.padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${monthNum.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    
    let attendanceRecords: any[] = [];
    try {
      const response = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}&courseType=${courseType}&year=${year}&courseDivision=${courseDivision || ''}&section=${section || ''}`);
      if (response.ok) {
        attendanceRecords = await response.json();
      }
    } catch (error) {
      console.warn('Could not fetch attendance records for period-specific export:', error);
    }

    // Create attendance lookup map
    const attendanceMap = new Map<string, string>();
    attendanceRecords.forEach((record: any) => {
      const key = `${record.studentId}_${record.date}_${record.period}`;
      attendanceMap.set(key, record.status);
    });

    // Create a sheet for each period
    periods.forEach(period => {
      const wsData: any[][] = [];
      
      // Header
      wsData.push([`${monthName} - ${classInfo} - ${period.name} Attendance`]);
      wsData.push([]); // Empty row
      
      // Column headers - Generate headers for selected month only
      const headerRow = ['No.', 'Student Name'];
      const actualDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate(); // Get actual days in the month
      
      for (let day = 1; day <= actualDaysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        headerRow.push(`${dayName}-${day.toString().padStart(2, '0')}`);
      }
      headerRow.push('Present', 'Absent', 'Leave', '%');
      wsData.push(headerRow);
      
      // Student rows for this period
      sheetData.forEach((studentRow, index) => {
        const dataRow = [
          index + 1,
          `${studentRow.name}${studentRow.rollNo ? ` (${studentRow.rollNo})` : ''}`
        ];
        
        let periodPresent = 0;
        let periodAbsent = 0;
        let periodLeave = 0;
        let periodTotal = 0;
        
        // Add attendance for each day in this specific period (using actual days in month)
        for (let day = 1; day <= actualDaysInMonth; day++) {
          const date = new Date(selectedYear, selectedMonth - 1, day);
          const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          
          let mark = '-';
          
          // CHECK FOR HOLIDAYS FIRST
          const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday
          const isWeeklyHoliday = dayOfWeek === 5; // Friday
          
          // Check for database holidays
          const holiday = holidays.find(h => h.date === dateStr && !h.isDeleted);
          let isHoliday = isWeeklyHoliday;
          
          if (holiday && !isWeeklyHoliday) {
            // Check if this course is affected by the holiday
            const affectedCourses = holiday.affectedCourses.map((course: string) => course.toLowerCase());
            const checkCourse = courseType ? courseType.toLowerCase() : '';
            
            isHoliday = affectedCourses.includes('all') || 
                       affectedCourses.includes(checkCourse) || 
                       (checkCourse === 'pu' && affectedCourses.includes('puc')) ||
                       (checkCourse === 'post-pu' && affectedCourses.includes('post-puc'));
            
            if (isHoliday) {
              console.log(`🎯 EXCEL EXPORT: Holiday detected for ${dateStr}: ${holiday.name}`);
            }
          }
          
          // Check if class is scheduled in timetable first
          const dayOfWeekForTimetable = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Check timetable for this specific day and period
          const timetableEntry = timetableData.find(entry => 
            entry.dayOfWeek === dayOfWeekForTimetable && 
            entry.period === parseInt(period.id)
          );
          
          // Class is scheduled if timetable entry exists and has a valid subject (not empty or '-')
          const hasClassScheduled = timetableEntry && 
            timetableEntry.subject && 
            timetableEntry.subject.trim() !== '' && 
            timetableEntry.subject.trim() !== '-';
          
          if (!hasClassScheduled) {
            mark = '-';
            console.log(`📅 EXCEL EXPORT: No class scheduled for ${dateStr} period ${period.id}`);
          } else if (isHoliday) {
            mark = 'H';
            console.log(`📅 EXCEL EXPORT: Marking holiday 'H' for date ${dateStr}`);
          } else {
            const attendanceKey = `${studentRow.id}_${dateStr}_${period.id}`;
            const attendanceStatus = attendanceMap.get(attendanceKey);
            
            if (attendanceStatus) {
              switch (attendanceStatus) {
                case 'present':
                  mark = 'P';
                  periodPresent++;
                  periodTotal++;
                  break;
                case 'absent':
                  mark = 'A';
                  periodAbsent++;
                  periodTotal++;
                  break;
                case 'on-leave':
                  mark = 'L';
                  periodLeave++;
                  periodTotal++;
                  break;
              }
            } else {
              // Fallback to general attendance data if no period-specific data
              if (studentRow.days && studentRow.days[day]) {
                mark = studentRow.days[day];
                if (mark === 'P') {
                  periodPresent++;
                  periodTotal++;
                } else if (mark === 'A') {
                  periodAbsent++;
                  periodTotal++;
                } else if (mark === 'L') {
                  periodLeave++;
                  periodTotal++;
                }
              }
            }
          }
          
          dataRow.push(mark);
        }
        
        // Add summary columns
        dataRow.push(periodPresent);
        dataRow.push(periodAbsent);
        dataRow.push(periodLeave);
        dataRow.push(periodTotal > 0 ? `${Math.round((periodPresent / periodTotal) * 100)}%` : '0%');
        
        wsData.push(dataRow);
      });
      
      // Add legend
      wsData.push([]);
      wsData.push(['Legend: P = Present, A = Absent, L = On Leave, H = Holiday, - = No Class Scheduled']);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 5 },  // No.
        { wch: 20 }, // Student Name
        ...Array(actualDaysInMonth).fill({ wch: 4 }), // Days
        { wch: 8 },  // Present
        { wch: 8 },  // Absent
        { wch: 8 },  // Leave
        { wch: 8 }   // Percentage
      ];
      ws['!cols'] = colWidths;
      
      // Add sheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, period.name);
    });

    // Create Summary Sheet
    const summaryData: any[][] = [];
    summaryData.push([`${monthName} - ${classInfo} - Summary`]);
    summaryData.push([]);
    
    // Summary headers
    const summaryHeaders = ['Student Name'];
    periods.forEach(period => summaryHeaders.push(period.name));
    summaryHeaders.push('Overall %');
    summaryData.push(summaryHeaders);
    
    // Summary student rows
    sheetData.forEach(studentRow => {
      const summaryRow = [`${studentRow.name}${studentRow.rollNo ? ` (${studentRow.rollNo})` : ''}`];
      
      let totalPresent = 0;
      let totalClasses = 0;
      
      // Calculate percentage for each period
      periods.forEach(period => {
        let periodPresent = 0;
        let periodTotal = 0;
        
        const actualDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        for (let day = 1; day <= actualDaysInMonth; day++) {
          const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const attendanceKey = `${studentRow.id}_${dateStr}_${period.id}`;
          const attendanceStatus = attendanceMap.get(attendanceKey);
          
          if (attendanceStatus) {
            periodTotal++;
            totalClasses++;
            if (attendanceStatus === 'present') {
              periodPresent++;
              totalPresent++;
            }
          }
        }
        
        const periodPercentage = periodTotal > 0 ? Math.round((periodPresent / periodTotal) * 100) : 0;
        summaryRow.push(`${periodPercentage}%`);
      });
      
      // Overall percentage
      const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
      summaryRow.push(`${overallPercentage}%`);
      
      summaryData.push(summaryRow);
    });
    
    // Create summary worksheet
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set summary column widths
    const summaryColWidths = [
      { wch: 20 }, // Student Name
      ...Array(periods.length).fill({ wch: 12 }), // Period columns
      { wch: 12 }  // Overall %
    ];
    summaryWs['!cols'] = summaryColWidths;
    
    // Add summary sheet to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Generate filename
    const filename = `${classInfo.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}_Enhanced_Export.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    console.log(`Exported attendance with ${periods.length} period sheets + summary for ${sheetData.length} students`);
    
  } catch (error) {
    console.error('Error exporting enhanced attendance sheet:', error);
  }
};