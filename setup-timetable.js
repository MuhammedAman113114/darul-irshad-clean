// Quick Timetable Setup Script
// Run this to populate the database with default timetable data

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function setupTimetable() {
  console.log('🔧 Setting up default timetable...');
  
  // Define default periods
  const periods = [
    { number: 1, startTime: '09:00', endTime: '09:45' },
    { number: 2, startTime: '09:45', endTime: '10:30' },
    { number: 3, startTime: '10:30', endTime: '11:15' },
    { number: 4, startTime: '11:15', endTime: '12:00' },
    { number: 5, startTime: '12:00', endTime: '12:45' },
    { number: 6, startTime: '12:45', endTime: '01:30' },
  ];
  
  // Define classes
  const classes = [
    { courseType: 'pu', year: '1', stream: 'commerce', section: 'A' },
    { courseType: 'pu', year: '2', stream: 'commerce', section: 'A' },
  ];
  
  // Days (excluding Friday - holiday)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];
  
  let count = 0;
  
  for (const classInfo of classes) {
    for (const day of days) {
      for (const period of periods) {
        try {
          // Check if entry exists
          const existing = await sql`
            SELECT id FROM timetable 
            WHERE course_type = ${classInfo.courseType}
              AND year = ${classInfo.year}
              AND stream = ${classInfo.stream}
              AND section = ${classInfo.section}
              AND day_of_week = ${day}
              AND period_number = ${period.number}
          `;
          
          if (existing.length === 0) {
            await sql`
              INSERT INTO timetable (
                course_type, year, stream, section, day_of_week,
                period_number, start_time, end_time, created_by
              ) VALUES (
                ${classInfo.courseType}, ${classInfo.year}, ${classInfo.stream}, 
                ${classInfo.section}, ${day}, ${period.number},
                ${period.startTime}, ${period.endTime}, 1
              )
            `;
            count++;
          }
        } catch (error) {
          console.error(`Error adding ${day} P${period.number}:`, error.message);
        }
      }
    }
  }
  
  console.log(`✅ Added ${count} timetable entries`);
  
  // Verify
  const total = await sql`SELECT COUNT(*) as count FROM timetable`;
  console.log(`📊 Total timetable entries in database: ${total[0].count}`);
}

setupTimetable()
  .then(() => {
    console.log('🎉 Timetable setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
