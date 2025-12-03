// Clear all missed attendance data from localStorage
console.log("Clearing missed attendance from localStorage...");

// Clear specific missed attendance keys
const keysToDelete = [
  'missed_attendance',
  'missedAttendance',
  'missed_attendance_data',
  'madrasa_missed_attendance'
];

keysToDelete.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Cleared: ${key}`);
});

// Also check for any keys containing "missed"
const allKeys = Object.keys(localStorage);
const missedKeys = allKeys.filter(key => key.toLowerCase().includes('missed'));
missedKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Cleared missed key: ${key}`);
});

console.log("All missed attendance data cleared from localStorage");
