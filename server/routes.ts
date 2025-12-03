import express, { type Express, type Request, type Response } from "express";
import { storage } from "./storage";
import { createServer } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  users, 
  students, 
  attendance, 
  namazAttendance, 
  leaves, 
  results, 
  remarks, 
  subjects,
  timetable,
  holidays,
  emergencyLeave,
  missedAttendanceStatus,
  missedSections,
  periodDefinitions,
  timetablePeriodConfig,
  insertEmergencyLeaveSchema,
  insertPeriodDefinitionSchema,
  insertTimetablePeriodConfigSchema,
  insertMissedSectionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express) {
  const server = createServer(app);
  
  // Import appropriate missed section detector based on storage type
  const { USE_JSON_STORAGE } = await import('./db.js');
  let missedSectionDetector: any;
  
  if (USE_JSON_STORAGE) {
    const { missedSectionDetectorJson } = await import('./services/missedSectionDetectorJson.js');
    missedSectionDetector = missedSectionDetectorJson;
    console.log('📋 Using JSON-compatible missed section detector');
  } else {
    const { missedSectionDetector: dbDetector } = await import('./services/missedSectionDetector.js');
    missedSectionDetector = dbDetector;
    console.log('📋 Using database missed section detector');
  }
  
  // Import backup manager
  const { backupManager } = await import('./backup.js');

  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    // Check if user is authenticated
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Attendance API routes
  app.post("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const attendanceData = req.body;
      
      // Validate required fields
      if (!attendanceData.date || !attendanceData.period || !attendanceData.courseType || !attendanceData.year) {
        return res.status(400).json({ error: "Missing required attendance fields" });
      }

      // Get student details to populate roll_no
      const student = await storage.getStudent(attendanceData.studentId);
      if (!student) {
        return res.status(400).json({ error: "Student not found" });
      }

      // Lookup subject_id from timetable based on class configuration, date, and period
      let subjectId = null;
      try {
        const attendanceDate = new Date(attendanceData.date);
        const dayOfWeek = attendanceDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const timetableLookupParams = {
          courseType: attendanceData.courseType,
          year: attendanceData.year,
          stream: student.courseDivision,
          section: student.batch || 'A',
          dayOfWeek: dayOfWeek,
          periodNumber: parseInt(attendanceData.period)
        };
        
        console.log(`🔍 TIMETABLE LOOKUP DEBUG - Looking up subject_id with params:`, timetableLookupParams);
        console.log(`🔍 Student details for context: ID=${student.id}, name=${student.name}, courseDivision=${student.courseDivision}, batch=${student.batch}`);
        
        // Get timetable entry for this class, day, and period
        const timetableEntry = await storage.getTimetableEntry(timetableLookupParams);
        
        console.log(`🔍 TIMETABLE LOOKUP RESULT:`, timetableEntry);

        if (timetableEntry && timetableEntry.subjectId) {
          subjectId = timetableEntry.subjectId;
          console.log(`📚 ✅ SUCCESS - Found subject ID ${subjectId} for ${dayOfWeek} period ${attendanceData.period} in timetable`);
        } else {
          console.log(`⚠️ ❌ FAILED - No timetable entry found for ${attendanceData.courseType} ${attendanceData.year} ${student.courseDivision} ${student.batch} - ${dayOfWeek} period ${attendanceData.period}`);
          
          // Additional debugging - let's check if there are any timetable entries for this class at all
          const allClassEntries = await storage.getTimetableByFilter({
            courseType: attendanceData.courseType,
            year: attendanceData.year,
            stream: student.courseDivision,
            section: student.batch || 'A'
          });
          console.log(`🔍 DEBUG - All timetable entries for this class:`, allClassEntries.length > 0 ? allClassEntries : 'NONE FOUND');
        }
      } catch (timetableError) {
        console.warn('❌ ERROR in timetable lookup:', timetableError);
        // Continue without subject_id - attendance can still be saved
      }
      
      // Create attendance record with all required schema fields
      const attendanceRecord = {
        studentId: attendanceData.studentId,
        rollNo: student.rollNo, // Redundant but useful for fast reference in exports
        date: attendanceData.date,
        period: parseInt(attendanceData.period), // Ensure integer type
        subjectId: subjectId, // Link to subject via timetable lookup
        status: attendanceData.status, // 'present', 'absent', 'leave'
        courseType: attendanceData.courseType, // 'pu', 'post-pu'
        courseName: student.courseDivision, // 'commerce', 'science', etc.
        section: student.batch, // 'A', 'B', 'None'
        batchYear: `${student.year}${student.courseType === 'pu' ? 'th PU' : 'th year'}`, // '1th PU', '3th year'
        recordedAt: new Date(), // Auto-filled timestamp when attendance is recorded
        synced: true, // Mark as synced since we're directly saving to database
        updatedAt: new Date(), // For edit history tracking
        createdBy: req.session.user.id // Teacher who recorded the attendance
      };
      
      // Store in database
      const result = await storage.createAttendance(attendanceRecord);
      
      console.log(`📝 Attendance saved to database: ${attendanceData.courseType} ${attendanceData.year} - ${attendanceData.date} Period ${attendanceData.period}${subjectId ? ` (Subject ID: ${subjectId})` : ''}`);
      
      res.json({ success: true, id: result.id, data: result });
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  });

  app.get("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, courseDivision, courseName, section, date, period, studentId } = req.query;
      
      console.log('🔍 Raw query parameters:', { courseType, year, courseDivision, courseName, section, date, period, studentId });
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      
      // Handle both courseDivision and courseName parameters for backwards compatibility
      const courseNameValue = courseName || courseDivision;
      console.log('🔍 Course name resolution:', { courseName, courseDivision, courseNameValue, courseType });
      
      // Only add courseName filter for PU courses, not for post-pu (which have null courseName)
      if (courseNameValue && courseType === 'pu') {
        filters.courseName = courseNameValue;
        console.log('✅ Added courseName filter:', courseNameValue);
      } else {
        console.log('❌ Skipped courseName filter:', { courseNameValue, courseType });
      }
      
      if (section) filters.section = section;
      if (date) filters.date = date;
      if (period) filters.period = parseInt(period as string);
      if (studentId) filters.studentId = parseInt(studentId as string);
      
      console.log('🔍 Built filters for attendance query:', filters);
      
      const attendance = await storage.getAttendanceByFilter(filters);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.put("/api/attendance/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString(),
        updatedBy: req.session.user.id
      };
      
      const result = await storage.updateAttendance(parseInt(id), updateData);
      
      if (!result) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Secure authentication with specific credentials
      if (username === "darul001" && password === "darul100") {
        const user = {
          id: 1,
          username: "darul001",
          name: "Darul Irshad Teacher",
          role: "teacher"
        };
        
        req.session.user = user;
        res.json(user);
      } else {
        res.status(401).json({ message: "Wrong username or password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      res.json(req.session.user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ message: "Logged out successfully" });
  });

  // Namaz Attendance API routes
  app.post("/api/namaz-attendance", isAuthenticated, async (req, res) => {
    try {
      const namazData = req.body;
      
      if (!namazData.date || !namazData.prayer || !namazData.students) {
        return res.status(400).json({ error: "Missing required namaz attendance fields" });
      }
      
      // Process each student's namaz attendance
      const results = [];
      for (const student of namazData.students) {
        const namazRecord = {
          studentId: student.id || student.studentId,
          date: namazData.date,
          prayer: namazData.prayer,
          status: student.status,
          createdBy: req.session.user.id
          // Remove createdAt - let database handle with defaultNow()
        };
        
        const result = await storage.createNamazAttendance(namazRecord);
        results.push(result);
      }
      
      console.log(`🕌 Namaz attendance saved: ${namazData.prayer} on ${namazData.date} for ${results.length} students`);
      res.json({ success: true, count: results.length, data: results });
    } catch (error) {
      console.error("Error saving namaz attendance:", error);
      res.status(500).json({ error: "Failed to save namaz attendance" });
    }
  });

  app.get("/api/namaz-attendance", isAuthenticated, async (req, res) => {
    try {
      const { date, prayer, studentId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (date) filters.date = date;
      if (prayer) filters.prayer = prayer;
      if (studentId) filters.studentId = parseInt(studentId as string);
      
      let namazAttendance = await storage.getNamazAttendanceByFilter(filters);
      
      // Apply date range filter if provided
      if (startDate && endDate) {
        namazAttendance = namazAttendance.filter(record => 
          record.date >= startDate && record.date <= endDate
        );
      }
      
      res.json(namazAttendance);
    } catch (error) {
      console.error("Error fetching namaz attendance:", error);
      res.status(500).json({ error: "Failed to fetch namaz attendance" });
    }
  });

  // Leave Management API routes
  app.post("/api/leaves", isAuthenticated, async (req, res) => {
    try {
      const leaveData = {
        ...req.body,
        createdBy: req.session.user.id,
        createdAt: new Date().toISOString()
      };
      
      const result = await storage.createLeave(leaveData);
      console.log(`📋 Leave created for student ${leaveData.studentId}: ${leaveData.fromDate} to ${leaveData.toDate}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating leave:", error);
      res.status(500).json({ error: "Failed to create leave" });
    }
  });

  app.get("/api/leaves", isAuthenticated, async (req, res) => {
    try {
      const { studentId, status, fromDate, toDate } = req.query;
      
      const filters: any = {};
      if (studentId) filters.studentId = parseInt(studentId as string);
      if (status) filters.status = status;
      
      let leaves = await storage.getLeaveByFilter(filters);
      
      // Apply date range filter
      if (fromDate && toDate) {
        leaves = leaves.filter(leave => 
          leave.fromDate <= toDate && leave.toDate >= fromDate
        );
      }
      
      res.json(leaves);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      res.status(500).json({ error: "Failed to fetch leaves" });
    }
  });

  app.put("/api/leaves/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString(),
        updatedBy: req.session.user.id
      };
      
      const result = await storage.updateLeave(parseInt(id), updateData);
      
      if (!result) {
        return res.status(404).json({ error: "Leave record not found" });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating leave:", error);
      res.status(500).json({ error: "Failed to update leave" });
    }
  });

  // Remarks API routes
  app.post("/api/remarks", isAuthenticated, async (req, res) => {
    try {
      // Remove createdAt from request body - let database handle it
      const { createdAt, ...remarkData } = req.body;
      
      const cleanRemarkData = {
        ...remarkData,
        submittedBy: req.session.user.id
      };
      
      const result = await storage.createRemark(cleanRemarkData);
      console.log(`💬 Remark added for student ${cleanRemarkData.studentId}: ${cleanRemarkData.category}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating remark:", error);
      res.status(500).json({ error: "Failed to create remark" });
    }
  });

  app.get("/api/remarks", isAuthenticated, async (req, res) => {
    try {
      const { studentId, category, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (studentId) filters.studentId = parseInt(studentId as string);
      if (category) filters.category = category;
      
      let remarks = await storage.getRemarkByFilter(filters);
      
      // Apply date range filter
      if (startDate && endDate) {
        remarks = remarks.filter(remark => 
          remark.createdAt >= startDate && remark.createdAt <= endDate
        );
      }
      
      res.json(remarks);
    } catch (error) {
      console.error("Error fetching remarks:", error);
      res.status(500).json({ error: "Failed to fetch remarks" });
    }
  });

  // Results API routes
  app.post("/api/results", isAuthenticated, async (req, res) => {
    try {
      const resultData = {
        ...req.body,
        uploadedBy: req.session.user.id,
        uploadedAt: new Date().toISOString()
      };
      
      const result = await storage.createResult(resultData);
      console.log(`📊 Result uploaded: ${resultData.title} for ${resultData.courseType} ${resultData.year}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error uploading result:", error);
      res.status(500).json({ error: "Failed to upload result" });
    }
  });

  app.get("/api/results", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, courseDivision, batch } = req.query;
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (courseDivision) filters.courseDivision = courseDivision;
      if (batch) filters.batch = batch;
      
      const results = await storage.getResultByFilter(filters);
      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Holidays/Calendar API routes
  app.post("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const holidayData = {
        ...req.body,
        createdBy: req.session.user.id
      };
      
      const result = await storage.createHoliday(holidayData);
      console.log(`📅 Holiday created: ${holidayData.name} on ${holidayData.date}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(500).json({ error: "Failed to create holiday" });
    }
  });

  app.get("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, type, isDeleted } = req.query;
      
      const filters: any = {};
      if (type) filters.type = type;
      if (isDeleted !== undefined) filters.isDeleted = isDeleted === 'true';
      
      let holidays = await storage.getHolidayByFilter(filters);
      
      // Apply date range filter
      if (startDate && endDate) {
        holidays = holidays.filter(holiday => 
          holiday.date >= startDate && holiday.date <= endDate
        );
      }
      
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ error: "Failed to fetch holidays" });
    }
  });

  app.patch("/api/holidays/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updateHoliday(id, req.body);
      
      if (!result) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      
      console.log(`📅 Holiday updated: ID ${id}`);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating holiday:", error);
      res.status(500).json({ error: "Failed to update holiday" });
    }
  });

  // Period Definitions API routes
  app.get("/api/period-definitions", isAuthenticated, async (req, res) => {
    try {
      if (typeof storage.getPeriodDefinitions === 'function') {
        const periods = await storage.getPeriodDefinitions();
        res.json(periods);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching period definitions:", error);
      res.status(500).json({ error: "Failed to fetch period definitions" });
    }
  });

  app.post("/api/period-definitions", isAuthenticated, async (req, res) => {
    try {
      if (typeof storage.createPeriodDefinition === 'function') {
        const result = await storage.createPeriodDefinition(req.body);
        console.log(`⏰ Period definition created: Period ${req.body.periodNumber} (${req.body.startTime}-${req.body.endTime})`);
        res.json({ success: true, data: result });
      } else {
        res.status(501).json({ error: "Period definitions not supported in current storage" });
      }
    } catch (error) {
      console.error("Error creating period definition:", error);
      res.status(500).json({ error: "Failed to create period definition" });
    }
  });

  app.patch("/api/period-definitions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (typeof storage.updatePeriodDefinition === 'function') {
        const result = await storage.updatePeriodDefinition(id, req.body);
        
        if (!result) {
          return res.status(404).json({ error: "Period definition not found" });
        }
        
        console.log(`⏰ Period definition updated: ID ${id}`);
        res.json({ success: true, data: result });
      } else {
        res.status(501).json({ error: "Period definitions not supported in current storage" });
      }
    } catch (error) {
      console.error("Error updating period definition:", error);
      res.status(500).json({ error: "Failed to update period definition" });
    }
  });

  app.delete("/api/period-definitions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (typeof storage.deletePeriodDefinition === 'function') {
        const result = await storage.deletePeriodDefinition(id);
        
        if (!result) {
          return res.status(404).json({ error: "Period definition not found" });
        }
        
        console.log(`⏰ Period definition deleted: ID ${id}`);
        res.json({ success: true, message: "Period definition deleted successfully" });
      } else {
        res.status(501).json({ error: "Period definitions not supported in current storage" });
      }
    } catch (error) {
      console.error("Error deleting period definition:", error);
      res.status(500).json({ error: "Failed to delete period definition" });
    }
  });

  // Subjects API routes
  app.post("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      const subjectData = {
        ...req.body,
        createdBy: req.session.user.id
      };
      
      const result = await storage.createSubject(subjectData);
      console.log(`📚 Subject created: ${subjectData.subject} (${subjectData.subjectCode}) for ${subjectData.courseType} ${subjectData.year}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ error: "Failed to create subject" });
    }
  });

  app.get("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      
      const subjects = await storage.getSubjects(filters);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });

  // Class-specific subjects endpoint for Excel export
  app.get("/api/class-subjects", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      console.log(`📚 Fetching class subjects for: ${courseType} Year ${year} ${stream || ''} ${section || ''}`);
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      
      const subjects = await storage.getSubjects(filters);
      
      // Transform to include the data needed for Excel export
      const subjectsForExport = subjects.map(subject => ({
        subjectId: subject.id,
        subjectName: subject.subject,
        subjectCode: subject.subjectCode,
        courseType: subject.courseType,
        year: subject.year,
        stream: subject.stream,
        section: subject.section
      }));
      
      console.log(`📚 Found ${subjectsForExport.length} subjects for class: ${JSON.stringify({ courseType, year, stream, section })}`);
      
      res.json(subjectsForExport);
    } catch (error) {
      console.error("Error fetching class subjects:", error);
      res.status(500).json({ error: "Failed to fetch class subjects" });
    }
  });

  app.patch("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updateSubject(id, req.body);
      
      if (!result) {
        return res.status(404).json({ error: "Subject not found" });
      }
      
      console.log(`📚 Subject updated: ID ${id}`);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ error: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSubject(id);
      
      if (!result) {
        return res.status(404).json({ error: "Subject not found" });
      }
      
      console.log(`📚 Subject deleted: ID ${id}`);
      res.json({ success: true, message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ error: "Failed to delete subject" });
    }
  });

  // Timetable API routes
  app.post("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const timetableData = {
        ...req.body,
        createdBy: req.session.user.id
      };
      
      const result = await storage.createTimetableEntry(timetableData);
      console.log(`📅 Timetable entry created: ${timetableData.dayOfWeek} Period ${timetableData.periodNumber} for ${timetableData.courseType} ${timetableData.year}`);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating timetable entry:", error);
      res.status(500).json({ error: "Failed to create timetable entry" });
    }
  });

  app.post("/api/timetable/bulk", isAuthenticated, async (req, res) => {
    try {
      const { entries } = req.body;
      
      const timetableEntries = entries.map((entry: any) => ({
        ...entry,
        createdBy: req.session.user.id
      }));
      
      const results = await storage.bulkCreateTimetable(timetableEntries);
      console.log(`📅 Bulk timetable created: ${results.length} entries`);
      
      res.json({ success: true, data: results });
    } catch (error) {
      console.error("Error bulk creating timetable:", error);
      res.status(500).json({ error: "Failed to bulk create timetable" });
    }
  });

  app.post("/api/timetable/bulk-upsert", isAuthenticated, async (req, res) => {
    try {
      const { entries } = req.body;
      
      const timetableEntries = entries.map((entry: any) => ({
        ...entry,
        createdBy: req.session.user.id
      }));
      
      const results = await storage.bulkUpsertTimetable(timetableEntries);
      console.log(`📅 Bulk timetable upserted: ${results.length} entries`);
      
      res.json({ success: true, data: results });
    } catch (error) {
      console.error("Error bulk upserting timetable:", error);
      res.status(500).json({ error: "Failed to bulk upsert timetable" });
    }
  });

  app.get("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section, dayOfWeek } = req.query;
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      if (dayOfWeek) filters.dayOfWeek = dayOfWeek;
      
      const timetable = await storage.getTimetable(filters);
      res.json(timetable);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      res.status(500).json({ error: "Failed to fetch timetable" });
    }
  });

  app.patch("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updateTimetableEntry(id, req.body);
      
      if (!result) {
        return res.status(404).json({ error: "Timetable entry not found" });
      }
      
      console.log(`📅 Timetable entry updated: ID ${id}`);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating timetable entry:", error);
      res.status(500).json({ error: "Failed to update timetable entry" });
    }
  });

  app.delete("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteTimetableEntry(id);
      
      if (!result) {
        return res.status(404).json({ error: "Timetable entry not found" });
      }
      
      console.log(`📅 Timetable entry deleted: ID ${id}`);
      res.json({ success: true, message: "Timetable entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
      res.status(500).json({ error: "Failed to delete timetable entry" });
    }
  });

  // Get all subjects assigned to a specific class through timetable
  app.get("/api/class-subjects", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      if (!courseType || !year) {
        return res.status(400).json({ error: "Missing required parameters: courseType and year" });
      }
      
      // Get unique subjects assigned to this class through timetable
      const timetableData = await storage.getTimetable({
        courseType: courseType as string,
        year: year as string,
        ...(stream && { stream: stream as string }),
        ...(section && { section: section as string })
      });
      
      // Extract unique subjects
      const subjectMap = new Map();
      timetableData.forEach((entry: any) => {
        if (entry.subjectId && entry.subjectName) {
          subjectMap.set(entry.subjectId, {
            subjectId: entry.subjectId,
            subjectName: entry.subjectName,
            subjectCode: entry.subjectCode
          });
        }
      });
      
      const classSubjects = Array.from(subjectMap.values());
      console.log(`📚 Found ${classSubjects.length} subjects for class:`, { courseType, year, stream, section });
      
      res.json(classSubjects);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      res.status(500).json({ error: "Failed to fetch class subjects" });
    }
  });

  // Get attendance data for a specific subject and date range
  app.get("/api/attendance/by-subject", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section, subjectId, startDate, endDate } = req.query;
      
      if (!courseType || !year || !subjectId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // First, get all timetable entries for this class and subject to find relevant periods
      const timetableData = await storage.getTimetable({
        courseType: courseType as string,
        year: year as string,
        ...(stream && { stream: stream as string }),
        ...(section && { section: section as string })
      });
      
      // Filter for the specific subject and extract period numbers
      const subjectPeriods = timetableData
        .filter((entry: any) => entry.subjectId === parseInt(subjectId as string))
        .map((entry: any) => entry.periodNumber);
      
      if (subjectPeriods.length === 0) {
        return res.json([]);
      }
      
      // Now get attendance records for those periods
      const allAttendance = await storage.getAttendanceByFilter({
        courseType: courseType as string,
        year: year as string,
        ...(stream && { courseName: stream as string }),
        ...(section && { section: section as string })
      });
      
      // Filter attendance by periods and date range
      let subjectAttendance = allAttendance.filter((record: any) => {
        const matchesPeriod = subjectPeriods.includes(record.period);
        const matchesDateRange = (!startDate || record.date >= startDate) && 
                                (!endDate || record.date <= endDate);
        return matchesPeriod && matchesDateRange;
      });
      
      console.log(`📊 Found ${subjectAttendance.length} attendance records for subject ${subjectId}`);
      
      res.json(subjectAttendance);
    } catch (error) {
      console.error('Error fetching subject attendance:', error);
      res.status(500).json({ error: "Failed to fetch subject attendance" });
    }
  });

  // Students routes
  app.get("/api/students", async (req, res) => {
    try {
      const { courseType, year, courseDivision, section } = req.query;
      
      // Build filter object from query parameters
      const filters: any = {};
      if (courseType) filters.courseType = courseType as string;
      if (year) filters.year = year as string;
      
      // CRITICAL FIX: Handle different course type filtering logic
      if (courseType === 'post-pu') {
        // Post-PU students: Don't filter by courseDivision or section since they have courseDivision: null
      } else {
        // PU students: Apply courseDivision filtering
        if (courseDivision) filters.courseDivision = courseDivision as string;
        
        // Section handling: Only filter by section if it's not empty
        // For "Single Section" classes, section comes as empty string but students may have batch: 'A'
        if (section !== undefined && section !== '') {
          filters.batch = section as string;
        }
        // If section is empty (Single Section), don't add batch filter - find all students for that course
      }
      
      console.log(`🔍 Student filter request:`, { courseType, year, courseDivision, section });
      console.log(`🔍 Built filters:`, filters);
      
      let students;
      if (Object.keys(filters).length > 0) {
        students = await storage.getStudentsByFilter(filters);
      } else {
        students = await storage.getStudents();
      }
      
      console.log(`📊 Found ${students.length} students:`, students.map(s => ({ name: s.name, batch: s.batch })));
      res.json(students);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/students", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.createStudent(req.body);
      res.status(201).json(student);
    } catch (error) {
      console.error("Create student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("🔄 PUT /api/students/:id called");
      console.log("📝 Student ID:", id);
      console.log("📝 Request body:", req.body);
      
      const student = await storage.updateStudent(id, req.body);
      console.log("✅ Updated student:", student);
      
      if (student) {
        res.json(student);
      } else {
        console.log("❌ Student not found with ID:", id);
        res.status(404).json({ message: "Student not found" });
      }
    } catch (error) {
      console.error("❌ Update student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH endpoint for partial student updates (used by HomePageNew.tsx)
  app.patch("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("🔄 PATCH /api/students/:id called");
      console.log("📝 Student ID:", id);
      console.log("📝 Request body:", req.body);
      
      const student = await storage.updateStudent(id, req.body);
      console.log("✅ Updated student via PATCH:", student);
      
      if (student) {
        res.json(student);
      } else {
        console.log("❌ Student not found with ID:", id);
        res.status(404).json({ message: "Student not found" });
      }
    } catch (error) {
      console.error("❌ PATCH student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStudent(id);
      if (success) {
        res.json({ message: "Student deleted successfully" });
      } else {
        res.status(404).json({ message: "Student not found" });
      }
    } catch (error) {
      console.error("Delete student error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AUTO-DETECTION SYSTEM: Daily missed section detection (runs at 12:00 AM)
  app.post("/api/missed-sections/auto-detect", isAuthenticated, async (req, res) => {
    try {
      console.log("🚨 Starting intelligent missed section auto-detection...");
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log(`🔍 Checking ${yesterdayStr} for missed periods (12:00 AM rule)`);
      
      // Step 1: Check if yesterday was a holiday
      const holidayCheck = await db.select().from(holidays)
        .where(sql`date = ${yesterdayStr} AND is_deleted = false`);
      
      if (holidayCheck.length > 0) {
        console.log(`⏩ Skipping ${yesterdayStr} - Holiday declared: ${holidayCheck[0].name}`);
        return res.json({ 
          message: "Holiday detected - no detection needed", 
          date: yesterdayStr,
          holiday: holidayCheck[0].name 
        });
      }
      
      // Step 2: Get all scheduled periods for yesterday
      const dayOfWeek = yesterday.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Skip Fridays (weekly holidays)
      if (dayOfWeek === 'friday') {
        console.log(`⏩ Skipping ${yesterdayStr} - Friday (weekly holiday)`);
        return res.json({ 
          message: "Friday detected - weekly holiday", 
          date: yesterdayStr 
        });
      }
      
      const scheduledPeriods = await db.select({
        courseType: timetable.courseType,
        year: timetable.year,
        courseDivision: timetable.stream,
        section: timetable.section,
        subjectId: timetable.subjectId,
        periodNumber: timetable.periodNumber,
        subjectName: subjects.subject,
        subjectCode: subjects.subjectCode,
        startTime: timetable.startTime,
        endTime: timetable.endTime
      })
      .from(timetable)
      .leftJoin(subjects, sql`${timetable.subjectId} = ${subjects.id}`)
      .where(sql`
        ${timetable.dayOfWeek} = ${dayOfWeek}
        AND ${subjects.subjectCode} != '-'
        AND ${subjects.subjectCode} IS NOT NULL
        AND ${subjects.subjectCode} != ''
      `);
      
      console.log(`📋 Found ${scheduledPeriods.length} scheduled periods for ${dayOfWeek}`);
      
      let detectedCount = 0;
      const processedPeriods = [];
      
      // Step 3: Check each scheduled period for attendance
      for (const period of scheduledPeriods) {
        const attendanceExists = await db.select()
          .from(attendance)
          .where(sql`
            date = ${yesterdayStr}
            AND course_type = ${period.courseType}
            AND year = ${period.year}
            AND period = ${period.periodNumber}
            ${period.courseDivision ? sql`AND course_name = ${period.courseDivision}` : sql``}
            ${period.section ? sql`AND section = ${period.section}` : sql``}
          `)
          .limit(1);
        
        if (attendanceExists.length === 0) {
          // Period missed - add to queue
          const existingMissed = await db.select()
            .from(missedSections)
            .where(sql`
              missed_date = ${yesterdayStr}
              AND course_type = ${period.courseType}
              AND year = ${period.year}
              AND subject_id = ${period.subjectId}
              AND period_number = ${period.periodNumber}
              ${period.section ? sql`AND section = ${period.section}` : sql``}
            `)
            .limit(1);
          
          if (existingMissed.length === 0) {
            await db.insert(missedSections).values({
              courseType: period.courseType,
              year: period.year,
              courseDivision: period.courseDivision,
              section: period.section || 'A',
              subjectId: period.subjectId,
              missedDate: yesterdayStr,
              periodNumber: period.periodNumber,
              reason: 'Attendance not taken by 12:00 AM',
              priority: 'normal',
              autoDetected: true,
              daysPending: 1
            });
            
            detectedCount++;
            console.log(`❌ MISSED: ${period.courseType.toUpperCase()} ${period.year} ${period.courseDivision || ''} ${period.section || ''} - ${period.subjectName} (Period ${period.periodNumber})`);
          }
        } else {
          console.log(`✅ TAKEN: ${period.courseType.toUpperCase()} ${period.year} ${period.courseDivision || ''} ${period.section || ''} - ${period.subjectName} (Period ${period.periodNumber})`);
        }
        
        processedPeriods.push({
          class: `${period.courseType.toUpperCase()} ${period.year} ${period.courseDivision || ''} ${period.section || ''}`,
          subject: period.subjectName,
          period: period.periodNumber,
          status: attendanceExists.length > 0 ? 'taken' : 'missed'
        });
      }
      
      // Step 4: Update pending days for all existing missed sections
      await db.execute(sql`
        UPDATE missed_sections 
        SET days_pending = EXTRACT(DAY FROM NOW() - missed_date::date),
            updated_at = NOW()
        WHERE is_completed = false
      `);
      
      console.log(`✅ Auto-detection complete: ${detectedCount} new missed sections detected`);
      
      res.json({
        success: true,
        message: `Auto-detection completed for ${yesterdayStr}`,
        date: yesterdayStr,
        scheduledPeriods: scheduledPeriods.length,
        newMissedSections: detectedCount,
        processedPeriods: processedPeriods
      });
      
    } catch (error) {
      console.error('❌ Auto-detection failed:', error);
      res.status(500).json({ 
        error: 'Auto-detection failed', 
        details: error.message 
      });
    }
  });

  // Enhanced missed sections queue - get all pending missed sections
  app.get("/api/missed-sections/queue", isAuthenticated, async (req, res) => {
    try {
      const { 
        courseType, 
        year, 
        courseDivision, 
        section, 
        priority, 
        daysSince = '30',
        status = 'pending' 
      } = req.query;
      
      let whereClause = sql`ms.is_completed = ${status === 'completed' ? true : false}`;
      
      // Apply filters
      if (courseType) whereClause = sql`${whereClause} AND ms.course_type = ${courseType}`;
      if (year) whereClause = sql`${whereClause} AND ms.year = ${year}`;
      if (courseDivision) whereClause = sql`${whereClause} AND ms.course_division = ${courseDivision}`;
      if (section) whereClause = sql`${whereClause} AND ms.section = ${section}`;
      if (priority) whereClause = sql`${whereClause} AND ms.priority = ${priority}`;
      
      // Date range filter
      const daysBack = parseInt(daysSince as string);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      whereClause = sql`${whereClause} AND ms.missed_date >= ${cutoffDate.toISOString().split('T')[0]}`;
      
      const missedQueue = await db.select({
        id: missedSections.id,
        courseType: missedSections.courseType,
        year: missedSections.year,
        courseDivision: missedSections.courseDivision,
        section: missedSections.section,
        subjectId: missedSections.subjectId,
        subjectName: subjects.subject,
        subjectCode: subjects.subjectCode,
        missedDate: missedSections.missedDate,
        periodNumber: missedSections.periodNumber,
        detectedAt: missedSections.detectedAt,
        reason: missedSections.reason,
        priority: missedSections.priority,
        daysPending: missedSections.daysPending,
        autoDetected: missedSections.autoDetected,
        isCompleted: missedSections.isCompleted,
        completedAt: missedSections.completedAt,
        makeupDate: missedSections.makeupDate,
        makeupPeriod: missedSections.makeupPeriod,
        completedBy: missedSections.completedBy,
        remarks: missedSections.remarks
      })
      .from(missedSections)
      .leftJoin(subjects, sql`${missedSections.subjectId} = ${subjects.id}`)
      .where(whereClause)
      .orderBy(sql`ms.priority DESC, ms.days_pending DESC, ms.missed_date DESC`);
      
      // Group by class for better organization
      const groupedQueue = missedQueue.reduce((acc, item) => {
        const classKey = `${item.courseType.toUpperCase()} ${item.year} ${item.courseDivision || ''} ${item.section || ''}`.trim();
        if (!acc[classKey]) acc[classKey] = [];
        acc[classKey].push({
          ...item,
          className: classKey,
          urgencyLevel: item.daysPending > 7 ? 'high' : item.daysPending > 3 ? 'medium' : 'low'
        });
        return acc;
      }, {});
      
      res.json({
        success: true,
        totalMissed: missedQueue.length,
        groupedQueue: groupedQueue,
        summary: {
          high_priority: missedQueue.filter(m => m.priority === 'high').length,
          normal_priority: missedQueue.filter(m => m.priority === 'normal').length,
          urgent_pending: missedQueue.filter(m => m.daysPending > 7).length,
          auto_detected: missedQueue.filter(m => m.autoDetected).length
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch missed sections queue:', error);
      res.status(500).json({ 
        error: 'Failed to fetch queue', 
        details: error.message 
      });
    }
  });

  // Take makeup attendance for missed section
  app.post("/api/missed-sections/:id/makeup", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { attendanceData, makeupDate, makeupPeriod, remarks } = req.body;
      const userId = req.session.user?.id;
      
      // Get missed section details
      const missedSection = await db.select()
        .from(missedSections)
        .where(sql`id = ${id} AND is_completed = false`)
        .limit(1);
      
      if (missedSection.length === 0) {
        return res.status(404).json({ error: 'Missed section not found or already completed' });
      }
      
      const section = missedSection[0];
      
      // Insert makeup attendance records
      for (const studentAttendance of attendanceData) {
        await db.insert(attendance).values({
          studentId: studentAttendance.studentId,
          rollNo: studentAttendance.rollNo,
          date: makeupDate,
          period: makeupPeriod,
          subjectId: section.subjectId,
          status: studentAttendance.status,
          courseType: section.courseType,
          courseName: section.courseDivision,
          section: section.section,
          batchYear: `${section.year}${section.courseType === 'pu' ? 'th PU' : 'th year'}`,
          createdBy: userId
        });
      }
      
      // Mark missed section as completed
      await db.update(missedSections)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          makeupDate: makeupDate,
          makeupPeriod: makeupPeriod,
          completedBy: userId,
          remarks: remarks || `Makeup completed on ${makeupDate}`,
          updatedAt: new Date()
        })
        .where(sql`id = ${id}`);
      
      console.log(`✅ Makeup completed for missed section: ${section.courseType} ${section.year} - ${makeupDate} Period ${makeupPeriod}`);
      
      res.json({
        success: true,
        message: 'Makeup attendance recorded successfully',
        missedSectionId: id,
        makeupDate: makeupDate,
        studentsCount: attendanceData.length
      });
      
    } catch (error) {
      console.error('❌ Makeup attendance failed:', error);
      res.status(500).json({ 
        error: 'Makeup attendance failed', 
        details: error.message 
      });
    }
  });

  // Legacy missed sections route (DISABLED - replaced by enhanced system above)
  /*
  app.get("/api/missed-sections", isAuthenticated, async (req, res) => {
    try {
      const { days = '30', courseType, year, courseDivision, section } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days as string));
      
      // Only check dates before today (after 12 AM rule)
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      
      console.log(`🔍 Checking missed sections from ${startDate.toISOString().split('T')[0]} to ${yesterdayDate.toISOString().split('T')[0]}`);
      console.log(`📋 Timetable logic: scheduled_date < current_date AND no_attendance_taken = MISSED`);
      console.log(`📋 Ignoring: "-" periods, Fridays (holidays), declared holidays`);

      console.log(`🔍 Missed sections query filters: courseType=${courseType}, year=${year}, courseDivision=${courseDivision}, section=${section}`);
      console.log(`📋 Applied timetable filters: Only subjects with codes (AP1, TJD1, FQH1, etc.), excluding "-" periods`);
      
      // Use Drizzle's safe sql`` template with parameterized queries
      const result = await db.execute(sql`
        WITH scheduled_classes AS (
          -- Get all scheduled classes for the date range
          SELECT 
            t.course_type,
            t.year,
            t.stream,
            t.section,
            t.day_of_week,
            t.period_number,
            t.subject_id,
            s.subject as subject_name,
            s.subject_code,
            t.start_time,
            t.end_time,
            ds.scheduled_date::date::text as scheduled_date,
            t.course_type || ' ' || t.year || 
            CASE WHEN t.stream IS NOT NULL THEN ' ' || t.stream ELSE '' END ||
            CASE WHEN t.section IS NOT NULL THEN ' Section ' || t.section ELSE '' END as class_name
          FROM timetable t
          JOIN subjects s ON t.subject_id = s.id
          CROSS JOIN generate_series(
            ${startDate.toISOString().split('T')[0]}::date,
            ${yesterdayDate.toISOString().split('T')[0]}::date,
            interval '1 day'
          ) ds(scheduled_date)
          WHERE t.course_type IS NOT NULL 
            AND t.year IS NOT NULL
            ${courseType ? sql`AND t.course_type = ${courseType}` : sql``}
            ${year ? sql`AND t.year = ${year}` : sql``}
            ${courseDivision ? sql`AND t.stream = ${courseDivision}` : sql``}
            ${section ? sql`AND t.section = ${section}` : sql``}
            -- Only previous days (12 AM rule)
            AND ds.scheduled_date < CURRENT_DATE
            -- Exclude Fridays (weekly holidays)  
            AND EXTRACT(DOW FROM ds.scheduled_date) != 5
            -- Only actual subjects (exclude "-" periods)
            AND s.subject_code != '-'
            AND s.subject_code IS NOT NULL
            AND s.subject_code != ''
            -- Match timetable day with actual date day
            AND t.day_of_week = CASE 
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 0 THEN 'sunday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 1 THEN 'monday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 2 THEN 'tuesday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 3 THEN 'wednesday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 4 THEN 'thursday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 5 THEN 'friday'
              WHEN EXTRACT(DOW FROM ds.scheduled_date) = 6 THEN 'saturday'
            END
        )
        SELECT 
          sc.*,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - (sc.scheduled_date::date + sc.end_time::time)))/3600 as missed_hours,
          'missed' as status
        FROM scheduled_classes sc
        LEFT JOIN attendance a ON (
          a.course_type = sc.course_type 
          AND a.course_name = sc.stream
          AND a.section = sc.section
          AND DATE(a.date) = sc.scheduled_date::date
          AND a.period = sc.period_number
        )
        LEFT JOIN holidays h ON sc.scheduled_date::date = h.date::date
        WHERE a.id IS NULL -- No attendance taken (MISSED)
          AND h.date IS NULL -- Exclude declared holidays
        ORDER BY sc.scheduled_date DESC, sc.period_number;
      `);
      const missedSections = result.rows;

      console.log(`📋 Found ${missedSections.length} missed sections (after filtering "-" periods and holidays)`);

      // Transform the results
      const transformedSections = missedSections.map((section: any) => ({
        id: `${section.course_type}-${section.year}-${section.stream}-${section.section}-${section.scheduled_date}-${section.period_number}`,
        courseType: section.course_type,
        year: section.year,
        stream: section.stream,
        section: section.section,
        dayOfWeek: section.day_of_week,
        periodNumber: section.period_number,
        subjectId: section.subject_id,
        subjectName: section.subject_name,
        subjectCode: section.subject_code,
        startTime: section.start_time,
        endTime: section.end_time,
        scheduledDate: section.scheduled_date,
        scheduledEndTime: section.end_time,
        status: section.status,
        className: section.class_name,
        missedHours: Math.round(section.missed_hours || 0)
      }));

      res.json({
        missedSections: transformedSections,
        totalCount: transformedSections.length,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: yesterdayDate.toISOString().split('T')[0]
        }
      });
      
    } catch (error) {
      console.error('Error fetching missed sections:', error);
      res.status(500).json({ error: "Failed to fetch missed sections" });
    }
  });
  */

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const { studentId, date, period } = req.query;
      const filters: any = {};
      
      // Validate and parse query parameters
      if (studentId) {
        const parsedStudentId = parseInt(studentId as string);
        if (isNaN(parsedStudentId)) {
          return res.status(400).json({ message: "studentId must be a valid number" });
        }
        filters.studentId = parsedStudentId;
      }
      
      if (date) filters.date = date;
      if (period) filters.period = period;
      
      const attendance = await storage.getAttendanceByFilter(filters);
      
      // Ensure we always return an array
      const result = Array.isArray(attendance) ? attendance : [];
      res.json(result);
    } catch (error) {
      console.error("Get attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      // Validate request body structure
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: "Invalid request body" });
      }

      // Ensure required fields are present
      const { studentId, date, period, status, createdBy } = req.body;
      if (!studentId || !date || !period || !status || !createdBy) {
        return res.status(400).json({ 
          message: "Missing required fields: studentId, date, period, status, createdBy" 
        });
      }

      // Validate field types
      if (typeof studentId !== 'number' || typeof createdBy !== 'number') {
        return res.status(400).json({ message: "studentId and createdBy must be numbers" });
      }

      if (!['present', 'absent', 'emergency-leave'].includes(status)) {
        return res.status(400).json({ message: "status must be 'present', 'absent', or 'emergency-leave'" });
      }

      const attendance = await storage.createAttendance(req.body);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Create attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Namaz attendance routes
  app.get("/api/namaz-attendance", async (req, res) => {
    console.log("🚀 API CALLED: /api/namaz-attendance");
    try {
      const { studentId, date, prayer } = req.query;
      
      // Get all namaz attendance records from storage
      const allRecords = await storage.getNamazAttendanceByFilter({});
      
      console.log(`📊 Total namaz records found: ${allRecords.length}`);
      
      // Group records by student-date-prayer combination and keep only the latest
      const latestRecordsMap = new Map<string, any>();
      
      allRecords.forEach((record: any) => {
        const key = `${record.studentId}-${record.date}-${record.prayer}`;
        const existing = latestRecordsMap.get(key);
        
        if (!existing || new Date(record.createdAt) > new Date(existing.createdAt)) {
          latestRecordsMap.set(key, record);
          console.log(`📝 Latest for ${key}: ${record.status} (${record.createdAt})`);
        }
      });
      
      // Convert map back to array
      let records = Array.from(latestRecordsMap.values());
      console.log(`🔍 Latest records count before filtering: ${records.length}`);
      
      // Apply filters
      if (studentId) {
        records = records.filter(record => record.studentId === parseInt(studentId as string));
      }
      if (date) {
        records = records.filter(record => record.date === date);
      }
      if (prayer) {
        records = records.filter(record => record.prayer === prayer);
      }
      
      res.json(records);
    } catch (error) {
      console.error("Get namaz attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/namaz-attendance", isAuthenticated, async (req, res) => {
    try {
      const { date, prayer, students } = req.body;
      console.log(`🕌 Namaz attendance saved: ${prayer} on ${date} for ${students.length} students`);
      
      // Process each student record
      const savedRecords = [];
      for (const student of students) {
        const namazRecord = await storage.createNamazAttendance({
          studentId: student.id,
          date: date,
          prayer: prayer,
          status: student.status,
          createdBy: req.session.user.id
        });
        savedRecords.push(namazRecord);
      }
      
      res.status(201).json({
        message: `Saved ${savedRecords.length} namaz attendance records`,
        records: savedRecords
      });
    } catch (error) {
      console.error("Create namaz attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Namaz history endpoint - fetch from attendance data with 'namaz' period type
  app.get("/api/namaz-attendance/history", async (req, res) => {
    try {
      const { startDate, endDate, selectedStudent, selectedPrayer } = req.query;
      
      // Fetch attendance records with 'namaz' type from the same attendance system
      const allAttendanceRecords = await storage.getAttendanceByFilter({});
      
      // Filter for namaz attendance records (period type contains prayer name)
      let namazRecords = allAttendanceRecords.filter((record: any) => {
        // Check if this is a namaz attendance record (period contains prayer name)
        const isNamazRecord = record.period && 
          ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].includes(record.period.toString().toLowerCase());
        
        if (!isNamazRecord) return false;
        
        const recordDate = record.date;
        const prayer = record.period.toString().toLowerCase();
        
        const withinDateRange = (!startDate || recordDate >= startDate) && 
                               (!endDate || recordDate <= endDate);
        const matchesPrayer = !selectedPrayer || selectedPrayer === 'all' || prayer === selectedPrayer;
        const matchesStudent = !selectedStudent || selectedStudent === 'all' || record.studentId === parseInt(selectedStudent as string);
        
        return withinDateRange && matchesPrayer && matchesStudent;
      });
      
      // Transform attendance records to namaz format
      namazRecords = namazRecords.map((record: any) => ({
        id: record.id,
        studentId: record.studentId,
        date: record.date,
        prayer: record.period.toString().toLowerCase(),
        status: record.status,
        createdAt: record.createdAt
      }));
      
      // Group by date and prayer, then calculate stats
      const groupedData = namazRecords.reduce((acc: any, record: any) => {
        const key = `${record.date}-${record.prayer}`;
        if (!acc[key]) {
          acc[key] = {
            date: record.date,
            prayer: record.prayer,
            records: [],
            presentCount: 0,
            totalCount: 0
          };
        }
        acc[key].records.push(record);
        acc[key].totalCount++;
        if (record.status === 'present') {
          acc[key].presentCount++;
        }
        return acc;
      }, {});
      
      const historyData = Object.values(groupedData).sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      res.json(historyData);
    } catch (error) {
      console.error("Get namaz history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Namaz statistics endpoint - fetch from attendance data
  app.get("/api/namaz-attendance/stats", async (req, res) => {
    try {
      // Fetch attendance records from the same attendance system
      const allAttendanceRecords = await storage.getAttendanceByFilter({});
      
      // Filter for namaz attendance records only
      const namazRecords = allAttendanceRecords.filter((record: any) => {
        return record.period && 
          ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].includes(record.period.toString().toLowerCase());
      });
      
      const stats = {
        fajr: { total: 0, present: 0 },
        zuhr: { total: 0, present: 0 },
        asr: { total: 0, present: 0 },
        maghrib: { total: 0, present: 0 },
        isha: { total: 0, present: 0 }
      };
      
      namazRecords.forEach((record: any) => {
        const prayer = record.period.toString().toLowerCase();
        if (stats[prayer as keyof typeof stats]) {
          stats[prayer as keyof typeof stats].total++;
          if (record.status === 'present') {
            stats[prayer as keyof typeof stats].present++;
          }
        }
      });
      
      // Calculate percentages
      const statsWithPercentages = Object.entries(stats).map(([prayer, data]) => ({
        prayer,
        total: data.total,
        present: data.present,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }));
      
      res.json(statsWithPercentages);
    } catch (error) {
      console.error("Get namaz stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete namaz attendance endpoint
  app.delete("/api/namaz-attendance/:date/:prayer", isAuthenticated, async (req, res) => {
    try {
      const { date, prayer } = req.params;
      
      // Get all attendance records for this date and prayer
      const records = await storage.getNamazAttendanceByFilter({ date, prayer });
      
      // Delete each record
      for (const record of records) {
        await storage.deleteNamazAttendance(record.id);
      }
      
      res.json({ message: "Attendance reset successfully" });
    } catch (error) {
      console.error("Delete namaz attendance error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Leaves routes
  app.get("/api/leaves", async (req, res) => {
    try {
      const { studentId, status, fromDate, toDate } = req.query;
      const filters: any = {};
      
      if (studentId) filters.studentId = parseInt(studentId as string);
      if (status) filters.status = status;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      
      const leaves = await storage.getLeaveByFilter(filters);
      res.json(leaves);
    } catch (error) {
      console.error("Get leaves error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leaves", isAuthenticated, async (req, res) => {
    try {
      const leave = await storage.createLeave(req.body);
      res.status(201).json(leave);
    } catch (error) {
      console.error("Create leave error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Results routes
  app.get("/api/results", async (req, res) => {
    try {
      const results = await storage.getResultByFilter({});
      res.json(results);
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/results", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.createResult(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Create result error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/results/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteResult(id);
      if (success) {
        res.json({ message: "Result deleted successfully" });
      } else {
        res.status(404).json({ message: "Result not found" });
      }
    } catch (error) {
      console.error("Delete result error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remarks routes
  app.get("/api/remarks", async (req, res) => {
    try {
      const { studentId, category, submittedBy } = req.query;
      const filters: any = {};
      
      if (studentId) filters.studentId = parseInt(studentId as string);
      if (category) filters.category = category;
      if (submittedBy) filters.submittedBy = parseInt(submittedBy as string);
      
      const remarks = await storage.getRemarkByFilter(filters);
      res.json(remarks);
    } catch (error) {
      console.error("Get remarks error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/remarks", async (req, res) => {
    try {
      const remark = await storage.createRemark(req.body);
      res.status(201).json(remark);
    } catch (error) {
      console.error("Create remark error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subjects routes - class-specific subject management
  app.get("/api/subjects", async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      const filters: any = {};
      
      // Class-specific filtering - all fields are now required for precise class matching
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section !== undefined) filters.section = section; // Allow empty string for no sections
      
      console.log(`📚 Fetching subjects for class:`, { courseType, year, stream, section });
      
      const subjects = await storage.getSubjects(filters);
      
      console.log(`📚 Found ${subjects.length} subjects for class combination`);
      
      res.json(subjects);
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      // Add class-specific validation for subject creation
      const { subject, subjectCode, courseType, year, stream, section } = req.body;
      
      if (!subject || !subjectCode || !courseType || !year) {
        return res.status(400).json({ 
          error: "Missing required fields: subject, subjectCode, courseType, and year are required" 
        });
      }
      
      const subjectData = {
        ...req.body,
        createdBy: req.session.user.id,
        updatedAt: new Date()
      };
      
      console.log(`📝 Creating subject for class:`, { 
        courseType, year, stream, section, 
        subject, subjectCode 
      });
      
      const newSubject = await storage.createSubject(subjectData);
      
      console.log(`✅ Subject created successfully: ${subject} (${subjectCode}) for ${courseType} ${year}`);
      
      res.status(201).json(newSubject);
    } catch (error) {
      console.error("Create subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subject = await storage.updateSubject(id, req.body);
      if (subject) {
        res.json(subject);
      } else {
        res.status(404).json({ message: "Subject not found" });
      }
    } catch (error) {
      console.error("Update subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSubject(id);
      if (success) {
        res.json({ message: "Subject deleted successfully" });
      } else {
        res.status(404).json({ message: "Subject not found" });
      }
    } catch (error) {
      console.error("Delete subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Timetable routes
  app.get("/api/timetable", async (req, res) => {
    try {
      const { courseType, year, stream, section, dayOfWeek } = req.query;
      const filters: any = {};
      
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      if (dayOfWeek) filters.dayOfWeek = dayOfWeek;
      
      const timetable = await storage.getTimetable(filters);
      res.json(timetable);
    } catch (error) {
      console.error("Get timetable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const timetableData = { ...req.body, createdBy: req.session.user.id };
      const entry = await storage.createTimetableEntry(timetableData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Create timetable entry error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.updateTimetableEntry(id, req.body);
      if (entry) {
        res.json(entry);
      } else {
        res.status(404).json({ message: "Timetable entry not found" });
      }
    } catch (error) {
      console.error("Update timetable entry error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTimetableEntry(id);
      if (success) {
        res.json({ message: "Timetable entry deleted successfully" });
      } else {
        res.status(404).json({ message: "Timetable entry not found" });
      }
    } catch (error) {
      console.error("Delete timetable entry error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/timetable/bulk", isAuthenticated, async (req, res) => {
    try {
      const entries = req.body.entries.map((entry: any) => ({
        ...entry,
        createdBy: req.session.user.id
      }));
      const results = await storage.bulkCreateTimetable(entries);
      res.status(201).json(results);
    } catch (error) {
      console.error("Bulk create timetable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Holidays routes
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidays = await storage.getHolidayByFilter({});
      res.json(holidays);
    } catch (error) {
      console.error("Get holidays error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const holiday = await storage.createHoliday(req.body);
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Create holiday error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Emergency leave auto-marking endpoint
  app.post("/api/emergency-leave/process", isAuthenticated, async (req, res) => {
    try {
      const { date, reason, affectedCourses } = req.body;
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Create emergency holiday record
      const emergencyHoliday = await storage.createHoliday({
        date,
        name: "Emergency Holiday",
        type: "emergency",
        reason,
        affectedCourses,
        triggeredAt: currentTime,
        pdfUrl: null,
        createdBy: req.session.user.id
      });

      // Get all students for affected courses
      const allStudents = await storage.getStudents();
      const affectedStudents = allStudents.filter(student => 
        affectedCourses.includes(student.courseType)
      );

      // Get period configurations for each course/year combination
      const periodConfigurations = {
        'pu_1': 3, 'pu_2': 3, // PU College 1st and 2nd year
        'post-pu_3': 6, 'post-pu_4': 6, 'post-pu_5': 6, // Post-PUC 3rd-5th year  
        'post-pu_6': 8, 'post-pu_7': 8, // Post-PUC 6th-7th year
        'pu_3': 6, 'pu_4': 6, 'pu_5': 6, // PU College 3rd-5th year
        'pu_6': 8, 'pu_7': 8 // PU College 6th-7th year
      };

      let autoMarkedCount = 0;
      
      // Process each affected student
      for (const student of affectedStudents) {
        const configKey = `${student.courseType}_${student.year}`;
        const totalPeriods = periodConfigurations[configKey] || 3;

        // Get existing attendance for this student on this date
        const existingAttendance = await storage.getAttendanceByFilter({
          studentId: student.id,
          date: date
        });

        const markedPeriods = existingAttendance.map(a => a.period);

        // Auto-mark remaining periods as emergency leave
        for (let periodNum = 1; periodNum <= totalPeriods; periodNum++) {
          const periodId = periodNum.toString();
          
          if (!markedPeriods.includes(periodId)) {
            await storage.createAttendance({
              studentId: student.id,
              date: date,
              period: periodId,
              status: "emergency-leave",
              reason: reason,
              isAutoMarked: true,
              createdBy: req.session.user.id
            });
            autoMarkedCount++;
          }
        }
      }

      res.json({
        message: "Emergency leave processed successfully",
        emergencyHoliday,
        affectedStudentsCount: affectedStudents.length,
        autoMarkedPeriodsCount: autoMarkedCount,
        triggeredAt: currentTime
      });

    } catch (error) {
      console.error("Emergency leave processing error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Emergency Leave API - New implementation for period-specific emergency leave
  app.post("/api/emergency-leave/declare", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmergencyLeaveSchema.parse(req.body);
      
      // Calculate remaining periods based on current time
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      
      // Define period schedules (you can adjust these)
      let remainingPeriods: string[] = [];
      
      if (validatedData.courseType === 'pu') {
        // PU has 3 periods: assume 9-10, 10:15-11:15, 11:30-12:30
        const periods = ['1', '2', '3'];
        const periodTimes = [
          { period: '1', startHour: 9, startMin: 0 },
          { period: '2', startHour: 10, startMin: 15 },
          { period: '3', startHour: 11, startMin: 30 }
        ];
        
        remainingPeriods = periodTimes
          .filter(p => currentHour < p.startHour || (currentHour === p.startHour && currentMinute < p.startMin))
          .map(p => p.period);
      } else {
        // Post-PU periods depend on year
        const totalPeriods = validatedData.year === '6' || validatedData.year === '7' ? 8 : 6;
        const allPeriods = Array.from({ length: totalPeriods }, (_, i) => (i + 1).toString());
        
        // Simple calculation: assume 1 period per hour starting at 9 AM
        const currentPeriod = Math.max(1, currentHour - 8);
        remainingPeriods = allPeriods.slice(currentPeriod);
      }

      const emergencyLeaveData = {
        ...validatedData,
        affectedPeriods: remainingPeriods,
        appliedBy: req.session.user.id
      };

      const [newEmergencyLeave] = await db
        .insert(emergencyLeave)
        .values(emergencyLeaveData)
        .returning();

      // Auto-mark remaining periods as emergency leave for all students in this class
      const classStudents = await db
        .select()
        .from(students)
        .where(
          sql`${students.courseType} = ${validatedData.courseType} 
              AND ${students.year} = ${validatedData.year} 
              ${validatedData.courseDivision ? sql`AND ${students.courseDivision} = ${validatedData.courseDivision}` : sql``}`
        );

      // Insert emergency attendance records for remaining periods
      const emergencyAttendanceRecords = [];
      for (const student of classStudents) {
        for (const period of remainingPeriods) {
          emergencyAttendanceRecords.push({
            studentId: student.id,
            rollNo: student.rollNo,
            date: validatedData.date,
            period: parseInt(period),
            status: 'emergency',
            courseType: validatedData.courseType,
            courseName: validatedData.courseDivision || validatedData.courseType,
            section: validatedData.section,
            batchYear: `${validatedData.year}${validatedData.courseType === 'pu' ? 'st PU' : 'th year'}`,
            createdBy: req.session.user.id
          });
        }
      }

      if (emergencyAttendanceRecords.length > 0) {
        await db.insert(attendance).values(emergencyAttendanceRecords);
      }

      res.json({ 
        emergencyLeave: newEmergencyLeave,
        affectedPeriods: remainingPeriods,
        affectedStudents: classStudents.length
      });

    } catch (error) {
      console.error("Emergency leave declaration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/emergency-leave/check", async (req, res) => {
    try {
      const { date, courseType, year, courseDivision, section } = req.query;

      const [emergencyLeaveRecord] = await db
        .select()
        .from(emergencyLeave)
        .where(
          sql`${emergencyLeave.date} = ${date} 
              AND ${emergencyLeave.courseType} = ${courseType}
              AND ${emergencyLeave.year} = ${year}
              AND ${emergencyLeave.section} = ${section || 'A'}
              AND ${emergencyLeave.isActive} = true
              ${courseDivision ? sql`AND ${emergencyLeave.courseDivision} = ${courseDivision}` : sql``}`
        );

      res.json({ emergencyLeave: emergencyLeaveRecord || null });

    } catch (error) {
      console.error("Emergency leave check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/emergency-leave", async (req, res) => {
    try {
      const { date, courseType, year, courseDivision, section } = req.query;
      
      let whereConditions = [sql`${emergencyLeave.isActive} = true`];
      
      if (date) whereConditions.push(sql`${emergencyLeave.date} = ${date}`);
      if (courseType) whereConditions.push(sql`${emergencyLeave.courseType} = ${courseType}`);
      if (year) whereConditions.push(sql`${emergencyLeave.year} = ${year}`);
      if (section) whereConditions.push(sql`${emergencyLeave.section} = ${section}`);
      if (courseDivision) whereConditions.push(sql`${emergencyLeave.courseDivision} = ${courseDivision}`);

      const emergencyLeaves = await db
        .select()
        .from(emergencyLeave)
        .where(sql`${whereConditions.join(sql` AND `)}`);

      res.json({ emergencyLeaves });

    } catch (error) {
      console.error("Emergency leave fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/emergency-leave/:id/deactivate", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      await db
        .update(emergencyLeave)
        .set({ isActive: false })
        .where(sql`${emergencyLeave.id} = ${id}`);

      res.json({ message: "Emergency leave deactivated" });

    } catch (error) {
      console.error("Emergency leave deactivation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subject Management API endpoints
  app.get("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      
      const subjects = await storage.getSubjectByFilter(filters);
      res.json(subjects);
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      const subjectData = req.body;
      
      // Validate required fields
      if (!subjectData.subject || !subjectData.subjectCode || !subjectData.courseType || 
          !subjectData.year || !subjectData.section) {
        return res.status(400).json({ error: "Missing required subject fields" });
      }

      // Create subject using storage layer
      const subjectRecord = {
        subject: subjectData.subject,
        subjectCode: subjectData.subjectCode.toUpperCase(),
        courseType: subjectData.courseType,
        year: subjectData.year,
        stream: subjectData.stream || null,
        section: subjectData.section,
        createdBy: req.session.user.id
      };
      
      const result = await storage.createSubject(subjectRecord);
      
      console.log(`📚 Subject created: ${subjectData.subject} (${subjectData.subjectCode}) for ${subjectData.courseType} ${subjectData.year}`);
      
      res.json({ success: true, subject: result });
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ error: "Failed to create subject" });
    }
  });

  app.patch("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Convert subject code to uppercase if present
      if (updateData.subjectCode) {
        updateData.subjectCode = updateData.subjectCode.toUpperCase();
      }

      const updatedSubject = await storage.updateSubject(id, updateData);

      if (!updatedSubject) {
        return res.status(404).json({ error: "Subject not found" });
      }

      console.log(`📚 Subject updated: ${updatedSubject.subject}`);
      
      res.json({ success: true, subject: updatedSubject });
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ error: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success = await storage.deleteSubject(id);

      if (!success) {
        return res.status(404).json({ error: "Subject not found" });
      }

      console.log(`🗑️ Subject deleted: ID ${id}`);
      
      res.json({ success: true, message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ error: "Failed to delete subject" });
    }
  });

  // Timetable Management API endpoints
  app.get("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section, dayOfWeek } = req.query;
      
      const filters: any = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (stream) filters.stream = stream;
      if (section) filters.section = section;
      if (dayOfWeek) filters.dayOfWeek = dayOfWeek;
      
      const timetableEntries = await storage.getTimetableByFilter(filters);
      res.json(timetableEntries);
    } catch (error) {
      console.error("Get timetable error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/timetable", isAuthenticated, async (req, res) => {
    try {
      const timetableData = req.body;
      
      // Validate required fields
      if (!timetableData.courseType || !timetableData.year || !timetableData.section || 
          !timetableData.dayOfWeek || !timetableData.periodNumber) {
        return res.status(400).json({ error: "Missing required timetable fields" });
      }

      // Create timetable entry using storage layer
      const timetableRecord = {
        courseType: timetableData.courseType,
        year: timetableData.year,
        stream: timetableData.stream || null,
        section: timetableData.section,
        dayOfWeek: timetableData.dayOfWeek,
        periodNumber: parseInt(timetableData.periodNumber),
        subjectId: timetableData.subjectId || null,
        startTime: timetableData.startTime || null,
        endTime: timetableData.endTime || null,
        createdBy: req.session.user.id
      };
      
      const result = await storage.createTimetable(timetableRecord);
      
      console.log(`📅 Timetable entry created: ${timetableData.dayOfWeek} Period ${timetableData.periodNumber} for ${timetableData.courseType} ${timetableData.year}`);
      
      res.json({ success: true, timetable: result });
    } catch (error) {
      console.error("Error creating timetable entry:", error);
      res.status(500).json({ error: "Failed to create timetable entry" });
    }
  });

  app.patch("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const updatedTimetable = await storage.updateTimetable(id, updateData);

      if (!updatedTimetable) {
        return res.status(404).json({ error: "Timetable entry not found" });
      }

      console.log(`📅 Timetable entry updated: ID ${id}`);
      
      res.json({ success: true, timetable: updatedTimetable });
    } catch (error) {
      console.error("Error updating timetable entry:", error);
      res.status(500).json({ error: "Failed to update timetable entry" });
    }
  });

  app.delete("/api/timetable/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success = await storage.deleteTimetable(id);

      if (!success) {
        return res.status(404).json({ error: "Timetable entry not found" });
      }

      console.log(`🗑️ Timetable entry deleted: ID ${id}`);
      
      res.json({ success: true, message: "Timetable entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
      res.status(500).json({ error: "Failed to delete timetable entry" });
    }
  });

  // Bulk delete timetable entries for a class
  app.post("/api/timetable/bulk-delete", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.body;
      
      const filters: any = {
        courseType,
        year,
        section
      };
      if (stream) filters.stream = stream;
      
      const existingEntries = await storage.getTimetableByFilter(filters);
      
      for (const entry of existingEntries) {
        await storage.deleteTimetable(entry.id);
      }

      console.log(`🗑️ Bulk deleted ${existingEntries.length} timetable entries for ${courseType} ${year}`);
      
      res.json({ success: true, message: `${existingEntries.length} timetable entries deleted` });
    } catch (error) {
      console.error("Error bulk deleting timetable entries:", error);
      res.status(500).json({ error: "Failed to bulk delete timetable entries" });
    }
  });

  app.post("/api/periods/bulk", isAuthenticated, async (req, res) => {
    try {
      const { periods: periodsList, courseType, year, courseDivision } = req.body;
      
      if (!Array.isArray(periodsList) || periodsList.length === 0) {
        return res.status(400).json({ error: "Periods array is required" });
      }

      // Delete existing periods for this class first
      await db
        .delete(periods)
        .where(
          sql`${periods.courseType} = ${courseType} 
              AND ${periods.year} = ${year}
              ${courseDivision ? sql`AND ${periods.courseDivision} = ${courseDivision}` : sql``}`
        );

      // Insert new periods - let database handle timestamps automatically
      const periodRecords = periodsList.map((period, index) => ({
        name: period.name,
        courseType: courseType,
        courseDivision: courseDivision || null,
        year: year,
        periodNumber: index + 1,
        startTime: period.startTime,
        endTime: period.endTime,
        createdBy: req.session.user.id
      }));
      
      console.log('📝 Creating bulk periods with data:', periodRecords);

      const createdPeriods = await db.insert(periods).values(periodRecords).returning();
      
      console.log(`📝 Bulk periods created: ${createdPeriods.length} periods for ${courseType} ${year}`);
      
      res.json({ success: true, periods: createdPeriods });
    } catch (error) {
      console.error("Error creating bulk periods:", error);
      res.status(500).json({ error: "Failed to create periods" });
    }
  });

  // Bulk attendance sync endpoint for offline data
  app.post("/api/attendance/bulk", isAuthenticated, async (req, res) => {
    try {
      const { records } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "Records array is required" });
      }

      const createdRecords = [];
      const errors = [];

      for (const record of records) {
        try {
          const attendance = await storage.createAttendance({
            studentId: record.studentId,
            date: record.date,
            period: record.period,
            status: record.status,
            reason: record.reason || null,
            isAutoMarked: record.isAutoMarked || false,
            createdBy: record.createdBy
          });
          createdRecords.push(attendance);
        } catch (error) {
          errors.push({ record, error: error.message });
        }
      }

      res.json({
        message: `Bulk attendance sync completed`,
        created: createdRecords.length,
        errors: errors.length,
        data: createdRecords,
        errorDetails: errors
      });

    } catch (error) {
      console.error("Bulk attendance sync error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk namaz attendance sync endpoint
  app.post("/api/namaz-attendance/bulk", isAuthenticated, async (req, res) => {
    try {
      const { records } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "Records array is required" });
      }

      const createdRecords = [];
      const errors = [];

      for (const record of records) {
        try {
          const namazAttendance = await storage.createNamazAttendance({
            studentId: record.studentId,
            date: record.date,
            prayer: record.prayer,
            status: record.status,
            createdBy: record.createdBy
          });
          createdRecords.push(namazAttendance);
        } catch (error) {
          errors.push({ record, error: error.message });
        }
      }

      res.json({
        message: `Bulk namaz attendance sync completed`,
        created: createdRecords.length,
        errors: errors.length,
        data: createdRecords,
        errorDetails: errors
      });

    } catch (error) {
      console.error("Bulk namaz attendance sync error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Missed Attendance API routes
  app.get("/api/missed-attendance", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, courseType, year, courseDivision, section } = req.query;
      
      // Build query conditions
      const conditions = [];
      if (startDate) conditions.push(sql`date >= ${startDate}`);
      if (endDate) conditions.push(sql`date <= ${endDate}`);
      if (courseType) conditions.push(sql`course_type = ${courseType}`);
      if (year) conditions.push(sql`year = ${year}`);
      if (courseDivision) conditions.push(sql`course_division = ${courseDivision}`);
      if (section) conditions.push(sql`section = ${section}`);
      
      let query = db.select().from(missedAttendanceStatus);
      if (conditions.length > 0) {
        query = query.where(sql.join(conditions, sql` AND `));
      }
      
      const missedRecords = await query.orderBy(missedAttendanceStatus.date, missedAttendanceStatus.period);
      
      res.json(missedRecords);
    } catch (error) {
      console.error('Error fetching missed attendance:', error);
      res.status(500).json({ error: 'Failed to fetch missed attendance records' });
    }
  });

  app.post("/api/missed-attendance/check", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.body;
      
      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }
      
      // Auto-check for missed attendance after 12 AM
      const checkDate = new Date(date);
      const currentDate = new Date();
      
      // Only check for past dates
      if (checkDate >= currentDate) {
        return res.json({ message: 'Cannot check future dates' });
      }
      
      // Get all possible class configurations
      const classConfigs = [
        // PU Commerce
        { courseType: 'pu', year: '1', courseDivision: 'commerce', sections: ['A', 'B'], periods: 3 },
        { courseType: 'pu', year: '2', courseDivision: 'commerce', sections: ['A', 'B'], periods: 3 },
        // PU Science
        { courseType: 'pu', year: '1', courseDivision: 'science', sections: ['A'], periods: 3 },
        { courseType: 'pu', year: '2', courseDivision: 'science', sections: ['A'], periods: 3 },
        // Post-PU
        { courseType: 'post-pu', year: '3', courseDivision: null, sections: ['A'], periods: 7 },
        { courseType: 'post-pu', year: '4', courseDivision: null, sections: ['A'], periods: 7 },
        { courseType: 'post-pu', year: '5', courseDivision: null, sections: ['A'], periods: 8 },
        { courseType: 'post-pu', year: '6', courseDivision: null, sections: ['A'], periods: 8 },
        { courseType: 'post-pu', year: '7', courseDivision: null, sections: ['A'], periods: 8 },
      ];
      
      const processedRecords = [];
      
      for (const config of classConfigs) {
        for (const section of config.sections) {
          for (let period = 1; period <= config.periods; period++) {
            // Check if holiday
            const holiday = await db.select().from(holidays).where(sql`date = ${date}`).limit(1);
            if (holiday.length > 0) {
              await insertOrUpdateMissedStatus({
                date, ...config, section, period, status: 'holiday'
              });
              continue;
            }
            
            // Check if emergency leave
            const emergencyLeave = await db.select().from(leaves)
              .where(sql`from_date <= ${date} AND to_date >= ${date} AND status = 'emergency'`)
              .limit(1);
            if (emergencyLeave.length > 0) {
              await insertOrUpdateMissedStatus({
                date, ...config, section, period, status: 'emergency'
              });
              continue;
            }
            
            // Check if attendance was taken by looking for any attendance record for this class and period
            let attendanceExists = [];
            if (config.courseDivision) {
              attendanceExists = await db.select().from(attendance)
                .where(sql`date = ${date} AND period = ${period} AND course_type = ${config.courseType} AND course_name = ${config.courseDivision}`)
                .limit(1);
            } else {
              attendanceExists = await db.select().from(attendance)
                .where(sql`date = ${date} AND period = ${period} AND course_type = ${config.courseType}`)
                .limit(1);
            }
            
            const status = attendanceExists.length > 0 ? 'taken' : 'not_taken';
            await insertOrUpdateMissedStatus({
              date, ...config, section, period, status
            });
            
            processedRecords.push({ date, ...config, section, period, status });
          }
        }
      }
      
      res.json({ message: 'Missed attendance check completed', processed: processedRecords.length });
    } catch (error) {
      console.error('Error checking missed attendance:', error);
      res.status(500).json({ error: 'Failed to check missed attendance' });
    }
  });

  app.post("/api/missed-attendance/take", isAuthenticated, async (req, res) => {
    try {
      const { date, courseType, year, courseDivision, section, period, students } = req.body;
      
      if (!date || !courseType || !year || !period || !students) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Save attendance for each student
      const attendanceRecords = [];
      for (const studentData of students) {
        const student = await storage.getStudent(studentData.studentId);
        if (!student) continue;
        
        const attendanceRecord = {
          studentId: studentData.studentId,
          rollNo: student.rollNo,
          date,
          period: parseInt(period),
          status: studentData.status,
          courseType,
          courseName: student.courseDivision,
          section: student.batch,
          batchYear: `${student.year}${student.courseType === 'pu' ? ' PU' : ' Year'}`,
          createdBy: req.session.user.id,
        };
        
        await storage.createAttendance(attendanceRecord);
        attendanceRecords.push(attendanceRecord);
      }
      
      // Update missed attendance status
      await insertOrUpdateMissedStatus({
        date, courseType, year, courseDivision, section, period,
        status: 'taken',
        takenBy: req.session.user.id,
        timestamp: new Date(),
        studentCount: students.length,
        attendanceKey: `attendance_${courseType}_${year}_${courseDivision || ''}_${section}_${date}_${period}`
      });
      
      res.json({ message: 'Attendance taken successfully', records: attendanceRecords.length });
    } catch (error) {
      console.error('Error taking missed attendance:', error);
      res.status(500).json({ error: 'Failed to take attendance' });
    }
  });

  // Helper function to insert or update missed attendance status
  async function insertOrUpdateMissedStatus(data: any) {
    try {
      const existing = await db.execute(sql`
        SELECT * FROM missed_attendance_status 
        WHERE date = ${data.date} 
        AND course_type = ${data.courseType} 
        AND year = ${data.year} 
        AND section = ${data.section} 
        AND period = ${data.period}
        LIMIT 1
      `);
      
      if (existing.length > 0) {
        // Update existing record using direct SQL
        await db.execute(sql`
          UPDATE missed_attendance_status 
          SET status = ${data.status}, 
              taken_by = ${data.takenBy || null}, 
              timestamp = ${data.timestamp || null}, 
              student_count = ${data.studentCount || 0}, 
              attendance_key = ${data.attendanceKey || null},
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `);
      } else {
        // Insert new record using direct SQL to match table structure
        await db.execute(sql`
          INSERT INTO missed_attendance_status 
          (date, course_type, year, course_division, section, period, status, taken_by, timestamp, student_count, attendance_key)
          VALUES (${data.date}, ${data.courseType}, ${data.year}, ${data.courseDivision || null}, ${data.section}, ${data.period}, ${data.status}, ${data.takenBy || null}, ${data.timestamp || null}, ${data.studentCount || 0}, ${data.attendanceKey || null})
        `);
      }
    } catch (error) {
      console.error('Error inserting/updating missed status:', error);
    }
  }

  // Period Configuration API endpoints
  app.get("/api/period-definitions", async (req, res) => {
    try {
      const periodDefs = await db.select().from(periodDefinitions).where(sql`is_active = true`);
      res.json(periodDefs);
    } catch (error) {
      console.error("Get period definitions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/period-definitions", isAuthenticated, async (req, res) => {
    try {
      const { periodNumber, startTime, endTime, label } = req.body;
      
      const [newPeriod] = await db.insert(periodDefinitions)
        .values({
          periodNumber,
          startTime,
          endTime,
          label,
          isActive: true
        })
        .returning();
      
      res.json({ success: true, period: newPeriod });
    } catch (error) {
      console.error("Create period definition error:", error);
      res.status(500).json({ error: "Failed to create period definition" });
    }
  });

  app.patch("/api/period-definitions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const [updatedPeriod] = await db.update(periodDefinitions)
        .set(updateData)
        .where(sql`id = ${id}`)
        .returning();
      
      if (!updatedPeriod) {
        return res.status(404).json({ error: "Period definition not found" });
      }
      
      res.json({ success: true, period: updatedPeriod });
    } catch (error) {
      console.error("Update period definition error:", error);
      res.status(500).json({ error: "Failed to update period definition" });
    }
  });

  // Timetable Period Configuration endpoints
  app.get("/api/timetable-period-config", async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      let query = db.select().from(timetablePeriodConfig);
      const conditions = [];
      
      if (courseType) conditions.push(sql`course_type = ${courseType}`);
      if (year) conditions.push(sql`year = ${year}`);
      if (stream) conditions.push(sql`stream = ${stream}`);
      if (section) conditions.push(sql`section = ${section}`);
      
      if (conditions.length > 0) {
        query = query.where(sql.join(conditions, sql` AND `));
      }
      
      const configs = await query;
      res.json(configs);
    } catch (error) {
      console.error("Get timetable period config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/timetable-period-config", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section, defaultPeriods, customDayPeriods } = req.body;
      
      // Check if config already exists
      const existing = await db.select().from(timetablePeriodConfig)
        .where(sql`course_type = ${courseType} AND year = ${year} AND 
                   COALESCE(stream, '') = COALESCE(${stream || ''}, '') AND 
                   COALESCE(section, '') = COALESCE(${section || ''}, '')`);
      
      if (existing.length > 0) {
        // Update existing config
        const [updated] = await db.update(timetablePeriodConfig)
          .set({
            defaultPeriods,
            customDayPeriods: customDayPeriods ? JSON.stringify(customDayPeriods) : null,
            updatedBy: req.session.user.id,
            updatedAt: new Date()
          })
          .where(sql`id = ${existing[0].id}`)
          .returning();
        
        res.json({ success: true, config: updated });
      } else {
        // Create new config
        const [newConfig] = await db.insert(timetablePeriodConfig)
          .values({
            courseType,
            year,
            stream,
            section,
            defaultPeriods,
            customDayPeriods: customDayPeriods ? JSON.stringify(customDayPeriods) : null,
            updatedBy: req.session.user.id
          })
          .returning();
        
        res.json({ success: true, config: newConfig });
      }
    } catch (error) {
      console.error("Create/update timetable period config error:", error);
      res.status(500).json({ error: "Failed to save period configuration" });
    }
  });

  app.get("/api/class-periods/:courseType/:year", async (req, res) => {
    try {
      const { courseType, year } = req.params;
      const { stream, section } = req.query;
      
      // Get period configuration for this class
      const config = await db.select().from(timetablePeriodConfig)
        .where(sql`course_type = ${courseType} AND year = ${year} AND 
                   COALESCE(stream, '') = COALESCE(${stream || ''}, '') AND 
                   COALESCE(section, '') = COALESCE(${section || ''}, '')`);
      
      if (config.length === 0) {
        // Return default periods based on course type
        const defaultPeriods = courseType === "pu" ? 3 : (parseInt(year) >= 6 ? 8 : 7);
        const maxAllowedPeriods = courseType === "pu" ? 8 : 12; // PUC max 8, POST-PUC max 12
        
        return res.json({ 
          defaultPeriods, 
          maxAllowedPeriods,
          customDayPeriods: null,
          periodsPerDay: {
            monday: defaultPeriods,
            tuesday: defaultPeriods,
            wednesday: defaultPeriods,
            thursday: defaultPeriods,
            friday: 0, // Holiday
            saturday: defaultPeriods,
            sunday: defaultPeriods
          }
        });
      }
      
      const periodConfig = config[0];
      const customDayPeriods = periodConfig.customDayPeriods ? 
        JSON.parse(periodConfig.customDayPeriods) : null;
      const maxAllowedPeriods = courseType === "pu" ? 8 : 12; // PUC max 8, POST-PUC max 12
      
      const periodsPerDay = customDayPeriods || {
        monday: periodConfig.defaultPeriods,
        tuesday: periodConfig.defaultPeriods,
        wednesday: periodConfig.defaultPeriods,
        thursday: periodConfig.defaultPeriods,
        friday: 0, // Holiday
        saturday: periodConfig.defaultPeriods,
        sunday: periodConfig.defaultPeriods
      };
      
      res.json({
        defaultPeriods: periodConfig.defaultPeriods,
        maxAllowedPeriods,
        customDayPeriods,
        periodsPerDay
      });
    } catch (error) {
      console.error("Get class periods error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ENHANCED MISSED SECTIONS AUTO-DETECTION SYSTEM

  // Get missed sections with intelligent filtering - SCHOOL WIDE
  app.get("/api/missed-sections", isAuthenticated, async (req, res) => {
    try {
      const { courseType, year, stream, section } = req.query;
      
      console.log('🔍 Fetching missed sections with filters:', req.query);
      
      // For school-wide view, ignore filters if all are undefined
      const filters = {};
      if (courseType && courseType !== 'undefined') filters.courseType = courseType;
      if (year && year !== 'undefined') filters.year = year;
      if (stream && stream !== 'undefined') filters.stream = stream;
      if (section && section !== 'undefined') filters.section = section;
      
      console.log('🔍 Applied filters for school-wide missed sections:', filters);
      
      // Use the detector service to get pending missed sections
      const result = await missedSectionDetector.getPendingMissedSections(filters);
      
      console.log(`📋 Found ${result.length} missed sections for school-wide display`);
      
      // Format response with proper structure
      res.json({
        missedSections: result.map(section => ({
          ...section,
          id: section.id,
          courseType: section.courseType,
          year: section.year.toString(),
          stream: section.stream,
          section: section.section || '',
          subjectName: section.subjectName,
          subjectCode: section.subject,
          subject: section.subject,
          scheduledDate: section.missedDate,
          missedDate: section.missedDate,
          dayOfWeek: section.dayOfWeek,
          periodNumber: section.periodNumber,
          startTime: section.scheduledStartTime,
          endTime: section.scheduledEndTime,
          timeSlot: `${section.scheduledStartTime} - ${section.scheduledEndTime}`,
          reason: section.reason,
          status: 'missed',
          className: `${section.courseType.toUpperCase()} ${section.year}${section.stream ? ` ${section.stream.toUpperCase()}` : ''}${section.section ? ` Section ${section.section.toUpperCase()}` : ''}`.trim(),
          missedHours: section.daysPending ? section.daysPending * 24 : 0,
          daysPending: section.daysPending,
          formattedDate: section.formattedDate,
          autoDetected: true
        }))
      });
    } catch (error) {
      console.error("❌ Error fetching missed sections:", error);
      res.status(500).json({ error: "Failed to fetch missed sections" });
    }
  });

  // Manually trigger missed section detection (for testing/admin)
  app.post("/api/missed-sections/detect", isAuthenticated, async (req, res) => {
    try {
      console.log('🔍 Manual missed section detection triggered');
      const result = await missedSectionDetector.runDailyDetection();
      res.json(result);
    } catch (error) {
      console.error("❌ Error in manual detection:", error);
      res.status(500).json({ error: "Failed to run detection" });
    }
  });

  // Complete a missed section (mark as makeup done)
  app.put("/api/missed-sections/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { makeupDate } = req.body;
      
      console.log(`✅ Completing missed section ${id} with makeup date: ${makeupDate}`);
      
      const result = await missedSectionDetector.completeMissedSection(
        parseInt(id), 
        makeupDate
      );
      
      if (result.success) {
        res.json({ message: "Missed section completed successfully" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("❌ Error completing missed section:", error);
      res.status(500).json({ error: "Failed to complete missed section" });
    }
  });

  // Get detection statistics and status
  app.get("/api/missed-sections/stats", isAuthenticated, async (req, res) => {
    try {
      const pendingSections = await missedSectionDetector.getPendingMissedSections();
      
      // Calculate stats
      const totalPending = pendingSections.length;
      const highPriority = pendingSections.filter(s => s.priority === 'high').length;
      const overdue = pendingSections.filter(s => s.daysPending > 7).length;
      
      // Group by class
      const byClass = pendingSections.reduce((acc, section) => {
        const className = section.fullClassName;
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        totalPending,
        highPriority,
        overdue,
        byClass,
        lastDetectionRun: new Date().toISOString(),
        systemStatus: 'active'
      });
    } catch (error) {
      console.error("❌ Error fetching missed sections stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Backup & Restore API routes (JSON storage only)
  app.post("/api/backup/create", isAuthenticated, async (req, res) => {
    try {
      if (!USE_JSON_STORAGE) {
        return res.status(400).json({ error: "Backup only available for JSON storage" });
      }

      const result = await backupManager.createBackup();
      
      if (result.success) {
        console.log(`💾 Manual backup created: ${result.filename}`);
        res.json({ success: true, filename: result.filename });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/backup/list", isAuthenticated, async (req, res) => {
    try {
      if (!USE_JSON_STORAGE) {
        return res.status(400).json({ error: "Backup only available for JSON storage" });
      }

      const backups = await backupManager.listBackups();
      res.json(backups);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  app.post("/api/backup/restore", isAuthenticated, async (req, res) => {
    try {
      if (!USE_JSON_STORAGE) {
        return res.status(400).json({ error: "Backup only available for JSON storage" });
      }

      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }

      const result = await backupManager.restoreBackup(filename);
      
      if (result.success) {
        console.log(`♻️ Database restored from: ${filename}`);
        res.json({ success: true, message: "Database restored successfully. Please refresh the page." });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  app.delete("/api/backup/:filename", isAuthenticated, async (req, res) => {
    try {
      if (!USE_JSON_STORAGE) {
        return res.status(400).json({ error: "Backup only available for JSON storage" });
      }

      const { filename } = req.params;
      const result = await backupManager.deleteBackup(filename);
      
      if (result.success) {
        console.log(`🗑️ Backup deleted: ${filename}`);
        res.json({ success: true, message: "Backup deleted successfully" });
      } else {
        res.status(404).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  app.get("/api/backup/export", isAuthenticated, async (req, res) => {
    try {
      if (!USE_JSON_STORAGE) {
        return res.status(400).json({ error: "Export only available for JSON storage" });
      }

      const result = await backupManager.exportDatabase();
      
      if (result.success && result.data) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="database_export_${timestamp}.json"`);
        res.send(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error exporting database:", error);
      res.status(500).json({ error: "Failed to export database" });
    }
  });

  return server;
}