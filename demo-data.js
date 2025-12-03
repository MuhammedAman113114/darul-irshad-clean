// Demo script to create 30 students with sample attendance data
const students = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Vivek', 'Ananya', 'Diya', 'Priya', 'Kavya', 'Aanya',
  'Isha', 'Avni', 'Tara', 'Saanvi', 'Riya', 'Myra', 'Sara', 'Kiara', 'Arya', 'Zara'
];

const studentData = students.map((name, i) => ({
  name,
  rollNo: (i + 1).toString(),
  dob: '2007-01-15',
  fatherName: `Father ${i + 1}`,
  motherName: `Mother ${i + 1}`,
  address: `Address ${i + 1}`,
  bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][i % 8],
  aadharNumber: `12345678${1000 + i}`,
  photoUrl: null,
  courseType: 'pu',
  courseDivision: 'commerce',
  year: '1',
  batch: 'A',
  attendance: '100%',
  grade: 'N/A',
  onLeave: false,
  id: 1750000000000 + i
}));

// Create sample attendance for a few days
const attendanceRecords = [
  {
    date: '2025-06-13',
    period: '1',
    students: studentData.map((s, i) => ({
      ...s,
      status: i < 25 ? 'present' : i < 28 ? 'absent' : 'present' // 25 present, 3 absent, 2 present
    }))
  },
  {
    date: '2025-06-14',
    period: '1', 
    students: studentData.map((s, i) => ({
      ...s,
      status: i < 27 ? 'present' : 'absent' // 27 present, 3 absent
    }))
  },
  {
    date: '2025-06-17',
    period: '1',
    students: studentData.map((s, i) => ({
      ...s,
      status: i < 26 ? 'present' : i < 29 ? 'absent' : 'present' // 26 present, 3 absent, 1 present
    }))
  }
];

console.log('// Copy and paste these commands in browser console:');
console.log('localStorage.setItem("pu_1_commerce_A", JSON.stringify(' + JSON.stringify(studentData) + '));');

attendanceRecords.forEach(record => {
  const key = `attendance_pu_1_commerce_A_${record.date}_${record.period}`;
  console.log(`localStorage.setItem("${key}", JSON.stringify(${JSON.stringify({
    date: record.date,
    period: record.period,
    courseType: 'pu',
    year: '1',
    courseDivision: 'commerce',
    section: 'A',
    students: record.students,
    timestamp: new Date().toISOString()
  })}));`);
});

console.log('// Then refresh the page');