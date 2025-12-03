# Changelog

All notable changes to the Darul Irshad Mobile App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added
- Initial React Native Android application
- Complete authentication system with institutional credentials
- Dashboard with module navigation
- Attendance management system
  - Date selection and class filtering
  - Period-wise attendance taking
  - Student cards with Present/Absent/Leave options
  - "Mark All Present" functionality
- Namaz tracking system
  - Five daily prayer monitoring
  - Student-wise prayer attendance
  - Date-based tracking
- Leave management system
  - Create new leave requests
  - Date range selection
  - Student filtering and reason tracking
- Student management system
  - Complete student profiles
  - Search functionality
  - Add new students with full academic details
- Offline support with AsyncStorage
- Real-time sync with PostgreSQL backend
- Material Design UI with React Native Paper
- Android build configuration for APK generation

### Technical Features
- React Native 0.73 framework
- TypeScript for type safety
- React Navigation for native navigation
- TanStack Query for server state management
- Axios for API integration
- Complete Android build system with Gradle
- Native Java activity classes
- Metro bundler configuration

### Security
- Secure authentication with session management
- Encrypted AsyncStorage for sensitive data
- Token-based API authentication
- Input validation on all forms

## [Unreleased]

### Planned
- iOS version support
- Push notifications for attendance reminders
- Biometric authentication
- Bulk attendance operations
- Advanced reporting features
- Parent portal integration