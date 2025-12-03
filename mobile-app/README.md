# Darul Irshad Mobile App

React Native mobile application for the Darul Irshad Student Management System.

## Features

- **Secure Authentication** - Teacher login with institutional credentials
- **Attendance Management** - Take attendance, view sheets, manage missed sections
- **Namaz Tracking** - Track daily prayer attendance for all students
- **Leave Management** - Create and manage student leave requests
- **Student Profiles** - View and manage complete student information
- **Offline Support** - Works offline with automatic sync when connected
- **Real-time Updates** - Instant data synchronization with backend

## Architecture

### Frontend (React Native)
- **Framework**: React Native 0.73
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation 6
- **State Management**: TanStack Query for server state
- **Storage**: AsyncStorage for offline data
- **API Layer**: Axios for HTTP requests

### Backend Integration
- **API Base**: Connects to existing Express.js backend
- **Database**: PostgreSQL with real-time sync
- **Authentication**: Session-based with secure token storage

## Getting Started

### Prerequisites
- Node.js 16+
- React Native CLI
- Android Studio (for Android development)
- Android SDK 34

### Installation

1. **Install dependencies:**
   ```bash
   cd mobile-app
   npm install
   ```

2. **Android Setup:**
   ```bash
   npx react-native run-android
   ```

3. **Start Metro bundler:**
   ```bash
   npm start
   ```

### Configuration

1. **Update API endpoint** in `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://your-backend-url.com';
   ```

2. **Configure authentication** - App uses same credentials as web version:
   - Username: `darul001`
   - Password: `darul100`

## Project Structure

```
mobile-app/
├── src/
│   ├── screens/          # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── AttendanceScreen.tsx
│   │   ├── NamazScreen.tsx
│   │   ├── LeaveScreen.tsx
│   │   └── StudentsScreen.tsx
│   ├── services/         # API and data services
│   │   └── api.ts
│   ├── context/          # React contexts
│   │   └── AuthContext.tsx
│   ├── theme/            # App theming
│   │   └── theme.ts
│   └── App.tsx          # Main app component
├── android/             # Android configuration
└── package.json
```

## Build for Production

### Android APK
```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

## Key Features Implementation

### 🔐 Authentication
- Secure login with institutional credentials
- Automatic token management
- Session persistence across app restarts

### 📊 Attendance Management
- Class-specific student filtering
- Period-based attendance taking
- Real-time attendance status updates
- Offline capability with sync

### 🕌 Namaz Tracking
- Five daily prayer tracking
- Student-wise prayer attendance
- Date-wise historical records

### 📅 Leave Management
- Student leave request creation
- Date range selection
- Reason tracking and management

### 👥 Student Management
- Complete student profiles
- Search and filter functionality
- Add new students with full details

## Performance Optimizations

- **Lazy Loading**: Screens loaded on demand
- **Query Caching**: TanStack Query for efficient data management
- **Image Optimization**: Optimized asset loading
- **Bundle Splitting**: Reduced initial load time

## Security Features

- **Secure Storage**: Sensitive data encrypted in AsyncStorage
- **API Security**: Token-based authentication
- **Input Validation**: Client and server-side validation
- **Network Security**: HTTPS only communication

## Testing

Run tests:
```bash
npm test
```

## Deployment

1. **Generate signed APK** for production
2. **Upload to Play Store** or distribute directly
3. **Configure backend URL** for production environment

## Support

For technical support or feature requests, contact the development team.

---

**Darul Irshad Student Management System v1.0**  
Built with React Native for Android mobile devices