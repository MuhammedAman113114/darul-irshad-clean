import { 
  users, students, attendance, namazAttendance, leaves, results, remarks, subjects, timetable, holidays,
  type User, type Student, type Attendance, type NamazAttendance, type Leave, type Result, type Remark, type Subject, type Timetable, type Holiday,
  type InsertUser, type InsertStudent, type InsertAttendance, type InsertNamazAttendance, type InsertLeave, type InsertResult, type InsertRemark, type InsertSubject, type InsertTimetable, type InsertHoliday
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentsByFilter(filters: Partial<Student>): Promise<Student[]> {
    let query = db.select().from(students);
    
    // Apply filters dynamically
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Special handling for courseDivision with Post-PUC students
        if (key === 'courseDivision' && filters.courseType === 'post-pu') {
          // For post-pu students, courseDivision should be null, so skip this filter
          return;
        }
        conditions.push(eq(students[key as keyof typeof students], value));
      }
    });
    
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        query = query.where(conditions[0]);
      } else {
        query = query.where(and(...conditions));
      }
    }
    
    return await query;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(insertStudent)
      .returning();
    return student;
  }

  async updateStudent(id: number, studentUpdate: Partial<Student>): Promise<Student | undefined> {
    const [student] = await db
      .update(students)
      .set(studentUpdate)
      .where(eq(students.id, id))
      .returning();
    return student || undefined;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id));
    return result.rowCount > 0;
  }

  // Attendance
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(eq(attendance.id, id));
    return record || undefined;
  }

  async getAttendanceByFilter(filters: Partial<Attendance>): Promise<Attendance[]> {
    console.log('🔍 getAttendanceByFilter called with filters:', filters);
    
    // If no filters, return all records
    if (!filters || Object.keys(filters).length === 0) {
      return await db.select().from(attendance);
    }
    
    // Build conditions array 
    const conditions: any[] = [];
    
    if (filters.courseType) {
      conditions.push(eq(attendance.courseType, filters.courseType));
    }
    
    if (filters.year) {
      const batchYear = `${filters.year}th ${filters.courseType === 'pu' ? 'PU' : 'year'}`;
      conditions.push(eq(attendance.batchYear, batchYear));
    }
    
    if (filters.courseName) {
      conditions.push(eq(attendance.courseName, filters.courseName));
    }
    
    if (filters.section) {
      conditions.push(eq(attendance.section, filters.section));
    }
    
    if (filters.date) {
      conditions.push(eq(attendance.date, filters.date));
    }
    
    if (filters.period) {
      conditions.push(eq(attendance.period, filters.period));
    }
    
    if (filters.studentId) {
      conditions.push(eq(attendance.studentId, filters.studentId));
    }
    
    console.log('🔍 Built conditions count:', conditions.length);
    
    // Apply all conditions at once using AND
    if (conditions.length === 1) {
      return await db.select().from(attendance).where(conditions[0]);
    } else if (conditions.length > 1) {
      return await db.select().from(attendance).where(and(...conditions));
    }
    
    return await db.select().from(attendance);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db
      .insert(attendance)
      .values(insertAttendance)
      .returning();
    return record;
  }

  async updateAttendance(id: number, attendanceUpdate: Partial<Attendance>): Promise<Attendance | undefined> {
    const [record] = await db
      .update(attendance)
      .set(attendanceUpdate)
      .where(eq(attendance.id, id))
      .returning();
    return record || undefined;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const result = await db.delete(attendance).where(eq(attendance.id, id));
    return result.rowCount > 0;
  }

  // Namaz Attendance
  async getNamazAttendance(id: number): Promise<NamazAttendance | undefined> {
    const [record] = await db.select().from(namazAttendance).where(eq(namazAttendance.id, id));
    return record || undefined;
  }

  async getNamazAttendanceByFilter(filters: Partial<NamazAttendance>): Promise<NamazAttendance[]> {
    const query = db.select().from(namazAttendance);
    
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(namazAttendance[key as keyof typeof namazAttendance], value));
      }
    });
    
    if (conditions.length > 0) {
      const finalQuery = conditions.reduce((q, condition) => q.where(condition), query);
      return await finalQuery;
    }
    
    return await query;
  }

  async createNamazAttendance(insertNamazAttendance: InsertNamazAttendance): Promise<NamazAttendance> {
    const [record] = await db
      .insert(namazAttendance)
      .values(insertNamazAttendance)
      .returning();
    return record;
  }

  async updateNamazAttendance(id: number, namazAttendanceUpdate: Partial<NamazAttendance>): Promise<NamazAttendance | undefined> {
    const [record] = await db
      .update(namazAttendance)
      .set(namazAttendanceUpdate)
      .where(eq(namazAttendance.id, id))
      .returning();
    return record || undefined;
  }

  async deleteNamazAttendance(id: number): Promise<boolean> {
    const result = await db.delete(namazAttendance).where(eq(namazAttendance.id, id));
    return result.rowCount > 0;
  }

  // Leaves
  async getLeave(id: number): Promise<Leave | undefined> {
    const [record] = await db.select().from(leaves).where(eq(leaves.id, id));
    return record || undefined;
  }

  async getLeaveByFilter(filters: Partial<Leave>): Promise<Leave[]> {
    const query = db.select().from(leaves);
    
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(leaves[key as keyof typeof leaves], value));
      }
    });
    
    if (conditions.length > 0) {
      const finalQuery = conditions.reduce((q, condition) => q.where(condition), query);
      return await finalQuery;
    }
    
    return await query;
  }

  async createLeave(insertLeave: InsertLeave): Promise<Leave> {
    // fromDate and toDate are text fields, keep them as strings
    // Only createdAt needs to be a Date object since it's a timestamp field
    const processedLeave = {
      ...insertLeave,
      // Remove createdAt if it exists - let the database set it with defaultNow()
      createdAt: undefined
    };
    
    const [record] = await db
      .insert(leaves)
      .values(processedLeave)
      .returning();
    return record;
  }

  async updateLeave(id: number, leaveUpdate: Partial<Leave>): Promise<Leave | undefined> {
    const [record] = await db
      .update(leaves)
      .set(leaveUpdate)
      .where(eq(leaves.id, id))
      .returning();
    return record || undefined;
  }

  async deleteLeave(id: number): Promise<boolean> {
    const result = await db.delete(leaves).where(eq(leaves.id, id));
    return result.rowCount > 0;
  }

  // Results
  async getResult(id: number): Promise<Result | undefined> {
    const [record] = await db.select().from(results).where(eq(results.id, id));
    return record || undefined;
  }

  async getResultByFilter(filters: Partial<Result>): Promise<Result[]> {
    const query = db.select().from(results);
    
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(results[key as keyof typeof results], value));
      }
    });
    
    if (conditions.length > 0) {
      const finalQuery = conditions.reduce((q, condition) => q.where(condition), query);
      return await finalQuery;
    }
    
    return await query;
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const [record] = await db
      .insert(results)
      .values(insertResult)
      .returning();
    return record;
  }

  async updateResult(id: number, resultUpdate: Partial<Result>): Promise<Result | undefined> {
    const [record] = await db
      .update(results)
      .set(resultUpdate)
      .where(eq(results.id, id))
      .returning();
    return record || undefined;
  }

  async deleteResult(id: number): Promise<boolean> {
    const result = await db.delete(results).where(eq(results.id, id));
    return result.rowCount > 0;
  }

  // Remarks
  async getRemark(id: number): Promise<Remark | undefined> {
    const [record] = await db.select().from(remarks).where(eq(remarks.id, id));
    return record || undefined;
  }

  async getRemarkByFilter(filters: Partial<Remark>): Promise<Remark[]> {
    const query = db.select().from(remarks);
    
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(remarks[key as keyof typeof remarks], value));
      }
    });
    
    if (conditions.length > 0) {
      const finalQuery = conditions.reduce((q, condition) => q.where(condition), query);
      return await finalQuery;
    }
    
    return await query;
  }

  async createRemark(insertRemark: InsertRemark): Promise<Remark> {
    const [record] = await db
      .insert(remarks)
      .values(insertRemark)
      .returning();
    return record;
  }

  async updateRemark(id: number, remarkUpdate: Partial<Remark>): Promise<Remark | undefined> {
    const [record] = await db
      .update(remarks)
      .set(remarkUpdate)
      .where(eq(remarks.id, id))
      .returning();
    return record || undefined;
  }

  async deleteRemark(id: number): Promise<boolean> {
    const result = await db.delete(remarks).where(eq(remarks.id, id));
    return result.rowCount > 0;
  }

  // Subjects
  async getSubject(id: number): Promise<Subject | undefined> {
    const [record] = await db.select().from(subjects).where(eq(subjects.id, id));
    return record || undefined;
  }

  async getSubjects(filters?: Partial<Subject>): Promise<Subject[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return await db.select().from(subjects);
    }
    
    const query = db.select().from(subjects);
    const conditions: any[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(subjects[key as keyof typeof subjects], value));
      }
    });
    
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        return await query.where(conditions[0]);
      } else {
        return await query.where(and(...conditions));
      }
    }
    
    return await query;
  }

  async getSubjectByFilter(filters: Partial<Subject>): Promise<Subject[]> {
    return this.getSubjects(filters);
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    // Support class-specific subject creation with full field mapping
    const subjectData = {
      subject: insertSubject.subject,
      subjectCode: insertSubject.subjectCode,
      courseType: insertSubject.courseType,
      year: insertSubject.year || null,
      stream: insertSubject.stream || null,
      section: insertSubject.section || null,
      createdBy: insertSubject.createdBy
    };
    
    console.log(`💾 Creating subject in database:`, subjectData);
    
    const [record] = await db
      .insert(subjects)
      .values(subjectData)
      .returning();
      
    console.log(`✅ Subject created in database:`, record);
    
    return record;
  }

  async updateSubject(id: number, subjectUpdate: Partial<Subject>): Promise<Subject | undefined> {
    const [record] = await db
      .update(subjects)
      .set(subjectUpdate)
      .where(eq(subjects.id, id))
      .returning();
    return record || undefined;
  }

  async deleteSubject(id: number): Promise<boolean> {
    const result = await db.delete(subjects).where(eq(subjects.id, id));
    return result.rowCount > 0;
  }

  // Timetable
  async getTimetable(filters?: Partial<Timetable>): Promise<any[]> {
    // Join timetable with subjects to get subject names
    const query = db.select({
      id: timetable.id,
      courseType: timetable.courseType,
      year: timetable.year,
      stream: timetable.stream,
      section: timetable.section,
      dayOfWeek: timetable.dayOfWeek,
      periodNumber: timetable.periodNumber,
      subjectId: timetable.subjectId,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      createdBy: timetable.createdBy,
      createdAt: timetable.createdAt,
      updatedAt: timetable.updatedAt,
      // Join with subjects table to get subject details
      subjectName: subjects.subject,
      subjectCode: subjects.subjectCode
    })
    .from(timetable)
    .leftJoin(subjects, eq(timetable.subjectId, subjects.id));
    
    if (!filters || Object.keys(filters).length === 0) {
      return await query;
    }
    
    const conditions: any[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Special handling for Post-PUC classes where stream and section are null in DB
        if ((key === 'stream' || key === 'section') && filters.courseType === 'post-pu') {
          // For post-pu, stream and section are stored as null in database
          // Skip these filters to match records with null values
          return;
        }
        conditions.push(eq(timetable[key as keyof typeof timetable], value));
      }
    });
    
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        return await query.where(conditions[0]);
      } else {
        return await query.where(and(...conditions));
      }
    }
    
    return await query;
  }

  async getTimetableByFilter(filters: Partial<Timetable>): Promise<any[]> {
    return this.getTimetable(filters);
  }

  async getTimetableEntry(filters: { courseType: string; year: string; stream?: string; section: string; dayOfWeek: string; periodNumber: number }): Promise<Timetable | undefined> {
    const conditions = [
      eq(timetable.courseType, filters.courseType),
      eq(timetable.year, filters.year),
      eq(timetable.dayOfWeek, filters.dayOfWeek),
      eq(timetable.periodNumber, filters.periodNumber)
    ];

    // Handle stream filter (can be null for Post-PU)
    if (filters.stream) {
      conditions.push(eq(timetable.stream, filters.stream));
    } else {
      // For Post-PU courses where stream is null
      conditions.push(eq(timetable.stream, null));
    }

    // Handle section filter - Science classes have empty string sections, not "A" or "B"
    if (filters.stream === 'science') {
      // Science classes store section as empty string in database (confirmed from SQL query)
      conditions.push(eq(timetable.section, ''));
    } else if (filters.courseType === 'post-pu') {
      // Post-PU classes have no sections (null)
      conditions.push(eq(timetable.section, null));
    } else {
      // Commerce classes have actual section values ("A", "B")
      conditions.push(eq(timetable.section, filters.section));
    }

    console.log(`🔍 TIMETABLE LOOKUP QUERY - Conditions built:`, {
      courseType: filters.courseType,
      year: filters.year,
      stream: filters.stream,
      section: filters.section,
      dayOfWeek: filters.dayOfWeek,
      periodNumber: filters.periodNumber,
      sectionQueryValue: filters.stream === 'science' ? 'EMPTY_STRING' : filters.section
    });

    const [record] = await db
      .select()
      .from(timetable)
      .where(and(...conditions))
      .limit(1);

    console.log(`🔍 TIMETABLE LOOKUP RESULT:`, record ? 
      { found: true, subjectId: record.subjectId, timetableId: record.id } : 
      { found: false, message: 'No matching timetable entry' }
    );

    return record || undefined;
  }

  async createTimetableEntry(insertTimetable: InsertTimetable): Promise<Timetable> {
    const cleanTimetableData = {
      courseType: insertTimetable.courseType,
      year: insertTimetable.year,
      stream: insertTimetable.stream || null,
      section: insertTimetable.section,
      dayOfWeek: insertTimetable.dayOfWeek,
      periodNumber: insertTimetable.periodNumber,
      subjectId: insertTimetable.subjectId || null,
      startTime: insertTimetable.startTime || null,
      endTime: insertTimetable.endTime || null,
      createdBy: insertTimetable.createdBy
    };
    
    const [record] = await db
      .insert(timetable)
      .values(cleanTimetableData)
      .returning();
    return record;
  }

  async bulkCreateTimetable(entries: InsertTimetable[]): Promise<Timetable[]> {
    if (entries.length === 0) return [];
    
    const cleanEntries = entries.map(entry => ({
      courseType: entry.courseType,
      year: entry.year,
      stream: entry.stream || null,
      section: entry.section,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      subjectId: entry.subjectId || null,
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      createdBy: entry.createdBy
    }));

    const records = await db
      .insert(timetable)
      .values(cleanEntries)
      .returning();
    return records;
  }

  async bulkUpsertTimetable(entries: InsertTimetable[]): Promise<Timetable[]> {
    if (entries.length === 0) return [];
    
    const results: Timetable[] = [];
    
    for (const entry of entries) {
      const cleanEntry = {
        courseType: entry.courseType,
        year: entry.year,
        stream: entry.stream || null,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        subjectId: entry.subjectId || null,
        startTime: entry.startTime || null,
        endTime: entry.endTime || null,
        createdBy: entry.createdBy
      };

      // Check if entry already exists
      const existingEntry = await db
        .select()
        .from(timetable)
        .where(
          and(
            eq(timetable.courseType, cleanEntry.courseType),
            eq(timetable.year, cleanEntry.year),
            eq(timetable.stream, cleanEntry.stream),
            eq(timetable.section, cleanEntry.section),
            eq(timetable.dayOfWeek, cleanEntry.dayOfWeek),
            eq(timetable.periodNumber, cleanEntry.periodNumber)
          )
        )
        .limit(1);

      if (existingEntry.length > 0) {
        // Update existing entry
        const [updatedRecord] = await db
          .update(timetable)
          .set({
            subjectId: cleanEntry.subjectId,
            startTime: cleanEntry.startTime,
            endTime: cleanEntry.endTime,
            createdBy: cleanEntry.createdBy
          })
          .where(eq(timetable.id, existingEntry[0].id))
          .returning();
        results.push(updatedRecord);
      } else {
        // Insert new entry
        const [newRecord] = await db
          .insert(timetable)
          .values(cleanEntry)
          .returning();
        results.push(newRecord);
      }
    }
    
    return results;
  }

  async updateTimetableEntry(id: number, timetableUpdate: Partial<Timetable>): Promise<Timetable | undefined> {
    const [record] = await db
      .update(timetable)
      .set(timetableUpdate)
      .where(eq(timetable.id, id))
      .returning();
    return record || undefined;
  }

  async deleteTimetableEntry(id: number): Promise<boolean> {
    const result = await db.delete(timetable).where(eq(timetable.id, id));
    return result.rowCount > 0;
  }

  // Holidays
  async getHoliday(id: number): Promise<Holiday | undefined> {
    const [record] = await db.select().from(holidays).where(eq(holidays.id, id));
    return record || undefined;
  }

  async getHolidayByFilter(filters: Partial<Holiday>): Promise<Holiday[]> {
    const query = db.select().from(holidays);
    
    const conditions: any[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(eq(holidays[key as keyof typeof holidays], value));
      }
    });
    
    if (conditions.length > 0) {
      const finalQuery = conditions.reduce((q, condition) => q.where(condition), query);
      return await finalQuery;
    }
    
    return await query;
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    // Remove createdAt if it exists - let the database set it with defaultNow()
    const processedHoliday = {
      ...insertHoliday,
      createdAt: undefined
    };
    
    const [record] = await db
      .insert(holidays)
      .values(processedHoliday)
      .returning();
    return record;
  }

  async updateHoliday(id: number, holidayUpdate: Partial<Holiday>): Promise<Holiday | undefined> {
    const [record] = await db
      .update(holidays)
      .set(holidayUpdate)
      .where(eq(holidays.id, id))
      .returning();
    return record || undefined;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const result = await db.delete(holidays).where(eq(holidays.id, id));
    return result.rowCount > 0;
  }
}