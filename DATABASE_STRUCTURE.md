# Darul Irshad - Database Structure

## What Data is Stored in the Database

Your Neon PostgreSQL database stores **15 tables** with all the data for your student management system:

---

## 1. **Students** 👨‍🎓
**Purpose**: Store all student information

**Data Stored**:
- Basic Info: Name, Roll Number, Date of Birth, Blood Group
- Academic: Course Type (PU/Post-PU), Year, Division (Commerce/Science), Section (A/B), Batch
- Family: Father Name, Mother Name
- Contact: Contact 1, Contact 2, Address, Aadhar Number
- Photo: Photo URL (uploaded to Firebase, URL stored in DB)
- Status: Active/Inactive
- Created Date

**Example**: "Aman, Roll 101, 1st PU Commerce Section A"

---

## 2. **Attendance** 📝
**Purpose**: Daily attendance tracking

**Data Stored**:
- Student ID, Roll Number
- Date, Period Number
- Status: Present/Absent/Leave/Emergency
- Course Type, Course Name, Section, Batch Year
- Subject ID (linked to timetable)
- Recorded At (timestamp)
- Created By (teacher ID)

**Example**: "Aman was Present in Period 1 on 2025-12-03"

---

## 3. **Namaz Attendance** 🕌
**Purpose**: Islamic prayer attendance tracking

**Data Stored**:
- Student ID
- Date
- Prayer: Fajr/Zuhr/Asr/Maghrib/Isha
- Status: Present/Absent/On-leave
- Created By (teacher ID)

**Example**: "Aman attended Fajr prayer on 2025-12-03"

---

## 4. **Leaves** 📅
**Purpose**: Student leave requests

**Data Stored**:
- Student ID
- From Date, To Date
- Reason
- Status: Active/Completed
- Created By (teacher ID)

**Example**: "Aman on leave from 2025-12-05 to 2025-12-07 (Sick)"

---

## 5. **Subjects** 📚
**Purpose**: Course subjects

**Data Stored**:
- Subject Name, Subject Code
- Course Type, Year, Stream, Section
- Created By (teacher ID)

**Example**: "Arabic (ARB) - 1st PU Commerce Section A"

---

## 6. **Timetable** 🗓️
**Purpose**: Weekly class schedule

**Data Stored**:
- Course Type, Year, Stream, Section
- Day of Week (Monday-Saturday)
- Period Number
- Subject ID
- Start Time, End Time
- Created By (teacher ID)

**Example**: "Monday Period 1: Arabic (ARB) - 9:00 AM to 10:00 AM"

---

## 7. **Holidays** 🎉
**Purpose**: Academic calendar holidays

**Data Stored**:
- Date, Name
- Type: Academic/Emergency
- Reason
- Affected Courses (PU/Post-PU)
- Triggered At (for emergency holidays)
- Is Deleted (for undo)
- Created By (teacher ID)

**Example**: "Independence Day - August 15, 2025 (Academic Holiday)"

---

## 8. **Missed Sections** ⏰
**Purpose**: Auto-detected missed classes

**Data Stored**:
- Course Type, Year, Stream, Section
- Subject, Subject Name
- Missed Date, Period Number, Day of Week
- Scheduled Start/End Time
- Detected At, Reason
- Is Completed, Completed At, Makeup Date
- Priority, Days Pending
- Auto Detected flag
- Completed By (teacher ID)

**Example**: "Arabic class missed on Monday Period 1 - Pending makeup"

---

## 9. **Remarks** 💬
**Purpose**: Teacher comments about students

**Data Stored**:
- Student ID
- Content (remark text)
- Category: Discipline/Homework/Absence/Behavior/Performance/General
- Submitted By (teacher ID)
- Created At

**Example**: "Excellent performance in Arabic exam - Performance"

---

## 10. **Results** 📊
**Purpose**: Exam results and report cards

**Data Stored**:
- Year, Course Type, Course Name, Section
- Exam Type (Mid Term/Final/Unit Test)
- File URL (PDF/Excel uploaded to Firebase)
- File Type
- Uploaded By, Upload Date
- Notes

**Example**: "1st PU Commerce Section A - Mid Term Results (PDF)"

---

## 11. **Users** 👤
**Purpose**: Teacher/Admin authentication

**Data Stored**:
- Username, Password (hashed)
- Name, Role (teacher/principal/admin)
- Created At

**Example**: "darul001 - Admin - Teacher"

---

## 12. **Emergency Leave** 🚨
**Purpose**: Emergency period-wise leave

**Data Stored**:
- Date, Course Type, Year, Division, Section
- Affected Periods (array)
- Applied At, Applied By (teacher ID)
- Reason
- Is Active

**Example**: "Emergency leave for 1st PU Commerce A - Periods 2,3 on 2025-12-03"

---

## 13. **Period Definitions** ⏱️
**Purpose**: Custom period timings

**Data Stored**:
- Period Number
- Start Time, End Time
- Label (optional)
- Is Active

**Example**: "Period 1: 9:00 AM - 10:00 AM (Morning Session)"

---

## 14. **Timetable Period Config** ⚙️
**Purpose**: Class-specific period counts

**Data Stored**:
- Course Type, Year, Stream, Section
- Default Periods (per day)
- Custom Day Periods (JSON)
- Updated By (teacher ID)

**Example**: "1st PU Commerce A - 3 periods per day"

---

## 15. **Missed Attendance Status** 📋
**Purpose**: Legacy missed attendance tracking

**Data Stored**:
- Date, Course Type, Year, Division, Section, Period
- Status: Taken/Not Taken/Leave/Emergency/Holiday
- Taken By (teacher ID)
- Timestamp, Remarks
- Student Count, Attendance Key

**Example**: "1st PU Commerce A - Period 1 - Not Taken on 2025-12-03"

---

## Summary

### Core Data (Always Used):
1. ✅ **Students** - Student profiles
2. ✅ **Attendance** - Daily attendance
3. ✅ **Namaz Attendance** - Prayer tracking
4. ✅ **Leaves** - Leave management
5. ✅ **Subjects** - Course subjects
6. ✅ **Timetable** - Class schedules
7. ✅ **Holidays** - Academic calendar
8. ✅ **Users** - Teacher login

### Advanced Features (Optional):
9. ⚙️ **Missed Sections** - Auto-detection system
10. ⚙️ **Remarks** - Teacher comments
11. ⚙️ **Results** - Exam results
12. ⚙️ **Emergency Leave** - Emergency periods
13. ⚙️ **Period Definitions** - Custom timings
14. ⚙️ **Timetable Period Config** - Period settings
15. ⚙️ **Missed Attendance Status** - Legacy tracking

---

## Data Storage Locations

### In Neon PostgreSQL Database:
- ✅ All structured data (students, attendance, etc.)
- ✅ Text, numbers, dates, relationships

### In Firebase Storage:
- ✅ Student photos (images)
- ✅ Result files (PDF/Excel)
- ✅ Only URLs stored in database

### NOT Stored:
- ❌ Passwords (only hashed versions)
- ❌ Temporary UI state
- ❌ Session data (cookies only)

---

## Current Status

**Database**: Neon PostgreSQL (Serverless)  
**Connection**: ✅ Connected  
**Tables**: ✅ All 15 tables created  
**Data**: ✅ Ready to use

**Production URL**: https://darul-irshad-clean.vercel.app
