// Complete frontend data cleanup script
console.log("🗑️ Starting complete frontend data cleanup...");

// Clear all missed attendance related keys
const missedKeys = [
  'missed_attendance',
  'missedAttendance', 
  'missed_attendance_data',
  'missed_attendance_status',
  'madrasa_missed_attendance',
  'attendance_missed_records'
];

// Clear all history/attendance related keys
const historyKeys = [
  'attendance_history',
  'attendanceHistory',
  'attendance_data',
  'attendance_records',
  'madrasa_attendance',
  'student_attendance',
  'daily_attendance'
];

// Clear all data
[...missedKeys, ...historyKeys].forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Cleared: ${key}`);
  }
});

// Clear any keys containing "attendance" or "missed"
const allKeys = Object.keys(localStorage);
const relatedKeys = allKeys.filter(key => 
  key.toLowerCase().includes('attendance') || 
  key.toLowerCase().includes('missed') ||
  key.toLowerCase().includes('history')
);

relatedKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Cleared related key: ${key}`);
});

// Force reload to clear React Query cache
console.log("🔄 Forcing page reload to clear cache...");
window.location.reload();