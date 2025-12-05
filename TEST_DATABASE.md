# 🔍 Test Database - Verify Data is Saving

## Quick Database Check

To verify if attendance and namaz data is actually being saved to the database, run these tests:

### Test 1: Check if Data Exists in Database

Open your browser console (F12) and run:

```javascript
// Test 1: Fetch all attendance records
fetch('/api/attendance', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('📊 Total attendance records:', data.length);
    console.log('Sample records:', data.slice(0, 5));
  });

// Test 2: Fetch all namaz records
fetch('/api/namaz-attendance', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('🕌 Total namaz records:', data.length);
    console.log('Sample records:', data.slice(0, 5));
  });

// Test 3: Fetch attendance for specific date
const today = new Date().toISOString().split('T')[0];
fetch(`/api/attendance?date=${today}`, { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log(`📅 Attendance for ${today}:`, data.length, 'records');
    console.log('Records:', data);
  });

// Test 4: Fetch namaz for specific date
fetch(`/api/namaz-attendance?date=${today}`, { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log(`🕌 Namaz for ${today}:`, data.length, 'records');
    console.log('Records:', data);
  });
```

### Test 2: Check Query Parameters

The issue might be with how the frontend is querying the data. Check what parameters are being sent:

```javascript
// Monitor all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/api/')) {
    console.log('🔍 API Call:', args[0]);
  }
  return originalFetch.apply(this, args);
};
```

### Test 3: Verify Database Schema

The attendance API expects these query parameters:
- `date` - Format: YYYY-MM-DD
- `courseType` - 'pu' or 'post-pu'
- `year` - '1', '2', etc.
- `section` - 'A', 'B', etc.
- `period` - 1-12
- `studentId` - Integer
- `status` - 'present', 'absent', 'leave'

The namaz API expects:
- `date` - Format: YYYY-MM-DD
- `prayer` - 'fajr', 'zuhr', 'asr', 'maghrib', 'isha'
- `studentId` - Integer
- `status` - 'present', 'absent', 'leave'

## Common Issues

### Issue 1: Wrong Query Parameters

**Problem:** Frontend sends `courseDivision` but API expects `courseName`

**Check:** Look at the network tab to see what parameters are being sent

**Fix:** Update the query to match the API expectations

### Issue 2: Date Format Mismatch

**Problem:** Frontend sends date in wrong format

**Expected:** `2025-12-05` (YYYY-MM-DD)
**Wrong:** `12/05/2025` or `2025-12-05T00:00:00Z`

### Issue 3: Missing Authentication

**Problem:** Session cookie not being sent

**Check:** 
```javascript
console.log('Cookies:', document.cookie);
```

**Fix:** Make sure you're logged in and cookies are enabled

### Issue 4: CORS Issues

**Problem:** Credentials not being sent with requests

**Check:** Network tab shows "credentials: omit"

**Fix:** Ensure `credentials: 'include'` is set in fetch calls

## Debugging Steps

### Step 1: Verify Data is Saving

1. Mark attendance for a student
2. Open console and run:
```javascript
fetch('/api/attendance?date=2025-12-05', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Saved records:', data));
```

### Step 2: Check What Frontend is Requesting

1. Open Network tab (F12 → Network)
2. Try to view history/sheet
3. Look for API calls to `/api/attendance` or `/api/namaz-attendance`
4. Check the query parameters in the URL
5. Check the response - is it empty or has data?

### Step 3: Compare Request vs Database

If the API returns empty but you know data exists:
- The query parameters don't match the saved data
- Check the exact values being sent vs what's in the database

## Quick Fix Commands

Run these in browser console to force sync and check data:

```javascript
// Force download all data from database
localStorage.clear();
location.reload();

// After reload, check what was downloaded
setTimeout(() => {
  console.log('Attendance in localStorage:', 
    JSON.parse(localStorage.getItem('attendance') || '[]').length);
  console.log('Namaz in localStorage:', 
    JSON.parse(localStorage.getItem('namazAttendance') || '[]').length);
}, 3000);
```

## Expected Results

If everything is working:
- ✅ API calls return data (not empty arrays)
- ✅ Console shows "Found X attendance records"
- ✅ Network tab shows 200 OK responses
- ✅ Response body contains the records

If not working:
- ❌ API returns empty array `[]`
- ❌ Console shows "Found 0 attendance records"
- ❌ Query parameters don't match saved data

## Next Steps

1. **Run Test 1** above to see if data exists in database
2. **Share the results** - How many records were found?
3. **Check the query parameters** - What's being sent when viewing history?
4. **I'll help fix** the query logic if needed

---

**Quick Test:** Run this now in your browser console:

```javascript
fetch('/api/attendance', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('📊 Total records in DB:', data.length));
```

Tell me what number you see!
