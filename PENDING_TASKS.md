# Pending Tasks - December 6, 2025

## Current Status Summary

### ✅ Completed
1. **Database Connection** - Neon PostgreSQL working
2. **Core APIs** - All 11 API endpoints deployed and functional
3. **Firebase Setup** - Library installed, helper functions created
4. **Student PATCH Endpoint** - Photo upload support added (but incomplete)
5. **Timetable Consolidation** - bulk-upsert already removed

### 📊 Current API Count
**Total Serverless Functions: 11**
- `/api/attendance/index.js` - GET, POST
- `/api/auth/index.js` - GET, POST
- `/api/holidays.js` - GET, POST, DELETE
- `/api/leaves/index.js` - GET, POST
- `/api/namaz-attendance/index.js` - GET, POST
- `/api/remarks.js` - GET, POST
- `/api/results.js` - GET, POST
- `/api/students/index.js` - GET, POST, PATCH
- `/api/subjects/index.js` - GET, POST
- `/api/timetable/index.js` - GET, POST

**Vercel Hobby Limit:** 12 functions
**Available Slots:** 1 function

---

## 🎯 Priority Tasks

### Priority 1: Complete Student Photo Upload (BLOCKED)
**Status:** Partially implemented but incomplete
**Issue:** The PATCH endpoint in `api/students/index.js` is truncated/incomplete
**Action Required:**
1. Fix the incomplete PATCH handler
2. Add proper error handling for photo deletion
3. Add support for updating other student fields
4. Test photo upload functionality

**Files to Fix:**
- `api/students/index.js` - Complete the PATCH method

### Priority 2: Firebase Configuration
**Status:** Code ready, environment variables missing
**Action Required:**
1. Create Firebase project at https://console.firebase.google.com
2. Enable Firebase Storage
3. Configure storage rules
4. Add environment variables to Vercel:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_STORAGE_BUCKET`

**Files Ready:**
- `api/lib/firebase.js` ✅ Already created

### Priority 3: Remove Debug Code
**Status:** Multiple console.log statements in production
**Action Required:**
Remove or comment out console.log statements in:
- `api/students/index.js` (4 instances)
- `api/namaz-attendance/index.js` (4 instances)
- `api/leaves/index.js` (1 instance)
- `api/attendance/index.js` (3 instances)

**Total:** 12 console.log statements to clean up

### Priority 4: API Consolidation (Optional)
**Status:** Not urgent - we have 1 free slot
**Benefit:** Would free up more function slots for future features
**Candidates for Consolidation:**
- Holidays, Remarks, Results (3 simple endpoints → 1 combined)
- Would save 2 function slots

---

## 📋 Detailed Action Plan

### Task 1: Fix Student Photo Upload
**Time Estimate:** 15 minutes

1. Complete the PATCH handler in `api/students/index.js`
2. Add support for:
   - Photo upload (already started)
   - Photo deletion
   - General field updates (name, contact, etc.)
3. Add proper error handling
4. Test with frontend

### Task 2: Setup Firebase
**Time Estimate:** 20 minutes

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Name: "darul-irshad-madrasa"
   - Disable Google Analytics (optional)

2. **Enable Storage:**
   - Go to Storage in left menu
   - Click "Get Started"
   - Choose production mode
   - Select location (asia-south1 for India)

3. **Configure Storage Rules:**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /students/{studentId}/{allPaths=**} {
         allow read: if true;  // Public read
         allow write: if request.auth != null;  // Authenticated write
       }
     }
   }
   ```

4. **Get Service Account:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON file
   - Extract values for environment variables

5. **Add to Vercel:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add:
     - `FIREBASE_PROJECT_ID` = from JSON
     - `FIREBASE_CLIENT_EMAIL` = from JSON
     - `FIREBASE_PRIVATE_KEY` = from JSON (entire key with \n)
     - `FIREBASE_STORAGE_BUCKET` = `your-project.firebasestorage.app`

### Task 3: Clean Up Debug Code
**Time Estimate:** 10 minutes

Remove console.log statements from production code:
- Keep error logs (console.error)
- Remove info logs (console.log)
- Add proper logging service if needed later

### Task 4: Test Photo Upload
**Time Estimate:** 15 minutes

1. Deploy changes to Vercel
2. Test photo upload from frontend
3. Verify image appears in Firebase Storage
4. Verify URL saved to database
5. Test photo deletion

---

## 🚀 Recommended Execution Order

### Today (High Priority):
1. ✅ Fix incomplete PATCH endpoint (15 min)
2. ✅ Setup Firebase project (20 min)
3. ✅ Test photo upload (15 min)
**Total: 50 minutes**

### This Week (Medium Priority):
4. Clean up debug code (10 min)
5. Document Firebase setup in README

### Future (Low Priority):
6. API consolidation (if needed)
7. Add more features (results, remarks, etc.)

---

## 🔍 Technical Details

### Current Student PATCH Implementation
The endpoint is incomplete. Here's what needs to be added:

```javascript
if (req.method === 'PATCH') {
  const { id, photoBase64, photoContentType, deletePhoto, ...updateFields } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  // Handle photo upload
  if (photoBase64 && photoContentType) {
    // ... existing code ...
  }
  
  // Handle photo deletion
  if (deletePhoto) {
    try {
      await deleteStudentPhoto(id);
      await sql`UPDATE students SET photo_url = NULL WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Photo deleted' });
    } catch (error) {
      console.error('Photo deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete photo' });
    }
  }
  
  // Handle general field updates
  if (Object.keys(updateFields).length > 0) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updateFields)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = $${paramIndex++}`);
      values.push(value);
    }
    
    values.push(id);
    const query = `UPDATE students SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await sql(query, values);
    return res.status(200).json(toCamelCase(result[0]));
  }
  
  return res.status(400).json({ error: 'No update data provided' });
}
```

### Firebase Storage Structure
```
/students/
  /{studentId}/
    - photo.jpg (student photo)
    - documents/
      - {documentId}.pdf (certificates, etc.)
```

### Environment Variables Needed
```env
# Firebase Admin SDK (for server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
```

---

## 📞 Next Steps

**Ready to start?** Let me know which task you'd like to tackle first:

1. **Fix Student Photo Upload** - Complete the PATCH endpoint
2. **Setup Firebase** - Create project and configure storage
3. **Clean Debug Code** - Remove console.log statements
4. **All of the above** - I'll do them in order

**Estimated Total Time:** ~1 hour for all high-priority tasks

---

*Last Updated: December 6, 2025*
