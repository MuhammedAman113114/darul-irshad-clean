import fs from 'fs';
import path from 'path';
import { IStorage } from "./storage";
import type {
  User, Student, Attendance, NamazAttendance, Leave, Result, Remark, Subject, Timetable, Holiday,
  InsertUser, InsertStudent, InsertAttendance, InsertNamazAttendance, InsertLeave, InsertResult, InsertRemark, InsertSubject, InsertTimetable, InsertHoliday
} from "@shared/schema";

interface MissedSection {
  id: number;
  courseType: string;
  year: string;
  stream: string | null;
  section: string;
  subject: string;
  subjectName: string;
  missedDate: string;
  periodNumber: number;
  dayOfWeek: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  reason: string;
  detectedAt: Date;
  isCompleted: boolean;
  completedAt: Date | null;
  makeupDate: string | null;
  priority: string;
  daysPending: number;
  autoDetected: boolean;
  completedBy: number | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PeriodDefinition {
  id: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  label: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface JsonDatabase {
  users: User[];
  students: Student[];
  attendance: Attendance[];
  namazAttendance: NamazAttendance[];
  leaves: Leave[];
  results: Result[];
  remarks: Remark[];
  subjects: Subject[];
  timetable: Timetable[];
  holidays: Holiday[];
  missedSections: MissedSection[];
  periodDefinitions: PeriodDefinition[];
  _counters: {
    users: number;
    students: number;
    attendance: number;
    namazAttendance: number;
    leaves: number;
    results: number;
    remarks: number;
    subjects: number;
    timetable: number;
    holidays: number;
    missedSections: number;
    periodDefinitions: number;
  };
}

export class JsonStorage implements IStorage {
  private dbPath: string;
  private db: JsonDatabase;

  constructor(dbPath: string = './db.json') {
    this.dbPath = dbPath;
    this.db = this.loadDatabase();
  }

  private loadDatabase(): JsonDatabase {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading database:', error);
    }

    // Return empty database structure
    return {
      users: [],
      students: [],
      attendance: [],
      namazAttendance: [],
      leaves: [],
      results: [],
      remarks: [],
      subjects: [],
      timetable: [],
      holidays: [],
      missedSections: [],
      periodDefinitions: [],
      _counters: {
        users: 1,
        students: 1,
        attendance: 1,
        namazAttendance: 1,
        leaves: 1,
        results: 1,
        remarks: 1,
        subjects: 1,
        timetable: 1,
        holidays: 1,
        missedSections: 1,
        periodDefinitions: 1,
      }
    };
  }

  private saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  private getNextId(table: keyof JsonDatabase['_counters']): number {
    const id = this.db._counters[table];
    this.db._counters[table]++;
    return id;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.db.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.db.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.getNextId('users'),
      ...insertUser,
      createdAt: new Date(),
    };
    this.db.users.push(user);
    this.saveDatabase();
    return user;
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return this.db.students;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.db.students.find(s => s.id === id);
  }

  async getStudentsByFilter(filters: Partial<Student>): Promise<Student[]> {
    return this.db.students.filter(student => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        if (key === 'courseDivision' && filters.courseType === 'post-pu') return true;
        return student[key as keyof Student] === value;
      });
    });
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const student: Student = {
      id: this.getNextId('students'),
      ...insertStudent,
      aadharNumber: insertStudent.aadharNumber || null,
      createdAt: new Date(),
    };
    this.db.students.push(student);
    this.saveDatabase();
    return student;
  }

  async updateStudent(id: number, studentUpdate: Partial<Student>): Promise<Student | undefined> {
    const index = this.db.students.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    this.db.students[index] = { ...this.db.students[index], ...studentUpdate };
    this.saveDatabase();
    return this.db.students[index];
  }

  async deleteStudent(id: number): Promise<boolean> {
    const index = this.db.students.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.db.students.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Attendance
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.db.attendance.find(a => a.id === id);
  }

  async getAttendanceByFilter(filters: Partial<Attendance>): Promise<Attendance[]> {
    return this.db.attendance.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Attendance] === value;
      });
    });
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const record: Attendance = {
      id: this.getNextId('attendance'),
      ...insertAttendance,
      subjectId: null,
      recordedAt: new Date(),
      synced: true,
      updatedAt: new Date(),
    };
    this.db.attendance.push(record);
    this.saveDatabase();
    return record;
  }

  async updateAttendance(id: number, attendanceUpdate: Partial<Attendance>): Promise<Attendance | undefined> {
    const index = this.db.attendance.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    this.db.attendance[index] = { ...this.db.attendance[index], ...attendanceUpdate, updatedAt: new Date() };
    this.saveDatabase();
    return this.db.attendance[index];
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const index = this.db.attendance.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    this.db.attendance.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Namaz Attendance
  async getNamazAttendance(id: number): Promise<NamazAttendance | undefined> {
    return this.db.namazAttendance.find(n => n.id === id);
  }

  async getNamazAttendanceByFilter(filters: Partial<NamazAttendance>): Promise<NamazAttendance[]> {
    return this.db.namazAttendance.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof NamazAttendance] === value;
      });
    });
  }

  async createNamazAttendance(insertNamazAttendance: InsertNamazAttendance): Promise<NamazAttendance> {
    const record: NamazAttendance = {
      id: this.getNextId('namazAttendance'),
      ...insertNamazAttendance,
      createdAt: new Date(),
    };
    this.db.namazAttendance.push(record);
    this.saveDatabase();
    return record;
  }

  async updateNamazAttendance(id: number, namazAttendanceUpdate: Partial<NamazAttendance>): Promise<NamazAttendance | undefined> {
    const index = this.db.namazAttendance.findIndex(n => n.id === id);
    if (index === -1) return undefined;
    
    this.db.namazAttendance[index] = { ...this.db.namazAttendance[index], ...namazAttendanceUpdate };
    this.saveDatabase();
    return this.db.namazAttendance[index];
  }

  async deleteNamazAttendance(id: number): Promise<boolean> {
    const index = this.db.namazAttendance.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.db.namazAttendance.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Leaves
  async getLeave(id: number): Promise<Leave | undefined> {
    return this.db.leaves.find(l => l.id === id);
  }

  async getLeaveByFilter(filters: Partial<Leave>): Promise<Leave[]> {
    return this.db.leaves.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Leave] === value;
      });
    });
  }

  async createLeave(insertLeave: InsertLeave): Promise<Leave> {
    const record: Leave = {
      id: this.getNextId('leaves'),
      ...insertLeave,
      createdAt: new Date(),
    };
    this.db.leaves.push(record);
    this.saveDatabase();
    return record;
  }

  async updateLeave(id: number, leaveUpdate: Partial<Leave>): Promise<Leave | undefined> {
    const index = this.db.leaves.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    
    this.db.leaves[index] = { ...this.db.leaves[index], ...leaveUpdate };
    this.saveDatabase();
    return this.db.leaves[index];
  }

  async deleteLeave(id: number): Promise<boolean> {
    const index = this.db.leaves.findIndex(l => l.id === id);
    if (index === -1) return false;
    
    this.db.leaves.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Results
  async getResult(id: number): Promise<Result | undefined> {
    return this.db.results.find(r => r.id === id);
  }

  async getResultByFilter(filters: Partial<Result>): Promise<Result[]> {
    return this.db.results.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Result] === value;
      });
    });
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const record: Result = {
      id: this.getNextId('results'),
      ...insertResult,
      uploadDate: new Date(),
    };
    this.db.results.push(record);
    this.saveDatabase();
    return record;
  }

  async updateResult(id: number, resultUpdate: Partial<Result>): Promise<Result | undefined> {
    const index = this.db.results.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    
    this.db.results[index] = { ...this.db.results[index], ...resultUpdate };
    this.saveDatabase();
    return this.db.results[index];
  }

  async deleteResult(id: number): Promise<boolean> {
    const index = this.db.results.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.db.results.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Remarks
  async getRemark(id: number): Promise<Remark | undefined> {
    return this.db.remarks.find(r => r.id === id);
  }

  async getRemarkByFilter(filters: Partial<Remark>): Promise<Remark[]> {
    return this.db.remarks.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Remark] === value;
      });
    });
  }

  async createRemark(insertRemark: InsertRemark): Promise<Remark> {
    const record: Remark = {
      id: this.getNextId('remarks'),
      ...insertRemark,
      createdAt: new Date(),
    };
    this.db.remarks.push(record);
    this.saveDatabase();
    return record;
  }

  async updateRemark(id: number, remarkUpdate: Partial<Remark>): Promise<Remark | undefined> {
    const index = this.db.remarks.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    
    this.db.remarks[index] = { ...this.db.remarks[index], ...remarkUpdate };
    this.saveDatabase();
    return this.db.remarks[index];
  }

  async deleteRemark(id: number): Promise<boolean> {
    const index = this.db.remarks.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.db.remarks.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Subjects
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.db.subjects.find(s => s.id === id);
  }

  async getSubjects(filters?: Partial<Subject>): Promise<Subject[]> {
    if (!filters) return this.db.subjects;
    
    return this.db.subjects.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Subject] === value;
      });
    });
  }

  async getSubjectByFilter(filters: Partial<Subject>): Promise<Subject[]> {
    return this.getSubjects(filters);
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const record: Subject = {
      id: this.getNextId('subjects'),
      ...insertSubject,
      year: insertSubject.year || null,
      stream: insertSubject.stream || null,
      section: insertSubject.section || null,
      createdAt: new Date(),
    };
    this.db.subjects.push(record);
    this.saveDatabase();
    return record;
  }

  async updateSubject(id: number, subjectUpdate: Partial<Subject>): Promise<Subject | undefined> {
    const index = this.db.subjects.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    this.db.subjects[index] = { ...this.db.subjects[index], ...subjectUpdate };
    this.saveDatabase();
    return this.db.subjects[index];
  }

  async deleteSubject(id: number): Promise<boolean> {
    const index = this.db.subjects.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.db.subjects.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Timetable
  async getTimetable(filters?: Partial<Timetable>): Promise<any[]> {
    let records = this.db.timetable;
    
    if (filters) {
      records = records.filter(record => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          if ((key === 'stream' || key === 'section') && filters.courseType === 'post-pu') return true;
          return record[key as keyof Timetable] === value;
        });
      });
    }

    // Join with subjects
    return records.map(tt => {
      const subject = this.db.subjects.find(s => s.id === tt.subjectId);
      return {
        ...tt,
        subjectName: subject?.subject || null,
        subjectCode: subject?.subjectCode || null,
      };
    });
  }

  async getTimetableByFilter(filters: Partial<Timetable>): Promise<any[]> {
    return this.getTimetable(filters);
  }

  async getTimetableEntry(filters: { courseType: string; year: string; stream?: string; section: string; dayOfWeek: string; periodNumber: number }): Promise<Timetable | undefined> {
    return this.db.timetable.find(tt => {
      if (tt.courseType !== filters.courseType) return false;
      if (tt.year !== filters.year) return false;
      if (tt.dayOfWeek !== filters.dayOfWeek) return false;
      if (tt.periodNumber !== filters.periodNumber) return false;
      
      if (filters.stream === 'science') {
        if (tt.section !== '') return false;
      } else if (filters.courseType === 'post-pu') {
        if (tt.section !== null) return false;
      } else {
        if (tt.section !== filters.section) return false;
      }
      
      if (filters.stream) {
        if (tt.stream !== filters.stream) return false;
      } else {
        if (tt.stream !== null) return false;
      }
      
      return true;
    });
  }

  async createTimetableEntry(insertTimetable: InsertTimetable): Promise<Timetable> {
    const record: Timetable = {
      id: this.getNextId('timetable'),
      ...insertTimetable,
      stream: insertTimetable.stream || null,
      subjectId: insertTimetable.subjectId || null,
      startTime: insertTimetable.startTime || null,
      endTime: insertTimetable.endTime || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.db.timetable.push(record);
    this.saveDatabase();
    return record;
  }

  async bulkCreateTimetable(entries: InsertTimetable[]): Promise<Timetable[]> {
    const records = entries.map(entry => ({
      id: this.getNextId('timetable'),
      ...entry,
      stream: entry.stream || null,
      subjectId: entry.subjectId || null,
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    this.db.timetable.push(...records);
    this.saveDatabase();
    return records;
  }

  async bulkUpsertTimetable(entries: InsertTimetable[]): Promise<Timetable[]> {
    const results: Timetable[] = [];
    
    for (const entry of entries) {
      const existing = await this.getTimetableEntry({
        courseType: entry.courseType,
        year: entry.year,
        stream: entry.stream,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
      });
      
      if (existing) {
        const updated = await this.updateTimetableEntry(existing.id, {
          subjectId: entry.subjectId,
          startTime: entry.startTime,
          endTime: entry.endTime,
        });
        if (updated) results.push(updated);
      } else {
        const created = await this.createTimetableEntry(entry);
        results.push(created);
      }
    }
    
    return results;
  }

  async updateTimetableEntry(id: number, timetableUpdate: Partial<Timetable>): Promise<Timetable | undefined> {
    const index = this.db.timetable.findIndex(tt => tt.id === id);
    if (index === -1) return undefined;
    
    this.db.timetable[index] = { ...this.db.timetable[index], ...timetableUpdate, updatedAt: new Date() };
    this.saveDatabase();
    return this.db.timetable[index];
  }

  async deleteTimetableEntry(id: number): Promise<boolean> {
    const index = this.db.timetable.findIndex(tt => tt.id === id);
    if (index === -1) return false;
    
    this.db.timetable.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Holidays
  async getHoliday(id: number): Promise<Holiday | undefined> {
    return this.db.holidays.find(h => h.id === id);
  }

  async getHolidayByFilter(filters: Partial<Holiday>): Promise<Holiday[]> {
    return this.db.holidays.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return record[key as keyof Holiday] === value;
      });
    });
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const record: Holiday = {
      id: this.getNextId('holidays'),
      ...insertHoliday,
      createdAt: new Date(),
    };
    this.db.holidays.push(record);
    this.saveDatabase();
    return record;
  }

  async updateHoliday(id: number, holidayUpdate: Partial<Holiday>): Promise<Holiday | undefined> {
    const index = this.db.holidays.findIndex(h => h.id === id);
    if (index === -1) return undefined;
    
    this.db.holidays[index] = { ...this.db.holidays[index], ...holidayUpdate };
    this.saveDatabase();
    return this.db.holidays[index];
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const index = this.db.holidays.findIndex(h => h.id === id);
    if (index === -1) return false;
    
    this.db.holidays.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // Missed Sections
  async getMissedSections(filters?: any): Promise<MissedSection[]> {
    // Ensure missedSections array exists
    if (!this.db.missedSections) {
      this.db.missedSections = [];
      this.saveDatabase();
    }
    
    let records = this.db.missedSections;
    
    if (filters) {
      records = records.filter(record => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          if (key === 'isCompleted' && typeof value === 'boolean') {
            return record.isCompleted === value;
          }
          return record[key as keyof MissedSection] === value;
        });
      });
    }

    // Add calculated fields
    return records.map(section => ({
      ...section,
      daysPending: Math.floor((new Date().getTime() - new Date(section.detectedAt).getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  async createMissedSection(section: any): Promise<MissedSection> {
    const record: MissedSection = {
      id: this.getNextId('missedSections'),
      courseType: section.courseType,
      year: section.year,
      stream: section.stream || null,
      section: section.section,
      subject: section.subject,
      subjectName: section.subjectName,
      missedDate: section.missedDate,
      periodNumber: section.periodNumber,
      dayOfWeek: section.dayOfWeek,
      scheduledStartTime: section.scheduledStartTime || null,
      scheduledEndTime: section.scheduledEndTime || null,
      reason: section.reason || 'Attendance not taken',
      detectedAt: section.detectedAt || new Date(),
      isCompleted: false,
      completedAt: null,
      makeupDate: null,
      priority: section.priority || 'normal',
      daysPending: 0,
      autoDetected: section.autoDetected !== undefined ? section.autoDetected : true,
      completedBy: null,
      remarks: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.db.missedSections.push(record);
    this.saveDatabase();
    return record;
  }

  async updateMissedSection(id: number, sectionUpdate: any): Promise<MissedSection | undefined> {
    const index = this.db.missedSections.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    this.db.missedSections[index] = { 
      ...this.db.missedSections[index], 
      ...sectionUpdate, 
      updatedAt: new Date() 
    };
    this.saveDatabase();
    return this.db.missedSections[index];
  }

  // Period Definitions
  async getPeriodDefinitions(): Promise<PeriodDefinition[]> {
    return this.db.periodDefinitions.filter(p => p.isActive);
  }

  async createPeriodDefinition(definition: any): Promise<PeriodDefinition> {
    const record: PeriodDefinition = {
      id: this.getNextId('periodDefinitions'),
      periodNumber: definition.periodNumber,
      startTime: definition.startTime,
      endTime: definition.endTime,
      label: definition.label || null,
      isActive: true,
      createdAt: new Date(),
    };
    
    this.db.periodDefinitions.push(record);
    this.saveDatabase();
    return record;
  }

  async updatePeriodDefinition(id: number, definitionUpdate: any): Promise<PeriodDefinition | undefined> {
    const index = this.db.periodDefinitions.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    this.db.periodDefinitions[index] = { 
      ...this.db.periodDefinitions[index], 
      ...definitionUpdate 
    };
    this.saveDatabase();
    return this.db.periodDefinitions[index];
  }

  async deletePeriodDefinition(id: number): Promise<boolean> {
    const index = this.db.periodDefinitions.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    // Soft delete
    this.db.periodDefinitions[index].isActive = false;
    this.saveDatabase();
    return true;
  }
}
