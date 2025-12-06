# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name: "Darul Uloom Attendance" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Firebase Storage

1. In Firebase Console, go to "Build" → "Storage"
2. Click "Get Started"
3. Choose "Start in production mode"
4. Select your preferred location (e.g., asia-south1 for India)
5. Click "Done"

## Step 3: Set Storage Rules

In Storage → Rules tab, update to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload student photos
    match /students/{studentId}/{allPaths=**} {
      allow read: if true; // Public read for displaying photos
      allow write: if request.auth != null; // Only authenticated users can upload
    }
  }
}
```

## Step 4: Get Firebase Credentials

### For Admin SDK (Server-side):
1. Go to Project Settings (gear icon) → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely
4. Add to `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### For Client SDK (Frontend):
1. Go to Project Settings → General
2. Scroll to "Your apps" → Click Web icon (</>)
3. Register app name: "Attendance Web App"
4. Copy the config object
5. Add to `.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Step 5: Install Dependencies

```bash
npm install firebase firebase-admin
```

## Step 6: Add to Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the Firebase env vars from Step 4
3. Make sure to add them for all environments (Production, Preview, Development)

## Step 7: Test Connection

Run the test script:
```bash
node test-firebase-connection.js
```

## Storage Structure

```
your-bucket/
├── students/
│   ├── {studentId}/
│   │   ├── photo.jpg
│   │   └── documents/
│   │       ├── id-proof.pdf
│   │       └── certificate.pdf
```

## Security Notes

- Never commit Firebase private keys to Git
- Use environment variables for all credentials
- Keep `.env` in `.gitignore`
- Rotate keys if accidentally exposed
- Use Firebase Storage Rules for access control
