# 🚀 Deploy Student Edit Fix to Vercel

## Current Situation

✅ **Local code is fixed** - Student editing will work locally
❌ **Production still has old code** - Need to deploy to Vercel

## Before Deploying - Add Cloudinary Variables

**IMPORTANT**: Add these 3 environment variables to Vercel first:

1. Go to: https://vercel.com/dashboard
2. Select project: `darul-irshad-clean`
3. Go to: Settings → Environment Variables
4. Add these 3 variables (select all 3 environments for each):

```
CLOUDINARY_CLOUD_NAME = dlwumu4ov
CLOUDINARY_API_KEY = 792965756344759
CLOUDINARY_API_SECRET = WASN9-Ra1Q6WG-psnid4k77yqK8
```

## Deploy to Vercel

### Method 1: Git Push (Recommended)

If you're using Git:

```bash
git add .
git commit -m "Fix student edit and photo upload"
git push
```

Vercel will auto-deploy.

### Method 2: Vercel CLI

```bash
vercel --prod
```

### Method 3: Manual Redeploy

1. Go to Vercel Dashboard
2. Go to Deployments tab
3. Click "..." on latest deployment
4. Click "Redeploy"

## Test Locally First

Before deploying, test locally:

```bash
npm run dev
```

Then open http://localhost:5000 and test:
1. Edit a student
2. Change name, roll number, etc.
3. Upload a photo
4. Save

If it works locally, then deploy to Vercel.

## What Was Fixed

1. **API endpoint** - Changed from `/api/students/${id}` to `/api/students` with `id` in body
2. **Photo upload** - Added actual upload logic to send photos to Cloudinary
3. **Environment variables** - Added Cloudinary credentials locally

## After Deployment

1. Clear browser cache (Ctrl+Shift+Delete)
2. Or open in incognito/private window
3. Test editing a student
4. Test uploading a photo

---

**Status**: Ready to deploy after adding Cloudinary variables to Vercel
