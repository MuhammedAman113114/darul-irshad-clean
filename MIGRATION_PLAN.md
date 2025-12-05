# Full-Stack Migration Plan
## Darul Irshad Student Management System

### Current Architecture
- Frontend: React (Vite) on Vercel
- Backend: Serverless functions on Vercel (12 function limit issue)
- Database: Neon PostgreSQL
- Storage: Firebase (configured but not fully used)

### Target Architecture
- Frontend: Next.js on Vercel (static/SSR)
- Backend: Express.js on Render.com (single server, no limits)
- Database: Neon PostgreSQL (SSL + pooling)
- Storage: Firebase Storage (images/PDFs)

---

## Phase 1: Project Structure

```
darul-irshad-management/
├── frontend/                    # Next.js app (Vercel)
│   ├── app/                    # Next.js 13+ app directory
│   ├── components/             # React components
│   ├── lib/                    # Client utilities
│   ├── public/                 # Static assets
│   ├── .env.local             # Frontend env vars
│   └── next.config.js
│
├── backend/                    # Express server (Render)
│   ├── src/
│   │   ├── routes/            # API routes
│   │   │   ├── auth.js
│   │   │   ├── students.js
│   │   │   ├── attendance.js
│   │   │   ├── namaz.js
│   │   │   ├── results.js
│   │   │   ├── remarks.js
│   │   │   ├── leaves.js
│   │   │   ├── subjects.js
│   │   │   ├── timetable.js
│   │   │   ├── holidays.js
│   │   │   └── upload.js      # Firebase uploads
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── config/
│   │   │   ├── database.js    # Neon connection
│   │   │   └── firebase.js    # Firebase admin
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── server.js          # Main Express app
│   ├── .env                   # Backend env vars
│   └── package.json
│
├── shared/                     # Shared types/schemas
│   └── schema.ts
│
└── README.md
```

---

## Phase 2: Backend Setup (Express on Render)

### File: `backend/package.json`
```json
{
  "name": "darul-irshad-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@neondatabase/serverless": "^0.10.4",
    "firebase-admin": "^12.0.0",
    "cookie-session": "^2.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### File: `backend/src/server.js`
```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieSession from 'cookie-session';

// Import routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import namazRoutes from './routes/namaz.js';
import resultsRoutes from './routes/results.js';
import remarksRoutes from './routes/remarks.js';
import leavesRoutes from './routes/leaves.js';
import subjectsRoutes from './routes/subjects.js';
import timetableRoutes from './routes/timetable.js';
import holidaysRoutes from './routes/holidays.js';
import uploadRoutes from './routes/upload.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Performance
app.use(helmet());
app.use(compression());

// CORS - Allow Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://darul-irshad-clean.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/namaz-attendance', namazRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/remarks', remarksRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
});

export default app;
```

### File: `backend/src/config/database.js`
```javascript
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon for connection pooling
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = "password";
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create SQL client with connection pooling
export const sql = neon(DATABASE_URL, {
  fullResults: true,
  arrayMode: false,
  fetchOptions: {
    cache: 'no-store'
  }
});

// Helper to convert snake_case to camelCase
export function toCamelCase(obj) {
  const result = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// Test connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Database connected:', result[0].time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
```

### File: `backend/src/config/firebase.js`
```javascript
import admin from 'firebase-admin';

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

export const bucket = admin.storage().bucket();
export default admin;
```

### File: `backend/src/middleware/auth.js`
```javascript
export function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function isTeacher(req, res, next) {
  if (!req.session?.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  next();
}
```

### File: `backend/src/middleware/errorHandler.js`
```javascript
export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
```

### File: `backend/src/routes/upload.js`
```javascript
import express from 'express';
import multer from 'multer';
import { bucket } from '../config/firebase.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and Excel files are allowed.'));
    }
  }
});

// Upload file to Firebase Storage
router.post('/', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folder = 'uploads' } = req.body;
    const timestamp = Date.now();
    const filename = `${folder}/${timestamp}_${req.file.originalname}`;

    // Upload to Firebase Storage
    const file = bucket.file(filename);
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          uploadedBy: req.session.user.id,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    res.json({
      success: true,
      url: publicUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed', message: error.message });
  }
});

// Delete file from Firebase Storage
router.delete('/:filename', isAuthenticated, async (req, res) => {
  try {
    const { filename } = req.params;
    const file = bucket.file(filename);
    
    await file.delete();
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'File deletion failed', message: error.message });
  }
});

export default router;
```

---

## Phase 3: Environment Variables

### Backend `.env` (Render)
```env
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://darul-irshad-clean.vercel.app
SESSION_SECRET=your-super-secret-session-key-change-this

# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_rjqETK2lFXv9@ep-long-field-a4tflv7b-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Firebase Admin SDK
FIREBASE_PROJECT_ID=kgn-student
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kgn-student.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_STORAGE_BUCKET=kgn-student.firebasestorage.app
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40kgn-student.iam.gserviceaccount.com
```

### Frontend `.env.local` (Vercel)
```env
# Backend API
NEXT_PUBLIC_API_URL=https://your-app.onrender.com

# Firebase Client SDK (for direct uploads if needed)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAFXhe85WYhv1vePCpsdioUuZsu-JETWjg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kgn-student.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kgn-student
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kgn-student.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=697594082544
NEXT_PUBLIC_FIREBASE_APP_ID=1:697594082544:web:3aaacd1d44d04c740dbe35
```

---

## Phase 4: Frontend API Client

### File: `frontend/lib/api.ts`
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth
  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Students
  async getStudents(filters?: any) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/api/students${query ? `?${query}` : ''}`);
  }

  // Attendance
  async saveAttendance(data: any) {
    return this.request('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Namaz
  async saveNamazAttendance(data: any) {
    return this.request('/api/namaz-attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Upload file
  async uploadFile(file: File, folder: string = 'uploads') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData, // Don't set Content-Type, browser will set it with boundary
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  }
}

export const api = new ApiClient();
```

---

## Phase 5: Deployment Steps

### Step 1: Deploy Backend to Render

1. **Create Render Account**: https://render.com
2. **Create New Web Service**:
   - Connect your GitHub repo
   - Select `backend` folder as root directory
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
   - Plan: Free

3. **Add Environment Variables** in Render Dashboard:
   - All variables from backend `.env`

4. **Deploy**: Render will auto-deploy
   - Get your backend URL: `https://your-app.onrender.com`

### Step 2: Deploy Frontend to Vercel

1. **Update Frontend**:
   - Convert to Next.js or keep Vite
   - Update all API calls to use `api.ts` client
   - Set `NEXT_PUBLIC_API_URL` to Render URL

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Add Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_API_URL=https://your-app.onrender.com`
   - All Firebase client variables

### Step 3: Test Everything

1. **Test Backend**: `https://your-app.onrender.com/health`
2. **Test Frontend**: Login and verify all features
3. **Test File Upload**: Upload a result PDF
4. **Test Database**: Check data persistence

---

## Phase 6: Migration Checklist

- [ ] Create `backend` folder with Express server
- [ ] Move all API routes from `api/` to `backend/src/routes/`
- [ ] Setup Neon connection with pooling
- [ ] Configure Firebase Admin SDK
- [ ] Create upload endpoint
- [ ] Deploy backend to Render
- [ ] Update frontend API client
- [ ] Configure CORS for Vercel domain
- [ ] Test all endpoints
- [ ] Migrate environment variables
- [ ] Update documentation

---

## Benefits of New Architecture

✅ **No Function Limits** - Single Express server, unlimited routes
✅ **Better Performance** - Connection pooling, persistent server
✅ **File Uploads** - Firebase Storage integration
✅ **Easier Debugging** - Centralized logging
✅ **Cost Effective** - Render free tier + Vercel free tier
✅ **Scalable** - Easy to upgrade Render plan when needed

---

## Next Steps

Would you like me to:
1. Create the complete backend Express server with all routes?
2. Convert your frontend to Next.js?
3. Setup the Firebase upload functionality?
4. Create deployment scripts?

Let me know which part you'd like me to implement first!
