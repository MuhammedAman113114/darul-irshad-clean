// POST /api/timetable/bulk-upsert - Bulk upsert timetable entries
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    let { courseType, year, stream, section, entries } = req.body;

    // If entries is an array and has items, extract class info from first entry
    if (!courseType && entries && Array.isArray(entries) && entries.length > 0) {
      courseType = entries[0].courseType;
      year = entries[0].year;
      stream = entries[0].stream;
      section = entries[0].section;
    }

    if (!courseType || !year || !entries || !Array.isArray(entries)) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['courseType', 'year', 'entries'],
        received: { courseType, year, entriesCount: entries?.length }
      });
    }

    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());

    console.log(`📅 Bulk upsert timetable: ${courseType} ${year} ${stream || ''} ${section || ''} - ${entries.length} entries`);

    // Delete existing entries for this class
    await sql`
      DELETE FROM timetable 
      WHERE course_type = ${courseType} 
        AND year = ${year}
        AND stream = ${stream || null}
        AND section = ${section || null}
    `;

    console.log(`🗑️ Deleted existing timetable entries`);

    // Insert new entries
    const results = [];
    for (const entry of entries) {
      const { dayOfWeek, periodNumber, subjectId, startTime, endTime } = entry;
      
      if (!dayOfWeek || !periodNumber) {
        console.warn('⚠️ Skipping invalid entry:', entry);
        continue;
      }

      const result = await sql`
        INSERT INTO timetable (
          course_type, year, stream, section, day_of_week, 
          period_number, subject_id, start_time, end_time, created_by
        ) VALUES (
          ${courseType}, ${year}, ${stream || null}, ${section || null}, ${dayOfWeek},
          ${periodNumber}, ${subjectId || null}, ${startTime || null}, ${endTime || null}, ${session.user.id}
        ) RETURNING *
      `;
      
      results.push(toCamelCase(result[0]));
    }

    console.log(`✅ Inserted ${results.length} timetable entries`);

    return res.status(200).json({
      success: true,
      message: `Timetable saved successfully`,
      count: results.length,
      entries: results
    });

  } catch (error) {
    console.error('Bulk upsert timetable error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
