// GET /api/subjects - List subjects
// POST /api/subjects - Create subject
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
      const { courseType, year, stream, section } = req.query;
      
      let query = 'SELECT * FROM subjects WHERE 1=1';
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
      
      query += ' ORDER BY subject ASC';
      
      const subjects = await sql(query, params);
      return res.status(200).json(subjects.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { subject, subjectCode, courseType, year, stream, section } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      const result = await sql`
        INSERT INTO subjects (
          subject, subject_code, course_type, year, stream, section, created_by, created_at
        ) VALUES (
          ${subject}, ${subjectCode}, ${courseType}, ${year || null}, 
          ${stream || null}, ${section || null}, ${session.user.id}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Subjects API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
