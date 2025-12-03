import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - teachers and principals
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("teacher"), // Only "teacher" role is used now
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rollNo: text("roll_no").notNull(),
  courseType: text("course_type").notNull(), // "pu" or "post-pu"
  courseDivision: text("course_division"), // "commerce" or "science" for PU, null for post-pu
  year: text("year").notNull(), // "1" to "7" (1-2 for PU, 3-7 for Post-PUC)
  batch: text("batch"), // "a", "b", "c", etc. for Commerce, null for Science & Post-PUC
  dob: text("dob"), // Optional - date of birth
  bloodGroup: text("blood_group"), // A+, A-, B+, B-, AB+, AB-, O+, O-
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  contact1: text("contact_1"),
  contact2: text("contact_2"),
  address: text("address"),
  aadharNumber: text("aadhar_number"),
  photoUrl: text("photo_url"),
  status: text("status").default("active"), // "active" or "inactive"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  rollNo: text("roll_no").notNull(), // Redundant but useful for fast reference in exports or display
  date: text("date").notNull(), // The date of the attendance (YYYY-MM-DD format)
  period: integer("period").notNull(), // Period number (e.g. 1 to 8 for older batches, 1 to 3 for PU)
  subjectId: integer("subject_id"), // Reference to subjects table - links attendance to specific subject via timetable
  status: text("status").notNull(), // Enum: 'present', 'absent', 'leave', 'emergency'
  courseType: text("course_type").notNull(), // Helps filtering attendance (e.g. 'pu', 'post-pu')
  courseName: text("course_name"), // E.g. 'commerce', 'science', etc.
  section: text("section"), // E.g. 'A', 'B', 'None'
  batchYear: text("batch_year").notNull(), // E.g. '1th PU', '3th year'
  recordedAt: timestamp("recorded_at").defaultNow().notNull(), // Auto-filled timestamp when attendance is recorded
  synced: boolean("synced").default(true).notNull(), // To help offline apps know if this record was synced to the server
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // For edit history tracking
  createdBy: integer("created_by").notNull(), // Teacher who recorded the attendance
});

// Namaz attendance table
export const namazAttendance = pgTable("namaz_attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  date: text("date").notNull(),
  prayer: text("prayer").notNull(), // "fajr", "zuhr", "asr", "maghrib", "isha"
  status: text("status").notNull(), // "present", "absent", or "on-leave"
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leave table
export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("active"), // "active" or "completed"
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Results table
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  year: text("year").notNull(), // E.g. "1st PU", "2nd PU", "3rd Year"
  courseType: text("course_type").notNull(), // E.g. "pu", "post-pu"
  courseName: text("course_name"), // E.g. "commerce", "science"
  section: text("section"), // E.g. "A", "B", or NULL if not applicable
  examType: text("exam_type").notNull(), // E.g. "Mid Term", "Final Exam", "Unit Test"
  fileUrl: text("file_url").notNull(), // Path/URL to the uploaded file (PDF or Excel)
  fileType: text("file_type").notNull(), // Store 'pdf' or 'excel'
  uploadedBy: text("uploaded_by"), // Optional: person who uploaded
  uploadDate: timestamp("upload_date").defaultNow().notNull(), // When it was uploaded
  notes: text("notes"), // Any extra info (e.g., includes practical marks)
});

// Remarks table
export const remarks = pgTable("remarks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"), // discipline, homework, absence, behavior, performance, general
  submittedBy: integer("submitted_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subjects table 
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  subjectCode: text("subject_code").notNull(),
  courseType: text("course_type").notNull(),
  year: text("year"),
  stream: text("stream"),
  section: text("section"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Timetable table - weekly schedule grid
export const timetable = pgTable("timetable", {
  id: serial("id").primaryKey(),
  courseType: text("course_type").notNull(), // "pu" or "post-pu"
  year: text("year").notNull(), // "1" to "7"
  stream: text("stream"), // "commerce" or "science" for PU
  section: text("section").notNull().default("A"), // "A", "B", "C"
  dayOfWeek: text("day_of_week").notNull(), // "monday", "tuesday", etc.
  periodNumber: integer("period_number").notNull(), // 1, 2, 3, etc.
  subjectId: integer("subject_id"), // Reference to subjects table
  startTime: text("start_time"), // Optional custom timing
  endTime: text("end_time"), // Optional custom timing
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Holidays table - Academic Calendar System
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  name: text("name").notNull(), // Holiday name (e.g., "Independence Day", "Eid")
  type: text("type").notNull(), // "academic" or "emergency"
  reason: text("reason"), // Additional reason (especially for emergency holidays)
  affectedCourses: text("affected_courses").array(), // ["PUC", "Post-PUC"] or specific courses
  triggeredAt: text("triggered_at"), // Time when emergency was declared (HH:MM format)
  isDeleted: boolean("is_deleted").default(false).notNull(), // For undo functionality
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emergency leave periods table
export const emergencyLeave = pgTable("emergency_leave", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  courseType: text("course_type").notNull(), // "pu" or "post-pu"
  year: text("year").notNull(), // "1" to "7"
  courseDivision: text("course_division"), // "commerce" or "science" for PU
  section: text("section").notNull().default("A"), // "A", "B", "C"
  affectedPeriods: text("affected_periods").array(), // ["2", "3"] - periods that are marked as emergency
  appliedAt: text("applied_at").notNull(), // HH:MM format when emergency was declared
  appliedBy: integer("applied_by").notNull(), // teacher who declared emergency
  reason: text("reason").notNull(), // reason for emergency leave
  isActive: boolean("is_active").default(true).notNull(), // can be deactivated if needed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Period Definitions table for customizable time slots
export const periodDefinitions = pgTable("period_definitions", {
  id: serial("id").primaryKey(),
  periodNumber: integer("period_number").notNull(),
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "10:00"
  label: text("label"), // Optional label like "Morning Session", "Break"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Timetable Period Configuration - class-specific period counts
export const timetablePeriodConfig = pgTable("timetable_period_config", {
  id: serial("id").primaryKey(),
  courseType: text("course_type").notNull(),
  year: text("year").notNull(),
  stream: text("stream"), // commerce/science for PU
  section: text("section"), // A/B for commerce
  defaultPeriods: integer("default_periods").notNull(), // Default periods per day
  customDayPeriods: text("custom_day_periods"), // JSON: {"monday": 4, "tuesday": 3, ...}
  updatedBy: integer("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced Missed Sections Queue table - Auto-Detection System
export const missedSections = pgTable("missed_sections", {
  id: serial("id").primaryKey(),
  courseType: text("course_type").notNull(), // pu, post-pu
  year: text("year").notNull(),
  stream: text("stream"), // commerce, science (for PU only) - updated from courseDivision
  section: text("section").notNull().default("A"), // A, B
  subject: text("subject").notNull(), // Subject code from timetable (e.g., "CHEM", "TJD1")
  subjectName: text("subject_name").notNull(), // Full subject name from timetable
  missedDate: text("missed_date").notNull(), // YYYY-MM-DD when class was missed
  periodNumber: integer("period_number").notNull(), // 1, 2, 3, etc.
  dayOfWeek: text("day_of_week").notNull(), // monday, tuesday, etc.
  scheduledStartTime: text("scheduled_start_time"), // Original start time from timetable
  scheduledEndTime: text("scheduled_end_time"), // Original end time from timetable
  detectedAt: timestamp("detected_at").defaultNow().notNull(), // Auto-detected timestamp
  reason: text("reason").notNull().default("Attendance not taken"), // Detection reason
  isCompleted: boolean("is_completed").default(false).notNull(), // Makeup class completed
  completedAt: timestamp("completed_at"), // When makeup was completed
  makeupDate: text("makeup_date"), // Date when makeup class was held
  makeupPeriod: integer("makeup_period"), // Period when makeup was conducted
  priority: text("priority").default("normal").notNull(), // high, normal, low
  daysPending: integer("days_pending").default(0), // Auto-calculated pending days
  autoDetected: boolean("auto_detected").default(true).notNull(), // System vs manual detection
  completedBy: integer("completed_by"), // Teacher who completed makeup
  remarks: text("remarks"), // Additional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Missed attendance status table (legacy support)
export const missedAttendanceStatus = pgTable("missed_attendance_status", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  courseType: text("course_type").notNull(), // pu, post-pu
  year: text("year").notNull(),
  courseDivision: text("course_division"), // commerce, science (for PU only)
  section: text("section").notNull().default("A"), // A, B
  period: integer("period").notNull(), // 1, 2, 3, etc.
  status: text("status").notNull().default("not_taken"), // taken, not_taken, leave, emergency, holiday
  takenBy: integer("taken_by"), // teacher who took attendance
  timestamp: timestamp("timestamp"), // when attendance was taken
  remarks: text("remarks"),
  studentCount: integer("student_count").default(0),
  attendanceKey: text("attendance_key"), // reference to actual attendance record
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true,
  rollNo: true,
  courseType: true,
  courseDivision: true,
  year: true,
  batch: true,
  dob: true,
  bloodGroup: true,
  fatherName: true,
  motherName: true,
  contact1: true,
  contact2: true,
  address: true,
  photoUrl: true,
  status: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  subject: true,
  subjectCode: true,
  courseType: true,
  year: true,
  stream: true,
  section: true,
  createdBy: true,
});

export const insertTimetableSchema = createInsertSchema(timetable).pick({
  courseType: true,
  year: true,
  stream: true,
  section: true,
  dayOfWeek: true,
  periodNumber: true,
  subjectId: true,
  startTime: true,
  endTime: true,
  createdBy: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).pick({
  studentId: true,
  rollNo: true,
  date: true,
  period: true,
  status: true,
  courseType: true,
  courseName: true,
  section: true,
  batchYear: true,
  createdBy: true,
});

export const insertNamazAttendanceSchema = createInsertSchema(namazAttendance).pick({
  studentId: true,
  date: true,
  prayer: true,
  status: true,
  createdBy: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).pick({
  studentId: true,
  fromDate: true,
  toDate: true,
  reason: true,
  status: true,
  createdBy: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  uploadDate: true,
});

export const insertRemarkSchema = createInsertSchema(remarks).pick({
  studentId: true,
  content: true,
  category: true,
  submittedBy: true,
});

// Remove old period schema - replacing with subject and timetable schemas

export const insertHolidaySchema = createInsertSchema(holidays).pick({
  date: true,
  name: true,
  type: true,
  reason: true,
  affectedCourses: true,
  triggeredAt: true,
  isDeleted: true,
  createdBy: true,
});

export const insertEmergencyLeaveSchema = createInsertSchema(emergencyLeave).pick({
  date: true,
  courseType: true,
  year: true,
  courseDivision: true,
  section: true,
  affectedPeriods: true,
  appliedAt: true,
  appliedBy: true,
  reason: true,
  isActive: true,
});

export const insertMissedSectionSchema = createInsertSchema(missedSections).pick({
  courseType: true,
  year: true,
  stream: true,
  section: true,
  subject: true,
  subjectName: true,
  missedDate: true,
  periodNumber: true,
  dayOfWeek: true,
  reason: true,
  priority: true,
  remarks: true,
});

export const insertMissedAttendanceSchema = createInsertSchema(missedAttendanceStatus).pick({
  date: true,
  courseType: true,
  year: true,
  courseDivision: true,
  section: true,
  period: true,
  status: true,
  takenBy: true,
  remarks: true,
  studentCount: true,
  attendanceKey: true,
});

export const insertPeriodDefinitionSchema = createInsertSchema(periodDefinitions).pick({
  periodNumber: true,
  startTime: true,
  endTime: true,
  label: true,
  isActive: true,
});

export const insertTimetablePeriodConfigSchema = createInsertSchema(timetablePeriodConfig).pick({
  courseType: true,
  year: true,
  stream: true,
  section: true,
  defaultPeriods: true,
  customDayPeriods: true,
  updatedBy: true,
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertNamazAttendance = z.infer<typeof insertNamazAttendanceSchema>;
export type NamazAttendance = typeof namazAttendance.$inferSelect;

export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leaves.$inferSelect;

export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof results.$inferSelect;

export type InsertRemark = z.infer<typeof insertRemarkSchema>;
export type Remark = typeof remarks.$inferSelect;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export type InsertTimetable = z.infer<typeof insertTimetableSchema>;
export type Timetable = typeof timetable.$inferSelect;

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export type InsertEmergencyLeave = z.infer<typeof insertEmergencyLeaveSchema>;
export type EmergencyLeave = typeof emergencyLeave.$inferSelect;

export type InsertMissedAttendance = z.infer<typeof insertMissedAttendanceSchema>;
export type MissedAttendance = typeof missedAttendanceStatus.$inferSelect;

export type InsertPeriodDefinition = z.infer<typeof insertPeriodDefinitionSchema>;
export type PeriodDefinition = typeof periodDefinitions.$inferSelect;

export type InsertTimetablePeriodConfig = z.infer<typeof insertTimetablePeriodConfigSchema>;
export type TimetablePeriodConfig = typeof timetablePeriodConfig.$inferSelect;
