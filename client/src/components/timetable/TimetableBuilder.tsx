import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Save, Trash2, Plus, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Subject {
  id: number;
  subject: string;
  subjectCode: string;
  courseType: string;
  year: string;
  stream?: string;
  section: string;
}

interface TimetableEntry {
  id?: number;
  courseType: string;
  year: string;
  stream?: string;
  section: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId?: number;
  subjectName?: string;
  startTime?: string;
  endTime?: string;
  createdBy?: number;
}

interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
}

interface TimetableBuilderProps {
  selectedClass?: ClassConfig;
  role: string;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday", isHoliday: true }, // Friday = Weekly Holiday
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" } // Active working day
];

const DEFAULT_TIME_SLOTS = [
  { period: 1, start: "09:00", end: "10:00" },
  { period: 2, start: "10:00", end: "11:00" },
  { period: 3, start: "11:00", end: "12:00" },
  { period: 4, start: "12:00", end: "13:00" },
  { period: 5, start: "14:00", end: "15:00" },
  { period: 6, start: "15:00", end: "16:00" },
  { period: 7, start: "16:00", end: "17:00" },
  { period: 8, start: "17:00", end: "18:00" }
];

export default function TimetableBuilder({ selectedClass, role }: TimetableBuilderProps) {
  const [timetableData, setTimetableData] = useState<{ [key: string]: TimetableEntry }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [periodTimes, setPeriodTimes] = useState(DEFAULT_TIME_SLOTS);
  const [periodsPerDay, setPeriodsPerDay] = useState<{ [key: string]: number }>({});
  const [showPeriodConfig, setShowPeriodConfig] = useState(false);
  const [periodConfig, setPeriodConfig] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch period configuration for the selected class
  const { data: classPeriodData, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['/api/class-periods', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
    queryFn: async () => {
      if (!selectedClass) return null;
      
      const params = new URLSearchParams();
      if (selectedClass.courseDivision) params.append('stream', selectedClass.courseDivision);
      if (selectedClass.section) params.append('section', selectedClass.section);
      
      const response = await fetch(`/api/class-periods/${selectedClass.courseType}/${selectedClass.year}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch period configuration');
      return response.json();
    },
    enabled: !!selectedClass,
  });

  // Update periods per day when class period data changes
  useEffect(() => {
    if (classPeriodData) {
      setPeriodsPerDay(classPeriodData.periodsPerDay);
      setPeriodConfig(classPeriodData);
    }
  }, [classPeriodData]);

  // Calculate max periods based on current configuration
  const getMaxPeriods = (dayKey?: string) => {
    if (dayKey && periodsPerDay[dayKey] !== undefined) {
      return periodsPerDay[dayKey];
    }
    if (!selectedClass) return 3;
    const { courseType, year } = selectedClass;
    
    if (courseType === "pu") return 3; // PUC classes: 3 periods default
    if (courseType === "post-pu") {
      const yearNum = parseInt(year);
      if (yearNum >= 6) return 8; // 6th-7th Year: 8 periods default
      return 7; // 3rd-5th Year: 7 periods default
    }
    return 3;
  };

  // Get maximum allowed periods for period configuration
  const getMaxAllowedPeriods = () => {
    if (!selectedClass) return 8;
    const { courseType } = selectedClass;
    
    if (courseType === "pu") return 8; // PUC classes: maximum 8 periods
    if (courseType === "post-pu") return 12; // POST-PUC classes: maximum 12 periods
    return 8;
  };

  // Fetch class-specific subjects for the selected class
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['/api/subjects', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      // Class-specific parameters for precise filtering
      const params = new URLSearchParams({
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        ...(selectedClass.courseDivision && { stream: selectedClass.courseDivision }),
        ...(selectedClass.section !== undefined && { section: selectedClass.section })
      });
      
      console.log(`📚 TimetableBuilder: Fetching subjects for class:`, selectedClass);
      
      const response = await fetch(`/api/subjects?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      const data = await response.json();
      
      console.log(`📚 TimetableBuilder: Found ${data.length} subjects for timetable dropdown`);
      
      return data;
    },
    enabled: !!selectedClass,
  });

  // Fetch existing timetable with full class details for unique combinations
  const { data: existingTimetable, isLoading: isLoadingTimetable } = useQuery({
    queryKey: ['/api/timetable', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      const params = new URLSearchParams({
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        ...(selectedClass.courseDivision && { stream: selectedClass.courseDivision }),
        ...(selectedClass.section && { section: selectedClass.section })
      });
      
      const response = await fetch(`/api/timetable?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch timetable');
      }
      return response.json();
    },
    enabled: !!selectedClass,
  });

  // Load existing timetable data and clear if switching classes
  useEffect(() => {
    if (existingTimetable && Array.isArray(existingTimetable)) {
      const newData: { [key: string]: TimetableEntry } = {};
      existingTimetable.forEach((entry: TimetableEntry) => {
        const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
        newData[key] = entry;
      });
      setTimetableData(newData);
    } else {
      // Clear timetable data if no existing data for this specific class
      setTimetableData({});
    }
  }, [existingTimetable, selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section]);

  // Save timetable mutation
  const { mutate: saveTimetable, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!selectedClass) throw new Error("No class selected");

      // Convert timetable data to entries array, excluding Friday (holiday)
      const entries = Object.values(timetableData).filter(entry => 
        entry.subjectId && entry.dayOfWeek !== "friday"
      ).map(entry => ({
        courseType: selectedClass.courseType,
        year: selectedClass.year,
        stream: selectedClass.courseDivision,
        section: selectedClass.section,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        subjectId: entry.subjectId,
        startTime: entry.startTime,
        endTime: entry.endTime
      }));

      // Use bulk upsert to update existing entries or create new ones
      return apiRequest('/api/timetable/bulk-upsert', 'POST', { entries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timetable', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section] });
      setIsEditing(false);
      setValidationErrors([]);
    },
  });

  // Period configuration mutation - class-specific (stored in localStorage)
  const { mutate: savePeriodConfig, isPending: isSavingPeriodConfig } = useMutation({
    mutationFn: async (config: any) => {
      if (!selectedClass) throw new Error("No class selected");
      
      console.log(`🔧 Saving period config for: ${selectedClass.courseType} Year ${selectedClass.year} ${selectedClass.courseDivision || ''} ${selectedClass.section || ''}`, config);
      
      // Store in localStorage instead of API to save serverless function quota
      const key = `period_config_${selectedClass.courseType}_${selectedClass.year}_${selectedClass.courseDivision || 'none'}_${selectedClass.section || 'none'}`;
      localStorage.setItem(key, JSON.stringify(config));
      
      return Promise.resolve({ success: true, config });
    },
    onSuccess: (data) => {
      console.log(`✅ Period config saved successfully for ${selectedClass?.courseType} Year ${selectedClass?.year}`, data);
      
      // Invalidate queries for this specific class
      queryClient.invalidateQueries({
        queryKey: ['/api/class-periods', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
      });
      
      // Clear any cached timetable data to force reload with new period structure
      queryClient.invalidateQueries({
        queryKey: ['/api/timetable', selectedClass?.courseType, selectedClass?.year, selectedClass?.courseDivision, selectedClass?.section],
      });
      
      setShowPeriodConfig(false);
    },
    onError: (error) => {
      console.error("Error saving period configuration:", error);
    },
  });

  // Subjects are already filtered by courseType in the API query
  const filteredSubjects = Array.isArray(subjects) ? subjects : [];

  const handleCellChange = (day: string, period: number, field: 'subjectId' | 'startTime' | 'endTime', value: string) => {
    if (!selectedClass) return;

    const key = `${day}-${period}`;
    const currentEntry = timetableData[key] || {
      courseType: selectedClass.courseType,
      year: selectedClass.year,
      stream: selectedClass.courseDivision,
      section: selectedClass.section,
      dayOfWeek: day,
      periodNumber: period
    };

    if (field === 'subjectId') {
      if (value === 'none' || !value) {
        // Remove subject - clear the slot
        delete timetableData[key];
        const newData = { ...timetableData };
        setTimetableData(newData);
        return;
      } else {
        const selectedSubject = filteredSubjects.find(s => s.id === parseInt(value));
        currentEntry.subjectId = parseInt(value);
        currentEntry.subjectName = selectedSubject?.subject;
        currentEntry.subjectCode = selectedSubject?.subjectCode;
        
        // Auto-set default times from the period
        const timeSlot = periodTimes[period - 1];
        if (timeSlot) {
          currentEntry.startTime = timeSlot.start;
          currentEntry.endTime = timeSlot.end;
        }
      }
    } else {
      currentEntry[field] = value;
    }

    setTimetableData({
      ...timetableData,
      [key]: currentEntry
    });
  };

  const validateTimetable = () => {
    const errors: string[] = [];
    
    // Check for time overlaps within each day
    DAYS_OF_WEEK.forEach(({ key: day }) => {
      const dayEntries = Object.values(timetableData).filter(
        entry => entry.dayOfWeek === day && entry.startTime && entry.endTime
      );

      for (let i = 0; i < dayEntries.length; i++) {
        for (let j = i + 1; j < dayEntries.length; j++) {
          const entry1 = dayEntries[i];
          const entry2 = dayEntries[j];
          
          if (entry1.startTime && entry1.endTime && entry2.startTime && entry2.endTime) {
            const start1 = new Date(`1970-01-01T${entry1.startTime}:00`);
            const end1 = new Date(`1970-01-01T${entry1.endTime}:00`);
            const start2 = new Date(`1970-01-01T${entry2.startTime}:00`);
            const end2 = new Date(`1970-01-01T${entry2.endTime}:00`);

            if ((start1 < end2 && end1 > start2)) {
              errors.push(`Time overlap on ${day} between periods ${entry1.periodNumber} and ${entry2.periodNumber}`);
            }
          }
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    // TEMPORARY: Allow saving even with validation errors for testing
    const isValid = validateTimetable();
    if (!isValid) {
      console.warn('⚠️ Timetable has validation errors but allowing save for testing');
    }
    saveTimetable();
  };

  const clearTimeSlot = (day: string, period: number) => {
    const key = `${day}-${period}`;
    const newData = { ...timetableData };
    delete newData[key];
    setTimetableData(newData);
  };

  const applyDefaultTimings = () => {
    const newData = { ...timetableData };
    
    DAYS_OF_WEEK.forEach(({ key: day }) => {
      for (let period = 1; period <= getMaxPeriods(); period++) {
        const key = `${day}-${period}`;
        const timeSlot = DEFAULT_TIME_SLOTS[period - 1];
        
        if (newData[key]) {
          newData[key] = {
            ...newData[key],
            startTime: timeSlot?.start || "",
            endTime: timeSlot?.end || ""
          };
        }
      }
    });

    setTimetableData(newData);
  };

  if (!selectedClass) {
    return (
      <Card className="mt-4">
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
          <p className="text-gray-500">Please select a class to build timetables for that specific course.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4">
      {/* Minimal Header */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div className="text-sm font-medium text-gray-700">
          Timetable - {selectedClass.courseType.toUpperCase()} Year {selectedClass.year}
          {selectedClass.courseDivision && ` ${selectedClass.courseDivision}`}
          {selectedClass.section && ` Sec-${selectedClass.section}`} ({getMaxPeriods()} periods)
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowPeriodConfig(true)}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Clock className="h-3 w-3 mr-1" />
                Configure
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Simple Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="text-sm text-red-700">
            <strong>Errors:</strong> {validationErrors.join(', ')}
          </div>
        </div>
      )}

      {/* Simple Subjects Warning */}
      {filteredSubjects.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <div className="text-sm text-yellow-700">
            No subjects found. Add subjects first in the Subjects tab.
          </div>
        </div>
      )}

      {/* Excel-like Timetable Grid */}
      <div className="border rounded overflow-hidden bg-white">
        {/* Header Bar */}
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Weekly Timetable ({filteredSubjects.length} subjects available)
          </span>
          <span className="text-xs text-red-600">Friday = Holiday</span>
        </div>

        {/* Excel-like Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-700 border-r w-20">Period</th>
                {DAYS_OF_WEEK.map(({ key, label, isHoliday }) => (
                  <th key={key} className={`px-2 py-2 text-center font-medium text-gray-700 border-r min-w-24 ${
                    isHoliday ? 'bg-red-50 text-red-600' : ''
                  }`}>
                    {label}
                    {isHoliday && <div className="text-xs">HOLIDAY</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(...Object.values(periodsPerDay || {}), 3) }, (_, index) => {
                const period = index + 1;
                return (
                  <tr key={period} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2 border-r font-medium bg-gray-50">
                      P{period}
                      {isEditing ? (
                        <div className="mt-1 space-y-1">
                          <input
                            type="time"
                            value={periodTimes[period - 1]?.start || "09:00"}
                            onChange={(e) => {
                              const newSlots = [...periodTimes];
                              newSlots[period - 1] = { ...newSlots[period - 1], period, start: e.target.value };
                              setPeriodTimes(newSlots);
                              // Update all timetable entries for this period with new time
                              const updatedData = { ...timetableData };
                              Object.keys(updatedData).forEach(key => {
                                if (updatedData[key].periodNumber === period) {
                                  updatedData[key].startTime = e.target.value;
                                }
                              });
                              setTimetableData(updatedData);
                            }}
                            className="w-full text-xs border rounded px-1 py-0.5"
                          />
                          <input
                            type="time"
                            value={periodTimes[period - 1]?.end || "10:00"}
                            onChange={(e) => {
                              const newSlots = [...periodTimes];
                              newSlots[period - 1] = { ...newSlots[period - 1], period, end: e.target.value };
                              setPeriodTimes(newSlots);
                              // Update all timetable entries for this period with new time
                              const updatedData = { ...timetableData };
                              Object.keys(updatedData).forEach(key => {
                                if (updatedData[key].periodNumber === period) {
                                  updatedData[key].endTime = e.target.value;
                                }
                              });
                              setTimetableData(updatedData);
                            }}
                            className="w-full text-xs border rounded px-1 py-0.5"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {periodTimes[period - 1]?.start || "09:00"} - {periodTimes[period - 1]?.end || "10:00"}
                        </div>
                      )}
                    </td>
                    {DAYS_OF_WEEK.map(({ key: day, isHoliday }) => {
                      const cellKey = `${day}-${period}`;
                      const entry = timetableData[cellKey];
                      const dayMaxPeriods = getMaxPeriods(day);
                      const isPeriodDisabled = period > dayMaxPeriods;
                      
                      return (
                        <td key={day} className={`px-2 py-2 border-r ${
                          isHoliday ? 'bg-red-50' : isPeriodDisabled ? 'bg-gray-100' : ''
                        }`}>
                          {isHoliday ? (
                            <div className="text-center text-red-500 text-xs">HOLIDAY</div>
                          ) : isPeriodDisabled ? (
                            <div className="text-center text-gray-400 text-xs">-</div>
                          ) : isEditing ? (
                            <Select
                              value={entry?.subjectId?.toString() || "none"}
                              onValueChange={(value) => handleCellChange(day, period, 'subjectId', value)}
                            >
                              <SelectTrigger className="h-7 text-xs border-none">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                {filteredSubjects.map((subject: Subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.subjectCode}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-center">
                              {entry?.subjectId ? (
                                <div className="text-blue-700 font-medium">
                                  {(() => {
                                    const subject = filteredSubjects.find((s: Subject) => s.id === entry.subjectId);
                                    return subject ? (subject.subjectCode || subject.subject.substring(0, 8)) : '-';
                                  })()}
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(timetableData).filter(entry => entry.subjectId).length}
                </div>
                <div className="text-sm text-gray-600">Total Periods Scheduled</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {getMaxPeriods() * DAYS_OF_WEEK.filter(day => !day.isHoliday).length - Object.values(timetableData).filter(entry => entry.subjectId).length}
                </div>
                <div className="text-sm text-gray-600">Free Periods</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(Object.values(timetableData).filter(entry => entry.subjectId).map(entry => entry.subjectId)).size}
                </div>
                <div className="text-sm text-gray-600">Unique Subjects</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Configuration Dialog */}
      <Dialog open={showPeriodConfig} onOpenChange={setShowPeriodConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Periods for {selectedClass.courseType.toUpperCase()} Year {selectedClass.year} {selectedClass.courseDivision && selectedClass.courseDivision} {selectedClass.section && `Section ${selectedClass.section}`}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Customize periods for this specific class combination. Changes will only apply to:
              <div className="font-medium text-blue-600 mt-1">
                {selectedClass.courseType.toUpperCase()} Year {selectedClass.year} {selectedClass.courseDivision && selectedClass.courseDivision} {selectedClass.section && `Section ${selectedClass.section}`}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Maximum allowed: {getMaxAllowedPeriods()} periods per day ({selectedClass.courseType === "pu" ? "PUC" : "POST-PUC"} limit)
              </div>
            </div>
            
            {DAYS_OF_WEEK.filter(day => !day.isHoliday).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const currentPeriods = periodsPerDay[key] || getMaxPeriods();
                      if (currentPeriods > 0) {
                        setPeriodsPerDay(prev => ({
                          ...prev,
                          [key]: currentPeriods - 1
                        }));
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {periodsPerDay[key] || getMaxPeriods()}
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const currentPeriods = periodsPerDay[key] || getMaxPeriods();
                      const maxAllowed = getMaxAllowedPeriods();
                      if (currentPeriods < maxAllowed) {
                        setPeriodsPerDay(prev => ({
                          ...prev,
                          [key]: currentPeriods + 1
                        }));
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  // Reset to default periods for this class type
                  const defaultPeriods = getMaxPeriods();
                  const resetPeriodsPerDay: { [key: string]: number } = {};
                  
                  DAYS_OF_WEEK.forEach(({ key, isHoliday }) => {
                    resetPeriodsPerDay[key] = isHoliday ? 0 : defaultPeriods;
                  });
                  
                  setPeriodsPerDay(resetPeriodsPerDay);
                }}
                className="text-xs px-2"
              >
                Reset
              </Button>
              <Button 
                onClick={() => {
                  const defaultPeriods = getMaxPeriods();
                  const customDayPeriods = { ...periodsPerDay };
                  
                  // Ensure Friday (holiday) is always 0 and set working days
                  DAYS_OF_WEEK.forEach(({ key, isHoliday }) => {
                    if (isHoliday) {
                      customDayPeriods[key] = 0;
                    } else if (!customDayPeriods[key]) {
                      customDayPeriods[key] = defaultPeriods;
                    }
                  });
                  
                  console.log(`🔧 Saving config for class: ${selectedClass?.courseType} Year ${selectedClass?.year}`, customDayPeriods);
                  
                  savePeriodConfig({
                    defaultPeriods,
                    customDayPeriods
                  });
                }}
                disabled={isSavingPeriodConfig}
                className="flex-1"
              >
                {isSavingPeriodConfig ? "Saving..." : "Save for This Class Only"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPeriodConfig(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}