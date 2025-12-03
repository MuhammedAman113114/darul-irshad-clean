# Darul Irshad Student Management System

## Overview

This is a comprehensive student management system for Darul Irshad educational institution, featuring a full-stack web application with a React frontend, Express backend, and PostgreSQL database. The system manages student attendance, namaz tracking, leave management, results, and academic records across PU (Pre-University) and Post-PU courses.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for development
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, local state with React hooks
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Cookie-based sessions with bcrypt for password hashing
- **API Design**: RESTful endpoints with JSON responses

### Hybrid Storage Strategy
The application implements a hybrid offline-first approach:
- **Primary Storage**: PostgreSQL database for production data
- **Offline Storage**: localStorage for offline capability and rapid development
- **Sync Service**: Automatic synchronization between local and remote storage

## Key Components

### Database Schema
- **Users Table**: Teacher authentication with role-based access
- **Students Table**: Complete student profiles with academic classification
- **Attendance Table**: Detailed attendance tracking per period and date
- **Namaz Attendance**: Islamic prayer attendance tracking
- **Leaves Table**: Student leave management with date ranges
- **Results Table**: Academic performance tracking
- **Remarks Table**: Teacher comments and observations

### Academic Structure
- **PU Courses**: Years 1-2 with Commerce (Sections A & B) and Science (No sections)
- **Post-PU Courses**: Years 3-7 with no sections
- **Period System**: 3 periods for PU, 6-8 periods for Post-PU depending on year

### Authentication System
- Simple username/password authentication
- Role-based access (teacher, principal, admin)
- Development mode auto-authentication for seamless testing

## Data Flow

### Attendance Workflow
1. Teacher selects class configuration (course type, year, division, section)
2. System loads students for selected configuration
3. Teacher marks attendance per period
4. Data saves to localStorage immediately
5. Background sync to database when online
6. Attendance locks prevent duplicate entries

### Leave Integration
1. Leave requests update student status across all modules
2. Auto-marking of attendance as "on-leave" during leave periods
3. Cross-module synchronization ensures consistency
4. Leave-aware reporting and analytics

### Offline Capability
1. Full functionality without internet connection
2. Data persistence in localStorage
3. Automatic sync when connection restored
4. Conflict resolution for multi-device usage

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection Pool**: Managed connections for optimal performance

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **React Hook Form**: Form management with validation
- **Date-fns**: Date manipulation utilities

### Development Tools
- **TypeScript**: Type safety across the stack
- **ESBuild**: Fast production builds
- **Drizzle Kit**: Database migration management

## Deployment Strategy

### Development Environment
- **Replit Configuration**: Optimized for Replit development
- **Hot Reload**: Vite dev server with instant updates
- **Auto-start**: npm run dev on container start

### Production Build
- **Frontend**: Vite build process outputs to dist/public
- **Backend**: ESBuild bundles server code to dist/index.js
- **Static Serving**: Express serves built frontend in production

### Environment Configuration
- **Port**: 5000 (internal), 80 (external)
- **Database**: Automatic provisioning via DATABASE_URL
- **Session**: Secure cookie configuration

## Changelog

```
Changelog:
- July 24, 2025. COMPLETE REACT NATIVE ANDROID APP CREATED: Built fully functional React Native Android application from scratch with complete project structure, Android build configuration (gradle, manifest, Java classes), 6 core screens (Login, Dashboard, Attendance, Namaz, Leave, Students), authentication system with AsyncStorage, comprehensive API integration with existing backend, utility functions (storage, validators, date helpers), React Native Paper UI components, proper Android theming, setup scripts, and production-ready build configuration - app is completely independent from web version and connects directly to existing PostgreSQL backend via REST APIs
- July 23, 2025. SECURE AUTHENTICATION IMPLEMENTATION: Updated authentication system to require specific institutional credentials (username: darul001, password: darul100) - removed demo accounts and auto-authentication, implemented proper login validation for enhanced security
- July 23, 2025. MOBILE-FIRST MISSED SECTIONS INTERFACE: Enhanced missed sections interface with complete mobile responsiveness - implemented flexible layouts that adapt from desktop to mobile screens, added touch-friendly buttons with minimum 44px height and touch-manipulation CSS, converted rigid desktop layouts to responsive column/row flex layouts, improved student attendance interface with full-width buttons on mobile and proper spacing, added proper mobile-specific quick actions grid layout, ensured all "Take Attendance" dialogs work seamlessly on mobile devices with optimized button layouts and scrollable student lists
- July 23, 2025. INTELLIGENT MISSED SECTION AUTO-DETECTION SYSTEM: Implemented comprehensive intelligent missed section auto-detection system that runs at 12:00 AM daily - created MissedSectionDetector service with smart timetable-based logic (only scheduled periods count), enhanced database schema with detailed tracking fields (subject codes, scheduled times, priority levels), integrated seamlessly into existing "Missed" tab with professional dashboard showing statistics and management tools, added API endpoints for detection triggers and completion workflows, system automatically detects yesterday's unattended periods based on timetable entries while respecting holidays and creates missed section records with audit trails, completely replaced old queue system with intelligent database-driven auto-detection that requires zero manual intervention
- July 23, 2025. MISSED QUEUE BUTTON REMOVAL: Completely removed "Missed Queue" button and related functionality from attendance interface per user request - removed both desktop and mobile tab buttons, eliminated queue tab from state management (activeTab type), removed queue tab content section and MissedSectionsQueue component import, simplified attendance navigation to focus on core tabs (Take, Sheet, Missed, Subject & Timetable)
- July 23, 2025. AUTHENTICATION ERROR MESSAGE UPDATE: Updated login error message from "Invalid credentials" to "Wrong username or password" to match user requirements for failed authentication attempts
- July 23, 2025. SECURITY VULNERABILITY FIX: Fixed critical SQL injection vulnerability in missed sections API endpoint by replacing raw SQL string concatenation with Drizzle's parameterized sql`` template literals - converted user input filters for courseType, year, courseDivision, and section from unsafe string interpolation to secure parameter binding
- July 23, 2025. SECURE AUTHENTICATION IMPLEMENTATION: Updated authentication system to require specific institutional credentials (username: darul001, password: darul100) - removed demo accounts and auto-authentication, implemented proper login validation for enhanced security
- July 23, 2025. SYNC STATUS REMOVAL: Completely removed wifi symbols and sync status indicators from navigation drawer per user request for minimalistic design - cleaned navigation header to show only logo, branding, and user name
- July 23, 2025. LOGOUT FUNCTIONALITY ADDED: Implemented logout button in navigation drawer with red styling and proper session termination - positioned at bottom with clear visual separation from menu items
- July 23, 2025. NAVIGATION MENU CLEANUP: Removed "Section Management" and "Data Management" options from navigation drawer to simplify teacher interface - navigation now focused on core teaching modules (Attendance, Namaz, Leave, Academic Calendar, Remarks, Results)
- July 23, 2025. MOBILE LOGIN PAGE REDESIGN: Created professional mobile-optimized login page matching Darul Irshad branding with dark blue gradient background (#005C83), institutional logo, clean white form card, and touch-friendly input fields for mobile application use
- July 23, 2025. WEEKLY CHRONOLOGICAL EXCEL FORMAT IMPLEMENTATION: Completely redesigned Excel export to show natural weekly progression through the month as requested - replaced grouped day format (Mon-7, Mon-14, Mon-28) with chronological calendar flow (Tue-01 P1, Wed-02 P1, Thu-03 P2, Fri-04 H, Sun-06 P1), implemented comprehensive holiday integration where Friday and academic holidays show 'H' in ALL subject sheets, created complete chronological timeline that follows actual calendar dates, enhanced subject-specific headers to include only relevant class periods plus all holidays, ensuring exports reflect true weekly academic schedule progression from first day to last day of month
- July 23, 2025. CRITICAL MONTHLY DATE FILTERING FIX: Fixed major Excel export bug where hardcoded month-end date (31st) was causing June dates to appear in July exports - replaced hardcoded '31' with proper last-day-of-month calculation using new Date(year, month, 0).getDate() in exportMonthlyAttendance function, and added date validation in exportTimetableWiseAttendance function to prevent date overflow between months, ensuring exports show only the selected month's dates with accurate date range filtering
- July 23, 2025. COMPREHENSIVE EXCEL TIMETABLE & HOLIDAY INTEGRATION: Implemented complete timetable-aware Excel export system where holidays show 'H' and no-class periods show '-' - added timetable data loading to attendanceExport.ts with API calls to check class schedules, implemented proper logic hierarchy (1st: check timetable for class, 2nd: check holidays, 3rd: check attendance), added 'H' marking for holiday dates with course-specific filtering, added '-' marking when no class is scheduled in timetable, enhanced both period-wise and subject-wise Excel exports with consistent timetable and holiday integration, updated legend to reflect new marking system
- July 21, 2025. AUTO-DATE SERVICE INTEGRATION WITH ATTENDANCE MANAGEMENT: Successfully implemented comprehensive auto-date detection service with holiday synchronization for attendance management - created AutoDateService with 60-second interval checking for system date changes, integrated service into AttendanceScreen with automatic date updates and holiday state synchronization, added auto-date status banner displaying system date and sync status with visual indicators, implemented subscriber pattern for real-time state updates, enhanced UI with auto-update indicators and system date display, ensures attendance system automatically adapts to date changes after midnight with proper holiday integration and feature disabling when holidays are detected
- July 21, 2025. EMERGENCY HOLIDAY FEATURE REMOVAL & ACADEMIC HOLIDAY MULTIPLE DATE SELECTION: Successfully removed emergency holiday feature per user request and implemented comprehensive multiple date selection for academic holidays - hidden emergency holiday type selector and related UI elements, simplified calendar interface to show only academic holidays with blue styling, implemented smart multiple date selection (click to add/remove dates), enhanced date selection feedback showing selected count, updated button text to reflect multiple holiday creation, removed all emergency holiday logic while maintaining academic holiday functionality with visual indicators and user guidance
- July 21, 2025. COMPREHENSIVE SMART HOLIDAY EXCEL EXPORT INTEGRATION: Successfully implemented complete holiday integration across Excel export systems - timetable-wise Excel exports now automatically mark "H" for holiday dates instead of blank cells, enhanced attendance sheet logic to display "H" when holidays dominate monthly periods with proper blue styling (bg-blue-100 text-blue-800), integrated checkIfHoliday function across both export and display systems, added holiday counting and dominance logic for accurate monthly aggregation, supports both academic holidays (from calendar) and weekly Friday holidays with consistent visual indicators across all attendance modules
- July 20, 2025. PAGE-LEVEL SCROLLBAR ENHANCEMENT: Added comprehensive scrollbar functionality to attendance system - implemented custom styled scrollbars on both Take Attendance and Attendance Sheet tabs with overflow-y-auto and max height constraints (calc(100vh - 200px)), added scrollbar styling with gray theme (scrollbar-thin, scrollbar-thumb-gray-400, scrollbar-track-gray-100) in CSS for cross-browser compatibility, enhanced user experience for long content with proper viewport management
- July 20, 2025. HISTORY TAB REMOVAL: Completely removed History tab from Attendance Management section per user request - removed desktop and mobile history tab buttons, deleted entire history tab content section with filters and attendance display, cleaned up related state variables (historyFilter, attendanceHistory), removed history-related useEffect and localStorage operations, eliminated history button from attendance confirmation screen - attendance system now has cleaner interface with Take, Sheet, Missed, and Subject & Timetable tabs only
- July 20, 2025. CRITICAL ATTENDANCE CROSS-CONTAMINATION FIX: Fixed major database filtering bug where Science attendance queries were returning Commerce records instead of empty results - cleaned invalid attendance records with NULL course_name that were causing data pollution, updated server-side attendance API filtering to properly handle courseName parameter for both PU courses (Science/Commerce), enhanced database query logging to identify missing courseName parameters in frontend API calls, fixed attendanceAnalytics.ts to include courseName parameter consistently - Science and Commerce attendance data now properly isolated with zero cross-contamination
- July 20, 2025. COMPREHENSIVE DATABASE SCHEMA MISMATCH RESOLUTION: Fixed critical database filtering issues across all class types - resolved Post-PU students (courseDivision: null in database) not appearing by updating API to skip courseDivision filtering for post-pu course types, fixed PU Science single section classes not showing students by removing batch filter when section parameter is empty, eliminated cached data contamination where attendance system showed stale student data instead of fresh database responses, implemented proper filtering logic: Post-PU classes ignore courseDivision/section filters, PU classes with empty section (Single Section) skip batch filtering - all class configurations now correctly return authentic student data from PostgreSQL database
- July 20, 2025. SECTION FILTERING COMPREHENSIVE FIX: Fixed critical bugs in Student Management and Attendance systems - both 1st and 2nd PU Commerce now correctly show Section A and B tabs, corrected useSections hook default configuration where 2nd PU Commerce was defaulting to single section instead of A & B sections, implemented consistent effective section logic across both student queries and attendance database checking, eliminated React Query caching issues that were causing section data mixing by forcing fresh API calls, verified server-side filtering works correctly with proper section parameter handling - system now properly isolates Commerce Section A (2 students) from Section B (2 students) without cross-contamination
- July 20, 2025. OFFLINE-FIRST MODEL REMOVAL & SECTION FILTERING FIX: Successfully removed offline-first model from take attendance functionality per user request - attendance now purely database-driven with no localStorage saving, fixed critical section filtering bug where Commerce Section A was showing students from both Section A and B (4 students instead of 2), implemented proper state clearing when class configuration changes, updated attendance lock logic with correct section handling for Science vs Commerce classes, unified timetable fetching to prevent data conflicts - period dropdowns now show authentic subject codes like "Period 1 (AP1)" instead of generic "Period 1 (Period 1)"
- July 19, 2025. MOBILE SHEET VISIBILITY & COLOR CONSISTENCY FIX: Fixed critical mobile layout issue where attendance sheet was cut off at bottom - implemented proper scrolling container with height constraints (calc(100vh - 240px)), replaced all emerald/lime green colors with consistent blue theme throughout sheet section (bg-blue-600, focus:ring-blue-500), updated mobile tabs, export buttons, form controls, loading states, and summary cards to use blue color scheme for consistent UX across all user roles
- July 19, 2025. TIMETABLE-BASED MISSED SECTIONS LOGIC IMPLEMENTATION: Updated missed sections system to match exact user timetable requirements - only shows actual scheduled subjects (AP1, TJD1, FQH1, etc.) while excluding "-" periods, properly filters Fridays and holidays, uses comprehensive SQL JOINs between timetable and attendance tables, follows "12 AM rule" (scheduled_date < current_date), includes detailed console logging for transparency, and integrates offline-first functionality with network status indicators
- July 19, 2025. OFFLINE-FIRST MISSED SECTIONS & SUBJECT MANAGEMENT: Successfully implemented comprehensive offline-first support for both Missed Sections and Subject & Timetable Management modules with localStorage caching, background database synchronization, network status indicators, manual refresh functionality, and fixed critical SelectItem component crashes by using "all" placeholder values
- July 19, 2025. EXCEL EXPORT FORMAT REFINEMENT: Working on fixing timetable-wise Excel export to match user's exact template - implementing separate subject sheets with simple date columns (Mon-30, Tue-01) instead of period-wise columns, ensuring proper subject-specific day filtering and clean P/A attendance markers per user requirements
- July 16, 2025. CLASS-SPECIFIC SUBJECT MANAGEMENT IMPLEMENTED: Successfully implemented true class-specific subject management where each class combination (like "1st PU Commerce Section A") maintains its own separate subject list stored in database - database schema aligned with existing structure, API endpoints updated for class-specific filtering, UI enhanced with class context display, timetable updated to use new class-specific subjects instead of old global ones
- July 15, 2025. ATTENDANCE-TIMETABLE DAY SYNC FIXED: Fixed critical bug where attendance always showed Monday's timetable regardless of selected date - added dayOfWeek parameter to timetable API calls based on selected date, enhanced Friday holiday detection to show weekly holidays properly, updated dependency array to reload periods when date changes - now Tuesday shows TJW subjects, Monday shows AQD subjects, Friday shows holiday banner
- July 11, 2025. CLASS-SPECIFIC TIMETABLE SYSTEM VERIFIED: Confirmed the Subject & Timetable system is properly class-specific - each class combination (PU Commerce A, PU Science, Post-PU 3rd Year) maintains completely separate timetables, period configurations, and subjects - attendance modules now show authentic curriculum subjects per class instead of generic periods
- July 11, 2025. ATTENDANCE TIMETABLE SYNC: Fixed attendance system to sync with Subject & Timetable Management - periods now display real subjects from timetable instead of demo data, replaced PeriodService with timetable API integration, periods show format like "Arabic (ARB)" with actual subject names
- July 11, 2025. DATABASE CLEANUP: Removed unused `timetable_subject_map` table - this was a legacy table not referenced in current schema or codebase, current system uses `timetable` table for timetable management with proper subject relationships
- July 11, 2025. PERIOD LIMITS UPDATE: Updated maximum period configuration limits - PUC classes now support maximum 8 periods per day (up from 3), POST-PUC classes support maximum 12 periods per day (up from 8), with clear visual indicators in period configuration dialog
- July 11, 2025. CLASS-SPECIFIC PERIOD CONFIGURATION: Fixed critical issue where period configuration was applied globally - now properly scoped per class combination with unique database records, enhanced dialog clarity, and improved logging for class-specific period management
- July 11, 2025. MISSED ATTENDANCE DATA CLEANUP: Cleared all missed attendance data from both database (56 records) and localStorage as requested - system now has clean slate for missed attendance tracking
- July 11, 2025. TIMETABLE UNIQUENESS FIX: Fixed critical timetable sharing issue - each class combination (PUC 1st Commerce A/B, Science, Post-PUC years) now has completely separate unique timetables, removed "Unknown" period placeholders in Post-PUC, implemented proper class-specific filtering
- July 11, 2025. SUBJECT MANAGEMENT SIMPLIFICATION: Successfully implemented simplified Subject Management with only two categories (PUC vs Post-PUC) while maintaining unique timetables per class - subjects now shared across course types but timetables remain class-specific
- July 11, 2025. CRITICAL TIMETABLE FIX: Fixed period count mismatch between frontend (18) and database (21) - implemented proper bulk upsert functionality that updates existing entries instead of creating duplicates, cleaned up 3 duplicate entries from database, ensured exactly 18 periods (3 periods × 6 days excluding Friday holiday) for accurate timetable management
- July 10, 2025. CLASS STRUCTURE REFINEMENT: Updated Subject & Timetable Management filters to match exact academic structure - PU College Commerce (Sections A & B only), Science (No sections), Post-PU 3rd-7th Year (No sections) - implemented smart conditional section filtering and proper reset logic
- July 10, 2025. SUBJECT & TIMETABLE TAB INTEGRATION: Added Subject & Timetable Management as a dedicated tab within the attendance screen interface - removed from main navigation drawer and made accessible through attendance module for better workflow integration
- July 10, 2025. MAJOR SYSTEM TRANSITION - SUBJECT & TIMETABLE MANAGEMENT: Successfully replaced period management system with comprehensive Subject & Timetable Management system featuring separate modules for yearly subject management (with metadata like subjectCode, courseType, year, stream, section) and weekly timetable grid building - includes full database integration, API endpoints, and navigation updates across entire application
- July 10, 2025. COMPREHENSIVE PERIOD MANAGEMENT SYSTEM: Implemented complete database-first period management system with CRUD operations, PeriodManagement UI component, PeriodService for database/localStorage sync, API endpoints with validation, and integration with AttendanceScreen settings tab - teachers can now create, edit, and delete class-specific periods with automatic synchronization across all modules
- July 10, 2025. STUDENT PROFILE PDF ENHANCEMENT: Enhanced PDF report generation to include comprehensive real data - added teacher remarks section, improved leave records with duration calculation, added complete student contact information, and included report summary with data source verification to ensure all data is authentic and real-time from database
- July 10, 2025. EMERGENCY LEAVE REMOVAL: Removed emergency leave option from attendance screen as requested - cleaned up interface by removing emergency leave button and status display components
- July 10, 2025. NAMAZ HOLIDAY SYNC FIX: Fixed critical error in namaz sheet holiday marking by properly passing holidays as prop to NamazAttendanceSheet component and updating function signatures to include holidays parameter
- July 10, 2025. HOLIDAY AUTO-SYNC UI CLEANUP: Removed duplicate holiday indicators from student cards to maintain clean interface - holiday status now displayed only in main banner area when declared
- July 10, 2025. COMPREHENSIVE HOLIDAY AUTO-SYNC IMPLEMENTATION: Completed full holiday synchronization across Attendance and Namaz modules with real-time detection, enhanced banners showing clear purpose/reason, complete form control disabling, holiday override screens, and automatic blocking of all operations when holidays are declared - fixed courseType synchronization issues and syntax errors
- July 6, 2025. EMERGENCY LEAVE WORKFLOW IMPLEMENTATION: Implemented comprehensive emergency leave system with period-specific marking, auto-attendance insertion, and red visual indicators - emergency periods display "E" status and are non-editable, integrated with existing attendance validation
- July 6, 2025. ACADEMIC CALENDAR SYSTEM INTEGRATION: Implemented comprehensive smart holiday scheduling system with calendar UI, database integration, and cross-module synchronization - holidays now block attendance/namaz tracking automatically and integrate with export systems
- July 6, 2025. FIXED LEAVE MANAGEMENT DATABASE ISSUE: Resolved database insertion error that prevented leave creation - fixed timestamp handling for createdAt field, leaves now save properly to database for all students
- July 6, 2025. ENHANCED LEAVE MANAGEMENT UX: Removed redundant filter search option, fixed global search to only appear when no filters are active, improved button visibility with professional blue color scheme
- July 6, 2025. DUAL STORAGE MISSED ATTENDANCE: Implemented comprehensive dual storage system for missed attendance - saves to both database and localStorage with automatic fallback and conflict resolution
- July 6, 2025. ROBUST DATA PERSISTENCE SYSTEM: Implemented comprehensive namaz attendance storage with your requested data model - stores all data by date/prayer/student without auto-deletion, supports calendar/date-wise history view, and never overwrites existing data unless manually edited
- July 6, 2025. HISTORICAL DATA RECOVERY COMPLETE: Restored missing July 4th namaz attendance data - all 5 prayers (fajr, zuhr, asr, maghrib, isha) for both students now visible in the sheet view
- July 6, 2025. FIXED DATABASE SYNCHRONIZATION: Implemented database-first loading for both attendance and namaz tracking - data now persists permanently across page refreshes and sessions
- July 6, 2025. Fixed zuhr prayer display issue by standardizing prayer names from 'dhuhr' to 'zuhr' across all components and validation services
- July 6, 2025. Enhanced namaz tracking with default "present" status and working "All Present" button functionality
- July 6, 2025. Improved API endpoints for namaz attendance with proper database saving and filtering by date/prayer
- July 4, 2025. Disabled toast notifications for better mobile-friendly user experience - removed disruptive popups
- July 4, 2025. Fixed attendance sheet to load data from database instead of localStorage - now shows saved attendance records properly
- July 4, 2025. MAJOR FIX: Completely rebuilt attendance saving system to work reliably in offline/low network conditions with dual localStorage+database storage and comprehensive error handling
- July 4, 2025. Fixed student display filtering issue in attendance module - both students now appear correctly in the interface
- July 4, 2025. Removed attendance lock status indicator popup as requested by user
- July 4, 2025. Updated attendance database schema to include comprehensive tracking fields: roll_no, course_type, course_name, section, batch_year, recorded_at, synced, updated_at
- July 4, 2025. Added contact number fields (contact1, contact2) to student forms in HomePageNew and StudentFormDialogFixed
- June 29, 2025. Fixed student persistence across all modules - dashboard, attendance, and namaz now use PostgreSQL database instead of localStorage
- June 28, 2025. Fixed remarks system to use authentic database students instead of localStorage demo data  
- June 24, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```