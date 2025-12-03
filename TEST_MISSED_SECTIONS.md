# Testing Missed Sections Feature

## Quick Test Guide

### 1. Test Manual Detection Trigger

```bash
# Login first to get session cookie
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"darul001","password":"darul100"}' \
  -c cookies.txt

# Trigger missed section detection
curl -X POST http://localhost:5000/api/missed-sections/auto-detect \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "status": "completed",
  "date": "2025-12-01",
  "scheduledCount": 0,
  "missedCount": 0,
  "missedPeriods": []
}
```

### 2. Test Get Pending Missed Sections

```bash
# Get all pending missed sections
curl http://localhost:5000/api/missed-sections/queue \
  -b cookies.txt

# Get filtered by class
curl "http://localhost:5000/api/missed-sections/queue?courseType=pu&year=1" \
  -b cookies.txt
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "courseType": "pu",
    "year": "1",
    "stream": "commerce",
    "section": "A",
    "subject": "ACC1",
    "subjectName": "Accountancy",
    "missedDate": "2025-12-01",
    "periodNumber": 1,
    "dayOfWeek": "monday",
    "isCompleted": false,
    "daysPending": 1,
    "fullClassName": "pu 1 commerce A",
    "formattedDate": "Mon, Dec 01, 2025"
  }
]
```

### 3. Test Complete Missed Section

```bash
# Mark a missed section as completed
curl -X POST http://localhost:5000/api/missed-sections/1/makeup \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"makeupDate":"2025-12-02"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Missed section marked as completed"
}
```

---

## Browser Testing

### Via Browser Console

1. **Open browser** at http://localhost:5000
2. **Login** with credentials: `darul001` / `darul100`
3. **Open DevTools Console** (F12)
4. **Run these commands:**

```javascript
// Test manual detection
fetch('/api/missed-sections/auto-detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);

// Get pending sections
fetch('/api/missed-sections/queue')
.then(r => r.json())
.then(console.log);

// Complete a section (replace ID)
fetch('/api/missed-sections/1/makeup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ makeupDate: '2025-12-02' })
})
.then(r => r.json())
.then(console.log);
```

---

## Verification Steps

### ✅ Check 1: Storage Methods Available
```javascript
// In server console, you should see:
// [STORAGE] Using JsonStorage - data persisted to db.json file
// 📋 Using JSON-compatible missed section detector
```

### ✅ Check 2: Auto-Detection Scheduled
```javascript
// In server console, you should see:
// ⏰ [JSON] Scheduling missed section detection to run in X minutes at midnight
```

### ✅ Check 3: db.json File Created
```bash
# Check if db.json exists and has missedSections array
cat db.json | grep missedSections
```

### ✅ Check 4: API Endpoints Respond
```bash
# All these should return 200 OK (or 401 if not logged in)
curl -I http://localhost:5000/api/missed-sections/queue
curl -I -X POST http://localhost:5000/api/missed-sections/auto-detect
```

---

## Expected Behavior

### Scenario 1: No Timetable Data
- Detection runs but finds 0 scheduled periods
- Response: `{ "scheduledCount": 0, "missedCount": 0 }`
- This is normal if you haven't set up timetables yet

### Scenario 2: With Timetable, No Attendance
- Detection finds scheduled periods
- Checks for attendance records
- Creates missed section for periods without attendance
- Response: `{ "scheduledCount": 3, "missedCount": 2 }`

### Scenario 3: Holiday Declared
- Detection checks holiday status
- Skips detection if holiday found
- Response: `{ "status": "skipped", "reason": "holiday" }`

### Scenario 4: All Attendance Taken
- Detection finds scheduled periods
- All periods have attendance records
- No missed sections created
- Response: `{ "scheduledCount": 3, "missedCount": 0 }`

---

## Troubleshooting

### Issue: "Method not available in storage"
**Solution:** Restart server - methods should be loaded

### Issue: Empty queue always
**Possible Causes:**
1. No timetable configured
2. All attendance taken
3. Yesterday was a holiday
4. Detection hasn't run yet

**Solution:** 
- Add timetable entries
- Skip some attendance
- Manually trigger detection

### Issue: Detection not running at midnight
**Solution:** 
- Check server logs for scheduling message
- Verify server stays running
- Manually trigger for testing

---

## Sample Data Setup

### 1. Add Students
```javascript
// Via UI: Student Management → Add Student
// Or via API:
fetch('/api/students', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Test Student",
    rollNo: "101",
    courseType: "pu",
    courseDivision: "commerce",
    year: "1",
    batch: "A",
    dob: "2005-01-01"
  })
})
```

### 2. Add Subjects
```javascript
fetch('/api/subjects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: "Accountancy",
    subjectCode: "ACC1",
    courseType: "pu",
    year: "1",
    stream: "commerce",
    section: "A"
  })
})
```

### 3. Add Timetable
```javascript
fetch('/api/timetable', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    courseType: "pu",
    year: "1",
    stream: "commerce",
    section: "A",
    dayOfWeek: "monday",
    periodNumber: 1,
    subjectId: 1  // Use actual subject ID
  })
})
```

### 4. Skip Attendance (to create missed section)
```javascript
// Don't take attendance for a day
// Then trigger detection
fetch('/api/missed-sections/auto-detect', { method: 'POST' })
```

---

## Success Indicators

✅ Server starts without errors  
✅ JSON detector loads successfully  
✅ Auto-detection scheduled  
✅ Manual trigger works  
✅ Queue endpoint returns data  
✅ Completion endpoint works  
✅ db.json contains missedSections array  

---

**All features are now fully functional!** 🎉
