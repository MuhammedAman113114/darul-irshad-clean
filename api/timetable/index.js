// GET /api/timetable - Fetch timetable entries
// POST /api/timetable - Create timetable entry
import { neon } from '@neondatabase/serverless';

function toCamelCase(obj) {
  const result = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const { courseType, year, stream, section, dayOfWeek } = req.query;
      
      console.log('📅 Timetable GET request:', { courseType, year, stream, section, dayOfWeek });
      
      // Build query with proper Neon SQL template syntax
      let records;
      
      if (courseType && year && stream && section && dayOfWeek) {
        records = await sql`
          SELECT t.*, s.subject as subject_name, s.subject_code
          FROM timetable t
          LEFT JOIN subjects s ON t.subject_id = s.id
          WHERE t.course_type = ${courseType} 
            AND t.year = ${year}
            AND t.stream = ${stream}
            AND t.section = ${section}
            AND t.day_of_week = ${dayOfWeek}
          ORDER BY t.period_number ASC
        `;
      } else if (courseType && year && dayOfWeek) {
        records = await sql`
          SELECT t.*, s.subject as subject_name, s.subject_code
          FROM timetable t
          LEFT JOIN subjects s ON t.subject_id = s.id
          WHERE t.course_type = ${courseType} 
            AND t.year = ${year}
            AND t.day_of_week = ${dayOfWeek}
          ORDER BY t.period_number ASC
        `;
      } else if (courseType && year) {
        records = await sql`
          SELECT t.*, s.subject as subject_name, s.subject_code
          FROM timetable t
          LEFT JOIN subjects s ON t.subject_id = s.id
          WHERE t.course_type = ${courseType} 
            AND t.year = ${year}
          ORDER BY t.day_of_week, t.period_number ASC
        `;
      } else {
        records = await sql`
          SELECT t.*, s.subject as subject_name, s.subject_code
          FROM timetable t
          LEFT JOIN subjects s ON t.subject_id = s.id
          ORDER BY t.course_type, t.year, t.day_of_week, t.period_number ASC
        `;
      }
      
      console.log(`📅 Found ${records.length} timetable entries`);
      return res.status(200).json(records.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { courseType, year, stream, section, dayOfWeek, periodNumber, subjectId, startTime, endTime } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      const result = await sql`
        INSERT INTO timetable (
          course_type, year, stream, section, day_of_week, 
          period_number, subject_id, start_time, end_time, created_by
        ) VALUES (
          ${courseType}, ${year}, ${stream || null}, ${section || null}, ${dayOfWeek},
          ${periodNumber}, ${subjectId}, ${startTime || null}, ${endTime || null}, ${session.user.id}
        ) RETURNING *
      `;
      
      console.log(`📅 Created timetable entry: ${courseType} ${year} ${dayOfWeek} P${periodNumber}`);
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Timetable API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
