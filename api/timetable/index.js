// Consolidated Timetable API
// GET /api/timetable - Fetch timetable entries
// POST /api/timetable - Create single entry OR bulk upsert (if entries array provided)
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
      
      return res.status(200).json(records.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { courseType, year, stream, section, dayOfWeek, periodNumber, subjectId, startTime, endTime, entries } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      // BULK UPSERT: If entries array is provided
      if (entries && Array.isArray(entries)) {
        let bulkCourseType = courseType;
        let bulkYear = year;
        let bulkStream = stream;
        let bulkSection = section;

        // Extract from first entry if not provided
        if (!bulkCourseType && entries.length > 0) {
          bulkCourseType = entries[0].courseType;
          bulkYear = entries[0].year;
          bulkStream = entries[0].stream;
          bulkSection = entries[0].section;
        }

        if (!bulkCourseType || !bulkYear) {
          return res.status(400).json({ error: 'Missing courseType or year' });
        }

        // Delete existing entries
        await sql`
          DELETE FROM timetable 
          WHERE course_type = ${bulkCourseType} 
            AND year = ${bulkYear}
            AND stream = ${bulkStream || null}
            AND section = ${bulkSection || null}
        `;

        // Insert new entries
        const results = [];
        for (const entry of entries) {
          if (!entry.dayOfWeek || !entry.periodNumber) continue;

          const result = await sql`
            INSERT INTO timetable (
              course_type, year, stream, section, day_of_week, 
              period_number, subject_id, start_time, end_time, created_by
            ) VALUES (
              ${bulkCourseType}, ${bulkYear}, ${bulkStream || null}, ${bulkSection || null}, ${entry.dayOfWeek},
              ${entry.periodNumber}, ${entry.subjectId || null}, ${entry.startTime || null}, ${entry.endTime || null}, ${session.user.id}
            ) RETURNING *
          `;
          
          results.push(toCamelCase(result[0]));
        }

        return res.status(200).json({
          success: true,
          message: 'Timetable saved successfully',
          count: results.length,
          entries: results
        });
      }
      
      // SINGLE ENTRY: Create one timetable entry
      const result = await sql`
        INSERT INTO timetable (
          course_type, year, stream, section, day_of_week, 
          period_number, subject_id, start_time, end_time, created_by
        ) VALUES (
          ${courseType}, ${year}, ${stream || null}, ${section || null}, ${dayOfWeek},
          ${periodNumber}, ${subjectId}, ${startTime || null}, ${endTime || null}, ${session.user.id}
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Timetable API error:', error);
    return res.status(500).json({ 
      error: 'Database op