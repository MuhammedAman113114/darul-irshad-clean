# API Endpoints Testing Guide

## Quick Test Commands

### 1. Test Authentication
```bash
# Login
curl -X POST https://darul-irshad-clean.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"darul001","password":"darul100"}' \
  -c cookies.txt

# Check session
curl https://darul-irshad-clean.vercel.app/api/auth/me \
  -b cookies.txt
```

### 2. Test Students
```bash
# Get all students
curl https://darul-irshad-clean.vercel.app/api/students \
  -b cookies.txt

# Get filtered students
curl "https://darul-irshad-clean.vercel.app/api/students?courseType=pu&year=1" \
  -b cookies.txt

# Create student
curl -X POST https://darul-irshad-clean.vercel.app/api/students \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test Student",
    "rollNo": "TEST001",
    "courseType": "pu",
    "year": "1",
    "courseDivision": "commerce",
    "batch": "A"
  }'
```

### 3. Test Attendance
```bash
# Record attendance
curl -X POST https://darul-irshad-clean.vercel.app/api/attendance \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "studentId": 1,
    "rollNo": "101",
    "date": "2025-12-04",
    "period": 1,
    "status": "present",
    "courseType": "pu",
    "batchYear": "1"
  }'

# Get attendance
curl "https://darul-irshad-clean.vercel.app/api/attendance?date=2025-12-04" \
  -b cookies.txt
```

### 4. Test Namaz
```bash
# Record namaz
curl -X POST https://darul-irshad-clean.vercel.app/api/namaz-attendance \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-04",
    "prayer": "zuhr",
    "students": [{"id": 1, "status": "present"}]
  }'

# Get namaz records
curl "https://darul-irshad-clean.vercel.app/api/namaz-attendance?date=2025-12-04" \
  -b cookies.txt
```

### 5. Test Subjects
```bash
# Create subject
curl -X POST https://darul-irshad-clean.vercel.app/api/subjects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "subject": "Arabic",
    "subjectCode": "ARB",
    "courseType": "pu",
    "year": "1",
    "stream": "commerce",
    "section": "A"
  }'

# Get subjects
curl "https://darul-irshad-clean.vercel.app/api/subjects?courseType=pu&year=1" \
  -b cookies.txt
```

### 6. Test Timetable
```bash
# Create timetable entry
curl -X POST https://darul-irshad-clean.vercel.app/api/timetable \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "courseType": "pu",
    "year": "1",
    "stream": "commerce",
    "section": "A",
    "dayOfWeek": "monday",
    "periodNumber": 1,
    "subjectId": 1,
    "startTime": "09:00",
    "endTime": "10:00"
  }'

# Get timetable
curl "https://darul-irshad-clean.vercel.app/api/timetable?courseType=pu&year=1" \
  -b cookies.txt
```

### 7. Test Holidays
```bash
# Create holiday
curl -X POST https://darul-irshad-clean.vercel.app/api/holidays \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-25",
    "name": "Christmas",
    "type": "academic"
  }'

# Get holidays
curl https://darul-irshad-clean.vercel.app/api/holidays \
  -b cookies.txt
```

### 8. Test Leaves
```bash
# Create leave
curl -X POST https://darul-irshad-clean.vercel.app/api/leaves \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "studentId": 1,
    "fromDate": "2025-12-10",
    "toDate": "2025-12-12",
    "reason": "Medical",
    "status": "active"
  }'

# Get leaves
curl "https://darul-irshad-clean.vercel.app/api/leaves?studentId=1" \
  -b cookies.txt
```

### 9. Test Remarks
```bash
# Add remark
curl -X POST https://darul-irshad-clean.vercel.app/api/remarks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "studentId": 1,
    "content": "Excellent performance",
    "category": "performance"
  }'

# Get remarks
curl "https://darul-irshad-clean.vercel.app/api/remarks?studentId=1" \
  -b cookies.txt
```

### 10. Test Results
```bash
# Upload result
curl -X POST https://darul-irshad-clean.vercel.app/api/results \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "year": "1st PU",
    "courseType": "pu",
    "courseName": "commerce",
    "section": "A",
    "examType": "Mid Term",
    "fileUrl": "https://example.com/result.pdf",
    "fileType": "pdf"
  }'

# Get results
curl "https://darul-irshad-clean.vercel.app/api/results?courseType=pu&year=1st%20PU" \
  -b cookies.txt
```

## Browser Console Testing

Open browser console on https://darul-irshad-clean.vercel.app and run:

```javascript
// Login first
await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'darul001', password: 'darul100' })
}).then(r => r.json()).then(console.log);

// Test students
await fetch('/api/students').then(r => r.json()).then(console.log);

// Test attendance
await fetch('/api/attendance?date=2025-12-04').then(r => r.json()).then(console.log);

// Test namaz
await fetch('/api/namaz-attendance?date=2025-12-04').then(r => r.json()).then(console.log);

// Test subjects
await fetch('/api/subjects?courseType=pu&year=1').then(r => r.json()).then(console.log);

// Test timetable
await fetch('/api/timetable?courseType=pu&year=1').then(r => r.json()).then(console.log);

// Test holidays
await fetch('/api/holidays').then(r => r.json()).then(console.log);
```

## Expected Responses

### Success Response (200/201)
```json
{
  "id": 1,
  "name": "Test Student",
  "rollNo": "TEST001",
  "courseType": "pu",
  "year": "1",
  "createdAt": "2025-12-04T..."
}
```

### Error Response (401)
```json
{
  "error": "Unauthorized"
}
```

### Error Response (404)
```json
{
  "error": "Resource not found"
}
```

### Error Response (500)
```json
{
  "error": "Database operation failed",
  "message": "Detailed error message"
}
```

## Deployment Verification

After deploying to Vercel:

1. Check Vercel dashboard for function logs
2. Verify DATABASE_URL environment variable is set
3. Test each endpoint using the commands above
4. Monitor for any errors in Vercel logs
5. Check Neon dashboard for database queries

## Common Issues

### 401 Unauthorized
- Session cookie not set
- Login first using `/api/auth/login`

### 500 Database Error
- Check DATABASE_URL is correct
- Verify Neon database is accessible
- Check table schema matches

### CORS Errors
- CORS headers are set in all endpoints
- Should work from any origin

### Timeout Errors
- Vercel functions have 10s timeout
- Optimize queries if needed
- Check Neon connection

## Success Criteria

✅ All endpoints return 200/201 for valid requests  
✅ Authentication works with session cookies  
✅ Data is persisted in Neon database  
✅ CamelCase conversion works correctly  
✅ Error handling returns appropriate status codes  
✅ Frontend can interact with all endpoints  

---

**Ready to deploy!** 🚀
