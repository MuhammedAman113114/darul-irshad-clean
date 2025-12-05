# Vercel Deployment - Serverless Function Limit Fix

## Problem
You have **39 serverless functions** but Vercel Hobby plan only allows **12 functions**.

## Solution Options

### Option 1: Use Express Server (Recommended)
Deploy the entire Express server as a single serverless function instead of individual API routes.

### Option 2: Upgrade to Pro Plan
- Cost: $20/month
- Allows unlimited serverless functions
- Better for production apps

### Option 3: Consolidate API Routes
Combine multiple endpoints into fewer functions (complex, not recommended)

## Implementing Option 1: Single Express Server

This is the best solution for your app. We'll deploy the entire Express server as one function.

### Step 1: Update vercel.json

Replace your current `vercel.json` with:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "functions": {
    "api/index.js": {
      "maxDuration": 10
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Step 2: Create api/index.js

Create a new file `api/index.js` that exports your Express app:

```javascript
// api/index.js
import 'dotenv/config';
import express from 'express';
import cookieSession from 'cookie-session';
import { registerRoutes } from '../server/routes.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use(
  cookieSession({
    name: 'session',
    keys: ['secret-key-123'],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
);

// Register all routes
await registerRoutes(app);

export default app;
```

### Step 3: Update package.json

Add this to your `package.json`:

```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

### Step 4: Deploy

```bash
vercel --prod
```

## Current Status

Your app is trying to deploy with individual API functions:
- ❌ 39 functions (exceeds limit)
- ✅ Database connected
- ✅ Environment variables set

## After Fix

With single Express server:
- ✅ 1 function (within limit)
- ✅ All API routes work
- ✅ Same functionality
- ✅ Faster deployment

## Alternative: Keep Current Structure

If you want to keep individual API files, you need to:
1. Delete 27 API files (keep only 12)
2. Or upgrade to Pro plan ($20/month)

## Recommended Action

Use Option 1 (Single Express Server) because:
- ✅ Free (stays on Hobby plan)
- ✅ Keeps all functionality
- ✅ Easier to maintain
- ✅ Better performance
- ✅ No code changes needed

## Files to Create/Modify

1. **Create:** `api/index.js` (single entry point)
2. **Modify:** `vercel.json` (route all API calls to one function)
3. **Keep:** All existing `server/` files (no changes needed)
4. **Optional:** Delete individual `api/` files (not needed anymore)

## Deployment Steps

1. Create `api/index.js` with Express server
2. Update `vercel.json` with new routing
3. Run `vercel --prod`
4. ✅ Deployment succeeds with 1 function

Would you like me to implement this fix now?
