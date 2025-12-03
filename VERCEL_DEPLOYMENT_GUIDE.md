# 🚀 Vercel + Neon Deployment Guide

Complete guide to deploy your Student Management System on Vercel with Neon PostgreSQL.

---

## 📋 Prerequisites

1. **GitHub Account** - To store your code
2. **Vercel Account** - Sign up at https://vercel.com (free)
3. **Neon Account** - Sign up at https://neon.tech (free)

---

## 🗄️ Step 1: Set Up Neon Database

### 1.1 Create Neon Project

1. Go to https://neon.tech
2. Click **Sign Up** (free tier: 10 GB storage)
3. Click **Create Project**
4. Choose:
   - **Project Name:** `darul-irshad-db`
   - **Region:** Choose closest to your users
   - **PostgreSQL Version:** 16 (latest)
5. Click **Create Project**

### 1.2 Get Connection String

1. In your Neon dashboard, click **Connection Details**
2. Copy the **Connection String**:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
3. **Save this** - you'll need it for Vercel

### 1.3 Initialize Database (Optional - Auto-created)

The database table will be created automatically on first API call, or you can create it manually:

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  roll_no VARCHAR(50) NOT NULL UNIQUE,
  course_type VARCHAR(50) NOT NULL,
  course_division VARCHAR(50),
  year VARCHAR(10) NOT NULL,
  batch VARCHAR(10),
  dob DATE NOT NULL,
  blood_group VARCHAR(10),
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  contact1 VARCHAR(20),
  contact2 VARCHAR(20),
  address TEXT,
  aadhar_number VARCHAR(20),
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_roll_no ON students(roll_no);
CREATE INDEX idx_students_course ON students(course_type, year, course_division, batch);
```

---

## 📦 Step 2: Prepare Your Project

### 2.1 Install Dependencies

```bash
# Install Neon serverless driver
npm install @neondatabase/serverless

# Install Vercel CLI (optional, for local testing)
npm install -g vercel
```

### 2.2 Project Structure

Your project should have this structure:

```
your-project/
├── api/
│   ├── lib/
│   │   └── db.js              # Database connection
│   ├── students/
│   │   ├── index.js           # GET all, POST create
│   │   └── [id].js            # GET one, PUT update, DELETE
│   └── init-db.js             # Initialize database
├── vercel.json                # Vercel configuration
├── package.json               # Dependencies
└── .gitignore                 # Ignore node_modules, .env
```

### 2.3 Create .gitignore

```bash
# Create .gitignore
cat > .gitignore << EOF
node_modules/
.env
.env.local
.vercel
*.log
.DS_Store
EOF
```

---

## 🚀 Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Vercel + Neon integration"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

### 3.2 Deploy on Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. **Import Git Repository:**
   - Connect your GitHub account
   - Select your repository
   - Click **Import**

4. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)

5. **Add Environment Variable:**
   - Click **Environment Variables**
   - Add:
     ```
     Name: NEON_DATABASE_URL
     Value: postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
     ```
   - Select: **Production**, **Preview**, **Development**

6. Click **Deploy**

#### Option B: Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? darul-irshad-api
# - Directory? ./
# - Override settings? No

# Add environment variable
vercel env add NEON_DATABASE_URL
# Paste your Neon connection string
# Select: Production, Preview, Development

# Deploy to production
vercel --prod
```

### 3.3 Initialize Database

After deployment, visit:
```
https://your-project.vercel.app/api/init-db
```

You should see:
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "tables": ["students"],
  "indexes": ["idx_students_roll_no", "idx_students_course"]
}
```

---

## 🧪 Step 4: Test Your APIs

### 4.1 Get Your API URL

After deployment, Vercel gives you a URL like:
```
https://your-project.vercel.app
```

Your API endpoints are:
```
https://your-project.vercel.app/api/students
https://your-project.vercel.app/api/students/1
```

### 4.2 Test with cURL

```bash
# 1. Create a student
curl -X POST https://your-project.vercel.app/api/students \
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
    "contact2": "0987654321",
    "address": "Test Address",
    "aadharNumber": "123456789012"
  }'

# 2. Get all students
curl https://your-project.vercel.app/api/students

# 3. Get one student
curl https://your-project.vercel.app/api/students/1

# 4. Update student
curl -X PUT https://your-project.vercel.app/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "status": "active"
  }'

# 5. Delete student
curl -X DELETE https://your-project.vercel.app/api/students/1
```

### 4.3 Test with Browser Console

```javascript
// Base URL
const API_URL = 'https://your-project.vercel.app/api';

// 1. Create student
fetch(`${API_URL}/students`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Test Student",
    rollNo: "101",
    courseType: "pu",
    courseDivision: "commerce",
    year: "1",
    batch: "A",
    dob: "2005-01-01",
    bloodGroup: "A+",
    fatherName: "Father Name",
    motherName: "Mother Name",
    contact1: "1234567890",
    contact2: "0987654321",
    address: "Test Address",
    aadharNumber: "123456789012"
  })
})
.then(r => r.json())
.then(console.log);

// 2. Get all students
fetch(`${API_URL}/students`)
  .then(r => r.json())
  .then(console.log);

// 3. Get one student
fetch(`${API_URL}/students/1`)
  .then(r => r.json())
  .then(console.log);

// 4. Update student
fetch(`${API_URL}/students/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Updated Name"
  })
})
.then(r => r.json())
.then(console.log);

// 5. Delete student
fetch(`${API_URL}/students/1`, {
  method: 'DELETE'
})
.then(r => r.json())
.then(console.log);
```

---

## 📱 Step 5: Use in Your APK/Mobile App

### 5.1 Android (Java/Kotlin)

```java
// Using OkHttp
import okhttp3.*;
import org.json.JSONObject;

public class StudentAPI {
    private static final String API_URL = "https://your-project.vercel.app/api";
    private final OkHttpClient client = new OkHttpClient();

    // Get all students
    public void getAllStudents() {
        Request request = new Request.Builder()
            .url(API_URL + "/students")
            .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try {
                    String responseData = response.body().string();
                    JSONObject json = new JSONObject(responseData);
                    // Handle response
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                e.printStackTrace();
            }
        });
    }

    // Create student
    public void createStudent(JSONObject studentData) {
        MediaType JSON = MediaType.get("application/json; charset=utf-8");
        RequestBody body = RequestBody.create(studentData.toString(), JSON);

        Request request = new Request.Builder()
            .url(API_URL + "/students")
            .post(body)
            .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                // Handle response
            }

            @Override
            public void onFailure(Call call, IOException e) {
                e.printStackTrace();
            }
        });
    }
}
```

### 5.2 React Native

```javascript
// API Service
const API_URL = 'https://your-project.vercel.app/api';

export const studentAPI = {
  // Get all students
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/students?${params}`);
    return response.json();
  },

  // Get one student
  getOne: async (id) => {
    const response = await fetch(`${API_URL}/students/${id}`);
    return response.json();
  },

  // Create student
  create: async (studentData) => {
    const response = await fetch(`${API_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    return response.json();
  },

  // Update student
  update: async (id, studentData) => {
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    return response.json();
  },

  // Delete student
  delete: async (id) => {
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};

// Usage in component
import { studentAPI } from './api/students';

// Get all students
const students = await studentAPI.getAll({ courseType: 'pu', year: '1' });

// Create student
const newStudent = await studentAPI.create({
  name: "Test Student",
  rollNo: "101",
  courseType: "pu",
  year: "1",
  dob: "2005-01-01"
});
```

### 5.3 Flutter

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class StudentAPI {
  static const String apiUrl = 'https://your-project.vercel.app/api';

  // Get all students
  static Future<List<dynamic>> getAllStudents() async {
    final response = await http.get(Uri.parse('$apiUrl/students'));
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load students');
    }
  }

  // Create student
  static Future<Map<String, dynamic>> createStudent(Map<String, dynamic> studentData) async {
    final response = await http.post(
      Uri.parse('$apiUrl/students'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(studentData),
    );
    
    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to create student');
    }
  }

  // Update student
  static Future<Map<String, dynamic>> updateStudent(int id, Map<String, dynamic> studentData) async {
    final response = await http.put(
      Uri.parse('$apiUrl/students/$id'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(studentData),
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to update student');
    }
  }

  // Delete student
  static Future<void> deleteStudent(int id) async {
    final response = await http.delete(Uri.parse('$apiUrl/students/$id'));
    
    if (response.statusCode != 200) {
      throw Exception('Failed to delete student');
    }
  }
}
```

---

## 🔧 Step 6: Advanced Configuration

### 6.1 Custom Domain

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Domains**
3. Add your domain: `api.yourdomain.com`
4. Update DNS records as instructed
5. Your API will be at: `https://api.yourdomain.com/api/students`

### 6.2 Environment Variables

Add more environment variables in Vercel:

```
NEON_DATABASE_URL=postgresql://...
NODE_ENV=production
API_SECRET_KEY=your-secret-key
```

### 6.3 CORS Configuration

Already configured in the API routes. To customize:

```javascript
// In api/students/index.js
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
// Or keep '*' for all origins
```

---

## 📊 Step 7: Monitor & Maintain

### 7.1 Vercel Analytics

1. Go to Vercel Dashboard → Your Project
2. Click **Analytics**
3. View:
   - Request count
   - Response times
   - Error rates
   - Geographic distribution

### 7.2 Neon Monitoring

1. Go to Neon Dashboard
2. Click **Monitoring**
3. View:
   - Database size
   - Query performance
   - Connection count
   - Storage usage

### 7.3 Logs

View logs in Vercel:
```bash
vercel logs
```

Or in dashboard: **Deployments** → Click deployment → **Logs**

---

## 🚨 Troubleshooting

### Issue: "NEON_DATABASE_URL is not set"

**Solution:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add `NEON_DATABASE_URL` with your connection string
3. Redeploy: `vercel --prod`

### Issue: "Table does not exist"

**Solution:**
Visit: `https://your-project.vercel.app/api/init-db`

### Issue: CORS errors

**Solution:**
Check CORS headers in API routes. Should have:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

### Issue: Slow responses

**Solution:**
1. Check Neon region (should be close to Vercel region)
2. Add database indexes (already included)
3. Upgrade Neon plan if needed

---

## 💰 Pricing

### Vercel (Free Tier)
- ✅ 100 GB bandwidth/month
- ✅ Unlimited API requests
- ✅ Automatic HTTPS
- ✅ Global CDN
- **Cost:** FREE

### Neon (Free Tier)
- ✅ 10 GB storage
- ✅ Unlimited queries
- ✅ 1 project
- ✅ Auto-scaling
- **Cost:** FREE

### Total Cost: **$0/month** 🎉

---

## ✅ Checklist

- [ ] Neon account created
- [ ] Database connection string copied
- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] NEON_DATABASE_URL added to Vercel
- [ ] Project deployed successfully
- [ ] Database initialized (`/api/init-db`)
- [ ] APIs tested (GET, POST, PUT, DELETE)
- [ ] Mobile app connected to APIs

---

## 🎉 Success!

Your Student Management System is now:
- ✅ Deployed on Vercel (serverless)
- ✅ Using Neon PostgreSQL
- ✅ Always online (no sleep)
- ✅ Globally distributed
- ✅ Auto-scaling
- ✅ FREE!

**API Base URL:** `https://your-project.vercel.app/api`

---

**Need help?** Check Vercel docs: https://vercel.com/docs  
**Neon docs:** https://neon.tech/docs
