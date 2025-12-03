# ⚠️ Vercel Hobby Plan Limit Reached

## Problem
Vercel Hobby plan allows maximum **12 serverless functions**.
We currently have **15+ API files**.

## Solution Options

### Option 1: Consolidate APIs ⭐ RECOMMENDED
Combine multiple endpoints into fewer files:
- Merge `/api/namaz-attendance/history.js` + `/api/namaz-attendance/stats.js` into `/api/namaz-attendance/index.js`
- Merge `/api/attendance/by-subject.js` into `/api/attendance/index.js`
- Merge `/api/class-subjects.js` into `/api/subjects/index.js`

This will reduce from 15 to 10 functions.

### Option 2: Upgrade to Pro Plan
- Cost: $20/month
- Unlimited serverless functions
- Better performance
- More features

### Option 3: Use Single API Router
Create one `/api/index.js` that routes all requests internally.

## Current Function Count

1. `/api/auth/login.js`
2. `/api/auth/me.js`
3. `/api/students/index.js`
4. `/api/students/[id].js`
5. `/api/attendance/index.js`
6. `/api/attendance/[id].js`
7. `/api/attendance/by-subject.js` ❌ Can merge
8. `/api/namaz-attendance/index.js`
9. `/api/namaz-attendance/history.js` ❌ Can merge
10. `/api/namaz-attendance/stats.js` ❌ Can merge
11. `/api/leaves/index.js`
12. `/api/leaves/[id].js`
13. `/api/subjects/index.js`
14. `/api/subjects/[id].js`
15. `/api/class-subjects.js` ❌ Can merge

## Immediate Action

I'll consolidate the APIs to fit within 12 functions limit.
