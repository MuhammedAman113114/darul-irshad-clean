// Timetable API - All operations in one file
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
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());

    // GET - Fetch timetable
    if (req.method === 'GET') {
      const { courseType, year, stream, section, dayOfWeek, id } = req.query;
      
      // Get single entry by ID
      if (id) {
        const result = await sql`SELECT * FROM timetable WHERE id = ${parseInt(id)}`;
        return res.status(200).json(result.length > 0 ? toCamelCase(result[0]) : null);
      }
      
      let query = 'SELECT * FROM timetable WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (courseType) {
        query += ` AND course_type = $${paramIndex++}`;
        params.push(courseType);
      }
      if (year) {
        query += ` AND year = $${paramIndex++}`;
        params.push(year);
      }
      if (stream) {
        query += ` AND stream = $${paramIndex++}`;
        params.push(stream);
      }
      if (section) {
        query += ` AND section = $${paramIndex++}`;
        params.push(section);
      }
      if (dayOfWeek) {
        query += ` AND day_of_week = $${paramIndex++}`;
        params.push(dayOfWeek);
      }
      
      query += ' ORDER BY day_of_week, period_number';
      
      const timetable = await sql(query, params);
      return res.status(200).json(timetable.map(toCamelCase));
    }

    // POST - Create timetable entry or bulk create
    if (req.method === 'POST') {
      const { bulk, entries } = req.body;
      
      // Bulk create
      if (bulk && entries && Array.isArray(entries)) {
        const results = [];
        for (const entry of entries) {
          const result = await sql`
            INSERT INTO timetable (
              course_type, year, stream, section, day_of_week, period_number,
              subject_id, start_time, end_time, created_by, created_at, updated_at
            ) VALUES (
              ${entry.courseType}, ${entry.year}, ${entry.stream || null}, ${entry.section},
              ${entry.dayOfWeek}, ${entry.periodNumber}, ${entry.subjectId || null},
              ${entry.startTime || null}, ${entry.endTime || null}, ${session.user.id}, NOW(), NOW()
            ) RETURNING *
          `;
          results.push(toCamelCase(result[0]));
        }
        return res.status(201).json(results);
      }
      
      // Single create
      const { courseType, year, stream, section, dayOfWeek, periodNumber, subjectId, startTime, endTime } = req.body;
      
      const result = await sql`
        INSERT INTO timetable (
          course_type, year, stream, section, day_of_week, period_number,
          subject_id, start_time, end_time, created_by, created_at, updated_at
        ) VALUES (
          ${courseType}, ${year}, ${stream || null}, ${section}, ${dayOfWeek}, ${periodNumber},
          ${subjectId || null}, ${startTime || null}, ${endTime || null}, ${session.user.id}, NOW(), NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    // PATCH - Update timetable entry
    if (req.method === 'PATCH') {
      const { id, subjectId, startTime, endTime } = req.body;
      
      const result = await sql`
        UPDATE timetable SET
          subject_id = ${subjectId || null},
          start_time = ${startTime || null},
          end_time = ${endTime || null},
          updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Timetable entry not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    // DELETE - Delete timetable entry
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      const result = await sql`DELETE FROM timetable WHERE id = ${parseInt(id)} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Timetable entry not found' });
      }

      return res.status(200).json({ message: 'Timetable entry deleted successfully' });
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
