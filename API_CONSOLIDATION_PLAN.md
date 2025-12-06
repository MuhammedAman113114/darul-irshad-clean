# API Consolidation & Next Steps Plan

## Current Status
- **Total API Functions**: ~15+ separate endpoints
- **Vercel Free Tier Limit**: 12 serverless functions
- **Issue**: Need to consolidate to free up slots for new features

## Phase 1: API Consolidation ✅ IN PROGRESS

### 1.1 Timetable Consolidation (READY)
**Current**: 2 functions
- `/api/timetable/index.js` (GET, POST with bulk support)
- `/api/timetable/bulk-upsert.js` (POST bulk - DUPLICATE)

**Action**: Delete `bulk-upsert.js` - functionality already in index.js
**Savings**: 1 function slot

### 1.2 Auth Consolidation (ALREADY DONE ✅)
**Current**: 1 function
- `/api/auth/index.js` (GET for /me, POST for login)
**Status**: Already consolidated

### 1.3 Students API Consolidation (TODO)
**Current**: Multiple endpoints in `/api/students/`
**Action**: Consolidate into single handler with method routing

### 1.4 Attendance API Consolidation (TODO)
**Current**: Multiple endpoints in `/api/attendance/`
**Action**: Consolidate into single handler with method routing

## Phase 2: Firebase Setup 🔥

### 2.1 Firebase Project Setup
- [ ] Create Firebase project
- [ ] Enable Firebase Storage
- [ ] Configure storage rules for images/PDFs
- [ ] Get Firebase config credentials

### 2.2 Firebase Integration
- [ ] Install Firebase SDK: `npm install firebase-admin`
- [ ] Create `/api/lib/firebase.js` helper
- [ ] Add Firebase env vars to `.env` and Vercel

### 2.3 Storage Structure
```
/students/{studentId}/
  - photo.jpg
  - documents/{documentId}.pdf
```

## Phase 3: Student Photo Upload API 📸

### 3.1 New Endpoint (Once we have free slots)
**Endpoint**: `PATCH /api/students/[id]`
**Features**:
- Upload student photo to Firebase Storage
- Update student record with photo URL
- Support base64 or multipart/form-data
- Image validation (size, format)

### 3.2 Frontend Integration
- Add photo upload UI to student profile
- Camera capture support for mobile
- Image preview before upload

## Phase 4: Cleanup Debug Code 🧹

### 4.1 Remove Temporary Bypasses
- [ ] Remove lock bypasses in attendance
- [ ] Remove validation bypasses
- [ ] Restore proper error handling
- [ ] Remove console.log debug statements

### 4.2 Files to Clean
- `client/src/components/attendance/AttendanceScreen.tsx`
- `api/namaz-attendance/index.js`
- Any other files with "TEMPORARY" or "DEBUG" comments

## Estimated Function Count After Consolidation
- Auth: 1 function ✅
- Timetable: 1 function (after removing bulk-upsert)
- Students: 1 function (after consolidation)
- Attendance: 1 function (after consolidation)
- Namaz Attendance: 1 function
- Leaves: 1 function
- Subjects: 1 function
- Holidays: 1 function
- Remarks: 1 function
- Results: 1 function
- **Total**: ~10 functions
- **Available for new features**: 2 slots

## Next Immediate Actions
1. ✅ Delete `/api/timetable/bulk-upsert.js`
2. Consolidate students API
3. Consolidate attendance API
4. Set up Firebase
5. Add student photo upload endpoint
