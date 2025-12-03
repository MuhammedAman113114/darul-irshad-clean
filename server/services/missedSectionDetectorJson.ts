// Missed Section Auto-Detection Service - JSON Storage Compatible
// Runs at 12:00 AM daily to detect missed attendance periods

import { storage } from '../storage.js';

export class MissedSectionDetectorJson {
  today: Date;
  yesterday: Date;
  yesterdayString: string;
  yesterdayWeekday: string;

  constructor() {
    this.today = new Date();
    this.yesterday = new Date(this.today);
    this.yesterday.setDate(this.yesterday.getDate() - 1);
    this.yesterdayString = this.yesterday.toISOString().split('T')[0];
    this.yesterdayWeekday = this.yesterday.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  /**
   * Main detection function - runs at 12:00 AM daily
   * Core Logic: IF period exists in timetable AND no holiday declared AND attendance not taken by 12:00 AM next day
   * THEN move to missed section
   */
  async runDailyDetection() {
    console.log(`🔍 [JSON] Starting missed section detection for ${this.yesterdayString}`);
    
    try {
      // Step 1: Skip if yesterday was holiday
      const isHolidayDate = await this.isHoliday(this.yesterdayString);
      console.log(`🎉 Holiday check for ${this.yesterdayString}: ${isHolidayDate}`);
      
      if (isHolidayDate) {
        console.log(`⏩ SKIPPING ${this.yesterdayString} - Holiday declared, no missed sections will be created`);
        return { status: 'skipped', reason: 'holiday', date: this.yesterdayString };
      }

      // Step 2: Get all scheduled periods for yesterday
      const scheduledPeriods = await this.getScheduledPeriods();
      console.log(`📋 Found ${scheduledPeriods.length} scheduled periods for ${this.yesterdayWeekday}`);

      // Step 3: Check each period for attendance
      let missedCount = 0;
      const missedPeriods = [];

      for (const period of scheduledPeriods) {
        const hasAttendance = await this.isAttendanceTaken(period);
        
        if (!hasAttendance) {
          await this.createMissedSection(period);
          missedCount++;
          missedPeriods.push({
            class: `${period.courseType} ${period.year} ${period.stream || ''} ${period.section}`.trim(),
            subject: period.subject,
            period: period.periodNumber
          });
          console.log(`❌ Missed: ${period.courseType} ${period.year} ${period.stream || ''} ${period.section} - ${period.subject} - Period ${period.periodNumber}`);
        } else {
          console.log(`✅ Completed: ${period.courseType} ${period.year} ${period.stream || ''} ${period.section} - ${period.subject} - Period ${period.periodNumber}`);
        }
      }

      console.log(`✅ Detection complete. ${missedCount} periods moved to missed section`);
      
      return {
        status: 'completed',
        date: this.yesterdayString,
        scheduledCount: scheduledPeriods.length,
        missedCount,
        missedPeriods
      };

    } catch (error: any) {
      console.error('❌ Error in missed section detection:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Check if given date is declared holiday
   */
  async isHoliday(date: string): Promise<boolean> {
    try {
      const holidays = await storage.getHolidayByFilter({ 
        date,
        isDeleted: false 
      });
      
      return holidays.length > 0;
    } catch (error) {
      console.error('Error checking holiday status:', error);
      return false; // Assume not holiday if error
    }
  }

  /**
   * Get all periods that should have happened yesterday
   * Only includes active timetable entries for yesterday's weekday
   */
  async getScheduledPeriods(): Promise<any[]> {
    try {
      // Get all timetable entries for yesterday's weekday
      const timetableEntries = await storage.getTimetable({
        dayOfWeek: this.yesterdayWeekday
      });

      // Filter out entries without subjects or with '-' as subject
      const scheduledPeriods = timetableEntries.filter((entry: any) => {
        return entry.subjectCode && 
               entry.subjectCode !== '-' && 
               entry.subjectName;
      });

      console.log(`📋 Found ${scheduledPeriods.length} scheduled periods for ${this.yesterdayWeekday}`);
      
      return scheduledPeriods.map((entry: any) => ({
        id: entry.id,
        courseType: entry.courseType,
        year: entry.year,
        stream: entry.stream,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        subjectId: entry.subjectId,
        subject: entry.subjectCode,
        subjectName: entry.subjectName,
        startTime: entry.startTime,
        endTime: entry.endTime
      }));
    } catch (error) {
      console.error('Error fetching scheduled periods:', error);
      return [];
    }
  }

  /**
   * Check if attendance was taken for specific period
   * Returns true if ANY student attendance was recorded for this period
   */
  async isAttendanceTaken(period: any): Promise<boolean> {
    try {
      const filters: any = {
        date: this.yesterdayString,
        period: period.periodNumber,
        courseType: period.courseType
      };

      // Add stream filter for PU courses
      if (period.stream) {
        filters.courseName = period.stream;
      }

      // Add section filter
      if (period.section) {
        filters.section = period.section;
      }

      const attendanceRecords = await storage.getAttendanceByFilter(filters);
      
      // If any student attendance recorded = attendance was taken
      return attendanceRecords.length > 0;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false; // Assume not taken if error
    }
  }

  /**
   * Add period to missed sections table
   */
  async createMissedSection(period: any): Promise<void> {
    try {
      // Check if storage has createMissedSection method
      if (typeof storage.createMissedSection === 'function') {
        await storage.createMissedSection({
          courseType: period.courseType,
          year: period.year,
          stream: period.stream,
          section: period.section,
          subject: period.subject,
          subjectName: period.subjectName,
          missedDate: this.yesterdayString,
          periodNumber: period.periodNumber,
          dayOfWeek: period.dayOfWeek,
          scheduledStartTime: period.startTime,
          scheduledEndTime: period.endTime,
          reason: 'Attendance not taken',
          detectedAt: new Date(),
          isCompleted: false,
          autoDetected: true
        });

        console.log(`📝 Created missed section record for ${period.courseType} ${period.year} ${period.section} - ${period.subject} Period ${period.periodNumber}`);
      } else {
        console.warn('⚠️ createMissedSection method not available in storage');
      }
    } catch (error) {
      console.error('Error creating missed section:', error);
      throw error;
    }
  }

  /**
   * Get pending missed sections with filters
   */
  async getPendingMissedSections(filters: any = {}): Promise<any[]> {
    try {
      // Check if storage has getMissedSections method
      if (typeof storage.getMissedSections === 'function') {
        const queryFilters: any = { isCompleted: false };
        
        if (filters.courseType) queryFilters.courseType = filters.courseType;
        if (filters.year) queryFilters.year = filters.year;
        if (filters.stream && filters.stream !== 'undefined') queryFilters.stream = filters.stream;
        if (filters.section) queryFilters.section = filters.section;
        
        const result = await storage.getMissedSections(queryFilters);
        
        console.log(`📋 Found ${result.length} pending missed sections`);
        
        // Add formatted fields
        return result.map((section: any) => ({
          ...section,
          fullClassName: `${section.courseType} ${section.year} ${section.stream || ''} ${section.section}`.trim(),
          formattedDate: new Date(section.missedDate).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        }));
      } else {
        console.warn('⚠️ getMissedSections method not available in storage');
        return [];
      }
    } catch (error) {
      console.error('Error fetching pending missed sections:', error);
      return [];
    }
  }

  /**
   * Mark missed section as completed with makeup details
   */
  async completeMissedSection(missedSectionId: number, makeupDate: string | null = null): Promise<any> {
    try {
      // Check if storage has updateMissedSection method
      if (typeof storage.updateMissedSection === 'function') {
        await storage.updateMissedSection(missedSectionId, {
          isCompleted: true,
          completedAt: new Date(),
          makeupDate: makeupDate || new Date().toISOString().split('T')[0]
        });

        console.log(`✅ Marked missed section ${missedSectionId} as completed`);
        return { success: true };
      } else {
        console.warn('⚠️ updateMissedSection method not available in storage');
        return { success: false, error: 'Method not available' };
      }
    } catch (error: any) {
      console.error('Error completing missed section:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule the detection to run at 12:00 AM daily
   */
  scheduleDaily() {
    // Calculate milliseconds until next midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight
    const msUntilMidnight = midnight.getTime() - now.getTime();

    console.log(`⏰ [JSON] Scheduling missed section detection to run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes at midnight`);

    // Set initial timeout for next midnight
    setTimeout(() => {
      this.runDailyDetection();
      
      // Then run every 24 hours
      setInterval(() => {
        this.runDailyDetection();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilMidnight);
  }
}

// Export singleton instance
export const missedSectionDetectorJson = new MissedSectionDetectorJson();

// Auto-start scheduling when module loads (only in non-test environment)
if (process.env.NODE_ENV !== 'test') {
  missedSectionDetectorJson.scheduleDaily();
}
