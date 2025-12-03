import { format, subDays, isWeekend, isBefore, isAfter, parseISO } from "date-fns";

export interface MissedClass {
  date: string;
  period: number;
  config: {
    courseType: string;
    year: string;
    courseDivision?: string;
    section: string;
  };
  reason: 'not_taken' | 'technical_issue' | 'holiday_not_marked';
  daysSinceClass: number;
}

export interface ClassConfig {
  courseType: string;
  year: string;
  courseDivision?: string;
  section: string;
  expectedPeriods: number;
}

export class MissedClassTracker {
  private readonly ATTENDANCE_PREFIX = 'attendance_';
  private readonly HOLIDAY_PREFIX = 'holiday_';

  // Get expected periods for each class configuration
  private getExpectedPeriods(courseType: string, year: string): number {
    if (courseType === 'pu') {
      if (['1', '2'].includes(year)) return 3; // PU 1st & 2nd year: 3 periods
      return 3; // All PU classes have 3 periods
    } else if (courseType === 'post-pu') {
      if (['3', '4', '5'].includes(year)) return 6; // Post-PUC 3rd-5th year: 6 periods
      if (['6', '7'].includes(year)) return 8; // Post-PUC 6th-7th year: 8 periods
      return 6; // Default for post-pu
    }
    return 3; // Default fallback
  }

  // Check if a specific date is a holiday
  private isHoliday(date: string): boolean {
    try {
      const holidayKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.HOLIDAY_PREFIX)
      );
      
      return holidayKeys.some(key => {
        const holidayData = localStorage.getItem(key);
        if (!holidayData) return false;
        
        try {
          const holiday = JSON.parse(holidayData);
          return holiday.date === date;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  // Get all working days from a start date to today (excluding weekends and holidays)
  private getWorkingDaysSince(startDate: string): string[] {
    const workingDays: string[] = [];
    const start = parseISO(startDate);
    const today = new Date();
    
    let currentDate = start;
    
    while (isBefore(currentDate, today) || currentDate.toDateString() === today.toDateString()) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (!isWeekend(currentDate)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Skip holidays
        if (!this.isHoliday(dateStr)) {
          workingDays.push(dateStr);
        }
      }
      
      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }

  // Check if attendance was taken for a specific class/period/date
  private isAttendanceTaken(config: ClassConfig, date: string, period: number): boolean {
    // Match the exact key format used when saving attendance
    const courseDivision = config.courseDivision || 'common';
    const section = config.section || 'single';
    const attendanceKey = `${this.ATTENDANCE_PREFIX}${config.courseType}_${config.year}_${courseDivision}_${section}_${date}_${period}_lecture`;
    return localStorage.getItem(attendanceKey) !== null;
  }

  // Get all unique class configurations from localStorage
  private getClassConfigurations(): ClassConfig[] {
    const configs = new Set<string>();
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.ATTENDANCE_PREFIX) && key.includes('_lecture')
    );
    
    keys.forEach(key => {
      // Format: attendance_courseType_year_division_section_date_period_lecture
      const parts = key.split('_');
      if (parts.length >= 7) {
        const courseType = parts[1];
        const year = parts[2];
        const courseDivision = parts[3];
        const section = parts[4];
        
        // Convert back from stored format to original format
        const originalCourseDivision = courseDivision === 'common' ? undefined : courseDivision;
        const originalSection = section === 'single' ? undefined : section;
        
        const configKey = `${courseType}_${year}_${courseDivision}_${section}`;
        configs.add(configKey);
      }
    });
    
    return Array.from(configs).map(configKey => {
      const [courseType, year, courseDivision, section] = configKey.split('_');
      return {
        courseType,
        year,
        courseDivision: courseDivision === 'common' ? undefined : courseDivision,
        section: section === 'single' ? 'A' : section, // Default section to 'A' if it was stored as 'single'
        expectedPeriods: this.getExpectedPeriods(courseType, year)
      };
    });
  }

  // Get the earliest date when attendance was ever taken
  private getFirstAttendanceDate(): string {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.ATTENDANCE_PREFIX) && key.includes('_lecture')
    );
    
    let earliestDate = format(new Date(), 'yyyy-MM-dd');
    
    keys.forEach(key => {
      // Format: attendance_courseType_year_division_section_date_period_lecture
      const parts = key.split('_');
      if (parts.length >= 7) {
        const date = parts[5];
        if (isBefore(parseISO(date), parseISO(earliestDate))) {
          earliestDate = date;
        }
      }
    });
    
    return earliestDate;
  }

  // Get all missed classes since the system started being used
  public getAllMissedClasses(): MissedClass[] {
    const missedClasses: MissedClass[] = [];
    const classConfigs = this.getClassConfigurations();
    
    if (classConfigs.length === 0) {
      // No attendance has ever been taken
      return [];
    }
    
    // Start checking from the first date attendance was ever taken
    const startDate = this.getFirstAttendanceDate();
    const workingDays = this.getWorkingDaysSince(startDate);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    classConfigs.forEach(config => {
      workingDays.forEach(date => {
        // For each expected period in the day
        for (let period = 1; period <= config.expectedPeriods; period++) {
          // Check if attendance was taken for this period
          if (!this.isAttendanceTaken(config, date, period)) {
            // Calculate days since this class was supposed to happen
            const daysSince = Math.floor(
              (new Date(today).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            missedClasses.push({
              date,
              period,
              config: {
                courseType: config.courseType,
                year: config.year,
                courseDivision: config.courseDivision,
                section: config.section
              },
              reason: daysSince === 0 ? 'not_taken' : 'not_taken',
              daysSinceClass: daysSince
            });
          }
        }
      });
    });
    
    // Sort by date (most recent first) and then by period
    return missedClasses.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.period - a.period;
    });
  }

  // Get missed classes for a specific class configuration
  public getMissedClassesForConfig(targetConfig: Partial<ClassConfig>): MissedClass[] {
    const allMissed = this.getAllMissedClasses();
    
    return allMissed.filter(missed => {
      return (
        (!targetConfig.courseType || missed.config.courseType === targetConfig.courseType) &&
        (!targetConfig.year || missed.config.year === targetConfig.year) &&
        (!targetConfig.courseDivision || missed.config.courseDivision === targetConfig.courseDivision) &&
        (!targetConfig.section || missed.config.section === targetConfig.section)
      );
    });
  }

  // Get summary statistics for missed classes
  public getMissedClassesSummary() {
    const allMissed = this.getAllMissedClasses();
    
    // Group by class configuration
    const byClass = new Map<string, MissedClass[]>();
    
    allMissed.forEach(missed => {
      const classKey = `${missed.config.courseType}_${missed.config.year}_${missed.config.courseDivision || ''}_${missed.config.section}`;
      if (!byClass.has(classKey)) {
        byClass.set(classKey, []);
      }
      byClass.get(classKey)!.push(missed);
    });
    
    // Calculate statistics
    const summary = Array.from(byClass.entries()).map(([classKey, missed]) => {
      const [courseType, year, courseDivision, section] = classKey.split('_');
      
      return {
        courseType,
        year,
        courseDivision: courseDivision || undefined,
        section,
        totalMissed: missed.length,
        oldestMissed: Math.max(...missed.map(m => m.daysSinceClass)),
        recentMissed: missed.filter(m => m.daysSinceClass <= 3).length,
        displayName: this.getClassDisplayName(courseType, year, courseDivision, section)
      };
    });
    
    return {
      totalMissedClasses: allMissed.length,
      classesWithMissedAttendance: summary.length,
      summary: summary.sort((a, b) => b.totalMissed - a.totalMissed)
    };
  }

  // Helper to get display name for a class
  private getClassDisplayName(courseType: string, year: string, courseDivision?: string, section?: string): string {
    const courseDisplay = courseType === 'pu' ? 'PU College' : 'Post-PUC';
    const yearDisplay = `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`;
    const divisionDisplay = courseDivision ? ` - ${courseDivision.charAt(0).toUpperCase() + courseDivision.slice(1)}` : '';
    const sectionDisplay = section ? ` - Section ${section}` : '';
    
    return `${courseDisplay} - ${yearDisplay}${divisionDisplay}${sectionDisplay}`;
  }

  // Mark a missed class as taken (when teacher takes attendance for a past date)
  public markMissedClassAsTaken(config: ClassConfig, date: string, period: number): void {
    // This will be handled by the normal attendance saving process
    // The missed class tracker will automatically exclude it in future checks
    console.log(`Missed class marked as taken: ${config.courseType} ${config.year} ${date} Period ${period}`);
  }

  // Get urgent missed classes (older than 3 days)
  public getUrgentMissedClasses(): MissedClass[] {
    return this.getAllMissedClasses().filter(missed => missed.daysSinceClass > 3);
  }

  // Get today's missed classes
  public getTodaysMissedClasses(): MissedClass[] {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getAllMissedClasses().filter(missed => missed.date === today);
  }
}