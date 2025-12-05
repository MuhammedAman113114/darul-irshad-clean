# ⚡ Quick Deploy to Render - 3 Steps

## Step 1: Deploy Backend (5 minutes)

1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Select your repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   FRONTEND_URL=https://darul-irshad-clean.vercel.app
   SESSION_SECRET=change-this-to-random-string
   ```
6. Click **"Create Web Service"**
7. **Copy your backend URL** (e.g., `https://darul-irshad-backend.onrender.com`)

## Step 2: Update Frontend (2 minutes)

1. Go to **Vercel Dashboard** → Your project → Settings → Environment Variables
2. Add new variable:
   ```
   VITE_API_URL=https://your-render-backend-url.onrender.com
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

## Step 3: Test (2 minutes)

1. Open https://darul-irshad-clean.vercel.app
2. Login: `darul001` / `darul100`
3. Test features (students, attendance, etc.)

## ✅ Done!

Your backend is now on Render with no function limits!

---

## Need More Details?

- **Full Guide:** See `RENDER_DEPLOYMENT_GUIDE.md`
- **Migration Plan:** See `MIGRATION_PLAN.md`
- **Continue Guide:** See `CONTINUE_HERE.md`
