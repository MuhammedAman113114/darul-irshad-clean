import React, { useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  rollNo: string;
  courseType: string;
  year: number;
  section?: string;
}

interface InteractiveHistoryViewProps {
  historyFilters: {
    startDate: string;
    endDate: string;
    selectedPrayer: string;
  };
  filteredStudents: Student[];
}

export default function InteractiveHistoryView({ historyFilters, filteredStudents }: InteractiveHistoryViewProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [selectedPrayerForDate, setSelectedPrayerForDate] = useState<string | null>(null);

  // Get actual namaz history from localStorage
  const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
  const allHistoryData: any[] = [];
  
  // Debug logging
  const allNamazKeys = Object.keys(localStorage).filter(key => key.startsWith('namaz_'));
  console.log('🔍 All Namaz localStorage keys:', allNamazKeys);
  console.log('📅 History filters:', historyFilters);
  
  allNamazKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      console.log(`📊 Data in ${key}:`, data);
    } catch (e) {
      console.error(`❌ Error parsing ${key}:`, e);
    }
  });
  
  prayers.forEach(prayer => {
    if (historyFilters.selectedPrayer === 'all' || historyFilters.selectedPrayer === prayer) {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`namaz_${prayer}_`)
      );
      
      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          console.log(`📋 Processing key: ${key}`, data);
          
          // Handle both array format and object format
          if (Array.isArray(data)) {
            data.forEach(record => {
              const recordDate = record.date;
              const startDateFilter = historyFilters.startDate || '2000-01-01';
              const endDateFilter = historyFilters.endDate || '2099-12-31';
              
              if (recordDate >= startDateFilter && recordDate <= endDateFilter) {
                allHistoryData.push({
                  ...record,
                  prayer
                });
              }
            });
          } else if (data && typeof data === 'object' && data.date) {
            // Handle object format with nested students array
            const recordDate = data.date;
            const startDateFilter = historyFilters.startDate || '2000-01-01';
            const endDateFilter = historyFilters.endDate || '2099-12-31';
            
            if (recordDate >= startDateFilter && recordDate <= endDateFilter) {
              // If data has students array, process each student
              if (data.students && Array.isArray(data.students)) {
                data.students.forEach((student: any) => {
                  allHistoryData.push({
                    studentId: student.id, // Use 'id' not 'studentId'
                    status: student.status,
                    date: data.date,
                    prayer: prayer,
                    createdAt: data.timestamp || data.createdAt || new Date().toISOString()
                  });
                });
              }
            }
          }
        } catch (error) {
          console.error('Error parsing history data:', error);
        }
      });
    }
  });

  // Group by date
  const groupedByDate = new Map();
  allHistoryData.forEach(record => {
    if (!groupedByDate.has(record.date)) {
      groupedByDate.set(record.date, {
        date: record.date,
        prayers: new Map(),
        totalMarked: 0
      });
    }
    
    const dateGroup = groupedByDate.get(record.date);
    if (!dateGroup.prayers.has(record.prayer)) {
      dateGroup.prayers.set(record.prayer, []);
    }
    dateGroup.prayers.get(record.prayer).push(record);
    dateGroup.totalMarked += 1;
  });

  const sortedDates = Array.from(groupedByDate.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No history found for the selected filters</p>
        <p className="text-xs mt-1">Try adjusting the date range or prayer selection</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {sortedDates.map((dateGroup) => {
        const isDateExpanded = expandedDate === dateGroup.date;
        const dateObj = new Date(dateGroup.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        return (
          <div key={dateGroup.date} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            {/* 📅 Daily Block Layout - Date Box */}
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b"
              onClick={() => setExpandedDate(isDateExpanded ? null : dateGroup.date)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {isDateExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">{formattedDate}</h3>
                    <p className="text-sm text-gray-600">{dayName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-emerald-600">
                    {dateGroup.totalMarked} prayers marked
                  </div>
                  <div className="text-xs text-gray-500">
                    {Array.from(dateGroup.prayers.keys()).length}/5 prayers
                  </div>
                </div>
              </div>
            </div>
            
            {/* 🧭 Expandable Prayer Blocks */}
            {isDateExpanded && (
              <div className="p-4 space-y-3">
                {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].map((prayerName) => {
                  const prayerRecords = dateGroup.prayers.get(prayerName) || [];
                  const isMarked = prayerRecords.length > 0;
                  const isPrayerExpanded = selectedPrayerForDate === prayerName;
                  
                  // Calculate attendance stats
                  const presentCount = prayerRecords.filter((r: any) => r.status === 'present').length;
                  const totalCount = prayerRecords.length;
                  
                  return (
                    <div key={prayerName} className="border rounded-lg overflow-hidden">
                      {/* Prayer Header - Clickable Mini-box with Status Indicator */}
                      <div 
                        className={`p-3 cursor-pointer transition-colors ${
                          isPrayerExpanded ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        } ${!isMarked ? 'opacity-50' : ''}`}
                        onClick={() => {
                          if (isMarked) {
                            setSelectedPrayerForDate(isPrayerExpanded ? null : prayerName);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {prayerName === 'fajr' && '🌅'}
                              {prayerName === 'zuhr' && '☀️'}
                              {prayerName === 'asr' && '🌇'}
                              {prayerName === 'maghrib' && '🌆'}
                              {prayerName === 'isha' && '🌙'}
                              <span className="font-medium text-gray-800 capitalize">
                                {prayerName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isMarked && (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                presentCount === totalCount 
                                  ? 'bg-green-100 text-green-800'
                                  : presentCount > totalCount / 2
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {presentCount}/{totalCount} Present
                              </div>
                            )}
                            {!isMarked && (
                              <div className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                Not Marked
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 👆 Student List - Scrollable for 200+ students */}
                      {isPrayerExpanded && prayerRecords.length > 0 && (
                        <div className="border-t bg-gray-50 p-3">
                          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <div className="space-y-2 pr-2">
                              {prayerRecords.map((record: any, index: number) => {
                                const student = filteredStudents.find(s => s.id === record.studentId);
                                return (
                                  <div key={index} className={`p-3 rounded-lg text-sm flex justify-between items-center transition-colors ${
                                    record.status === 'present' 
                                      ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                                      : record.status === 'leave'
                                      ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                                      : 'bg-red-50 border border-red-200 hover:bg-red-100'
                                  }`}>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800">
                                        {student?.name || 'Unknown Student'}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {student?.rollNo && `Roll: ${student.rollNo}`}
                                        {student?.courseType && ` | ${student.courseType.toUpperCase()}`}
                                        {student?.year && ` ${student.year}`}
                                        {student?.section && ` ${student.section}`}
                                      </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                                      record.status === 'present'
                                        ? 'bg-green-600 text-white'
                                        : record.status === 'leave'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}>
                                      {record.status === 'present' ? 'Present' : 
                                       record.status === 'leave' ? 'Leave' : 'Absent'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}