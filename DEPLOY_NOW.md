# 🚀 Deploy Now - Quick Commands

Copy and paste these commands to deploy in 5 minutes!

---

## Step 1: Install Dependencies

```bash
npm install @neondatabase/serverless
```

---

## Step 2: Create Neon Database

1. Go to: https://neon.tech
2. Sign up (free)
3. Click "Create Project"
4. Copy your connection string (looks like this):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

---

## Step 3: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add Vercel + Neon integration"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Vercel

### Option A: Via Dashboard (Easiest)

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Add Environment Variable:
   - Name: `NEON_DATABASE_URL`
   - Value: (paste your Neon connection string)
5. Click "Deploy"

### Option B: Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variable
vercel env add NEON_DATABASE_URL
# Paste your Neon connection string
# Select: Production, Preview, Development

# Deploy to production
vercel --prod
```

---

## Step 5: Initialize Database

After deployment, visit this URL in your browser:

```
https://YOUR_PROJECT.vercel.app/api/init-db
```

You should see:
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

---

## Step 6: Test Your API

```bash
# Replace YOUR_PROJECT with your actual Vercel URL

# Test GET
curl https://YOUR_PROJECT.vercel.app/api/students

# Test POST
curl -X POST https://YOUR_PROJECT.vercel.app/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "rollNo": "101",
    "courseType": "pu",
    "courseDivision": "commerce",
    "year": "1",
    "batch": "A",
    "dob": "2005-01-01",
    "bloodGroup": "A+",
    "fatherName": "Father Name",
    "motherName": "Mother Name",
    "contact1": "1234567890",
    "address": "Test Address"
  }'
```

---

## ✅ Done!

Your API is now live at:
```
https://YOUR_PROJECT.vercel.app/api/students
```

---

## 🔗 Your API Endpoints

```
GET    https://YOUR_PROJECT.vercel.app/api/students
POST   https://YOUR_PROJECT.vercel.app/api/students
GET    https://YOUR_PROJECT.vercel.app/api/students/1
PUT    https://YOUR_PROJECT.vercel.app/api/students/1
DELETE https://YOUR_PROJECT.vercel.app/api/students/1
```

---

## 📱 Use in Your App

```javascript
const API_URL = 'https://YOUR_PROJECT.vercel.app/api';

// Get all students
fetch(`${API_URL}/students`)
  .then(r => r.json())
  .then(data => console.log(data));

// Create student
fetch(`${API_URL}/students`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Student Name",
    rollNo: "101",
    courseType: "pu",
    year: "1",
    dob: "2005-01-01"
  })
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 🎉 Success!

You now have:
- ✅ Serverless API on Vercel
- ✅ PostgreSQL database on Neon
- ✅ Always online (no sleep)
- ✅ Global CDN
- ✅ Auto-scaling
- ✅ FREE!

---

**Need help?** Check:
- `VERCEL_DEPLOYMENT_GUIDE.md` - Detailed guide
- `API_TESTING.md` - Testing examples
- `VERCEL_NEON_COMPLETE.md` - Complete documentation
