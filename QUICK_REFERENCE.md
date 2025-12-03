# 🚀 Quick Reference Card

## System Access
- **URL:** http://localhost:5000
- **Username:** `darul001`
- **Password:** `darul100`

---

## 📋 Core Features

### Students
```javascript
// Add student
POST /api/students
{ name, rollNo, courseType, year, courseDivision, batch, dob }

// Get students
GET /api/students?courseType=pu&year=1&courseDivision=commerce&section=A
```

### Attendance
```javascript
// Take attendance
POST /api/attendance
{ studentId, date, period, status, courseType, year }

// Get attendance
GET /api/attendance?date=2025-12-02&courseType=pu&year=1
```

### Namaz
```javascript
// Record namaz
POST /api/namaz-attendance
{ date, prayer, students: [{id, status}] }

// Get namaz records
GET /api/namaz-attendance?date=2025-12-02&prayer=zuhr
```

### Leaves
```javascript
// Create leave
POST /api/leaves
{ studentId, fromDate, toDate, reason }

// Get leaves
GET /api/leaves?studentId=1&status=active
```

---

## 🆕 New Features

### Period Definitions
```javascript
// Create period
POST /api/period-definitions
{ periodNumber: 1, startTime: "09:00", endTime: "10:00", label: "First Period" }

// Get all periods
GET /api/period-definitions
```

### Backup & Restore
```javascript
// Create backup
POST /api/backup/create

// List backups
GET /api/backup/list

// Restore backup
POST /api/backup/restore
{ filename: "backup_2025-12-02T00-03-28-123Z.json" }

// Export database
GET /api/backup/export
```

---

## 🔍 Missed Sections

```javascript
// Manual detection
POST /api/missed-sections/auto-detect

// Get pending
GET /api/missed-sections/queue?courseType=pu&year=1

// Complete makeup
POST /api/missed-sections/:id/makeup
{ makeupDate: "2025-12-03" }
```

---

## 📊 Quick Commands

### Browser Console

```javascript
// Login check
fetch('/api/auth/me').then(r => r.json()).then(console.log);

// Create backup
fetch('/api/backup/create', {method:'POST'}).then(r=>r.json()).then(console.log);

// Get students
fetch('/api/students?courseType=pu&year=1').then(r=>r.json()).then(console.log);

// Export database
window.open('/api/backup/export', '_blank');
```

---

## 📁 File Locations

- **Database:** `./db.json`
- **Backups:** `./backups/`
- **Logs:** Terminal output
- **Config:** `.env`

---

## 🆘 Troubleshooting

### Can't Login
```javascript
// Check auth
fetch('/api/auth/me').then(r => r.json()).then(console.log);
// If 401, login again
```

### Data Not Saving
```bash
# Check server running
# Check db.json exists
# Check browser console for errors
```

### Backup Failed
```bash
# Check backups directory exists
# Check file permissions
# Check disk space
```

---

## 📚 Documentation

- **READY_TO_USE.md** - Complete guide
- **NEW_FEATURES.md** - New features
- **FEATURE_STATUS.md** - All features
- **IMPLEMENTATION_COMPLETE.md** - Summary

---

## ⚡ Performance Tips

1. Filter queries by class
2. Use date ranges
3. Export monthly (not yearly)
4. Backup weekly
5. Clean old backups

---

## 🎯 Daily Workflow

1. Login
2. Check missed sections
3. Take attendance
4. Record namaz
5. Process leaves
6. Add remarks
7. Backup (weekly)

---

**System Status:** ✅ 100% Functional  
**Version:** 2.0.0  
**Last Updated:** December 2, 2025
