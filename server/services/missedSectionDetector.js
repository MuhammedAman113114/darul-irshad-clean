// Missed Section Auto-Detection Service
// Runs at 12:00 AM daily to detect missed attendance periods

import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { timetable, attendance, holidays, missedSections, subjects } from '../../shared/schema.js';
import { and, eq, not, exists } from 'drizzle-orm';

export class MissedSectionDetector {
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
    console.log(`🔍 Starting missed section detection for ${this.yesterdayString}`);
    
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

    } catch (error) {
      console.error('❌ Error in missed section detection:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Check if given date is declared holiday
   */
  async isHoliday(date) {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(holidays)
        .where(
          and(
            eq(holidays.date, date),
            eq(holidays.isDeleted, false) // Check for non-deleted holidays
          )
        );
      
      return result[0]?.count > 0;
    } catch (error) {
      console.error('Error checking holiday status:', error);
      return false; // Assume not holiday if error
    }
  }

  /**
   * Get all periods that should have happened yesterday
   * Only includes active timetable entries for yesterday's weekday
   */
  async getScheduledPeriods() {
    try {
      const result = await db
        .select({
          id: timetable.id,
          courseType: timetable.courseType,
          year: timetable.year,
          stream: timetable.stream,
          section: timetable.section,
          dayOfWeek: timetable.dayOfWeek,
          periodNumber: timetable.periodNumber,
          subjectId: timetable.subjectId,
          subject: subjects.subjectCode,
          subjectName: subjects.subject,
          startTime: timetable.startTime,
          endTime: timetable.endTime
        })
        .from(timetable)
        .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
        .where(
          and(
            eq(timetable.dayOfWeek, this.yesterdayWeekday),
            // Only include periods with actual subjects (not null and not '-')
            not(eq(subjects.subjectCode, '-')),
            sql`${subjects.subjectCode} IS NOT NULL`
          )
        )
        .orderBy(timetable.courseType, timetable.year, timetable.section, timetable.periodNumber);

      console.log(`📋 Found ${result.length} scheduled periods for ${this.yesterdayWeekday}`);
      return result;
    } catch (error) {
      console.error('Error fetching scheduled periods:', error);
      return [];
    }
  }

  /**
   * Check if attendance was taken for specific period
   * Returns true if ANY student attendance was recorded for this period
   */
  async isAttendanceTaken(period) {
    try {
      const result = await db
        .select({ count: sql`count(distinct student_id)` })
        .from(attendance)
        .where(
          and(
            eq(attendance.date, this.yesterdayString),
            eq(attendance.period, period.periodNumber),
            eq(attendance.courseType, period.courseType),
            eq(attendance.batchYear, period.year.toString()),
            // Also check stream and section to match exactly
            ...(period.stream ? [eq(attendance.courseName, period.stream)] : []),
            ...(period.section ? [eq(attendance.section, period.section)] : [])
          )
        );

      const studentCount = result[0]?.count || 0;
      
      // If any student attendance recorded = attendance was taken
      return studentCount > 0;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false; // Assume not taken if error
    }
  }

  /**
   * Add period to missed sections table
   */
  async createMissedSection(period) {
    try {
      await db.insert(missedSections).values({
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
        isCompleted: false
      });

      console.log(`📝 Created missed section record for ${period.courseType} ${period.year} ${period.section} - ${period.subject} Period ${period.periodNumber}`);
    } catch (error) {
      console.error('Error creating missed section:', error);
      throw error;
    }
  }

  /**
   * Get pending missed sections with filters
   */
  async getPendingMissedSections(filters = {}) {
    try {
      let query = db
        .select({
          id: missedSections.id,
          courseType: missedSections.courseType,
          year: missedSections.year,
          stream: missedSections.stream,
          section: missedSections.section,
          subject: missedSections.subject,
          subjectName: missedSections.subjectName,
          missedDate: missedSections.missedDate,
          periodNumber: missedSections.periodNumber,
          dayOfWeek: missedSections.dayOfWeek,
          scheduledStartTime: missedSections.scheduledStartTime,
          scheduledEndTime: missedSections.scheduledEndTime,
          reason: missedSections.reason,
          detectedAt: missedSections.detectedAt,
          isCompleted: missedSections.isCompleted,
          completedAt: missedSections.completedAt,
          makeupDate: missedSections.makeupDate
        })
        .from(missedSections)
        .where(eq(missedSections.isCompleted, false));

      // Apply filters  
      if (filters.courseType) {
        query = query.where(eq(missedSections.courseType, filters.courseType));
      }
      if (filters.year) {
        query = query.where(eq(missedSections.year, filters.year));
      }  
      if (filters.stream && filters.stream !== 'undefined') {
        query = query.where(eq(missedSections.stream, filters.stream));
      }
      if (filters.section) {
        query = query.where(eq(missedSections.section, filters.section));
      }
      
      console.log('📋 Applied filters:', filters);
      console.log('🔍 Query built for missed sections with comprehensive filtering');

      const result = await query.orderBy(missedSections.missedDate, missedSections.periodNumber);

      console.log(`📋 Found ${result.length} missed sections in database`);
      console.log('📋 Sample missed section:', result[0]);
      
      // Add calculated fields
      const processedResult = result.map(section => ({
        ...section,
        fullClassName: `${section.courseType} ${section.year} ${section.stream || ''} ${section.section}`.trim(),
        daysPending: Math.floor((new Date() - new Date(section.detectedAt)) / (1000 * 60 * 60 * 24)),
        formattedDate: new Date(section.missedDate).toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      }));
      
      console.log('📋 Processed result type:', typeof processedResult, 'isArray:', Array.isArray(processedResult));
      return processedResult;
    } catch (error) {
      console.error('Error fetching pending missed sections:', error);
      return [];
    }
  }

  /**
   * Mark missed section as completed with makeup details
   */
  async completeMissedSection(missedSectionId, makeupDate = null) {
    try {
      await db
        .update(missedSections)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          makeupDate: makeupDate || new Date().toISOString().split('T')[0]
        })
        .where(eq(missedSections.id, missedSectionId));

      console.log(`✅ Marked missed section ${missedSectionId} as completed`);
      return { success: true };
    } catch (error) {
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

    console.log(`⏰ Scheduling missed section detection to run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes at midnight`);

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
export const missedSectionDetector = new MissedSectionDetector();

// Auto-start scheduling when module loads
if (process.env.NODE_ENV !== 'test') {
  missedSectionDetector.scheduleDaily();
}