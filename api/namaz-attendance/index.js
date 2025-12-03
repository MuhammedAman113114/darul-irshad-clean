// GET /api/namaz-attendance - Fetch prayer records
// POST /api/namaz-attendance - Record prayer attendance
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
      const { date, prayer, studentId, status } = req.query;
      
      let query = 'SELECT * FROM namaz_attendance WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (date) {
        query += ` AND date = $${paramIndex++}`;
        params.push(date);
      }
      if (prayer) {
        query += ` AND prayer = $${paramIndex++}`;
        params.push(prayer);
      }
      if (studentId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(parseInt(studentId));
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      query += ' ORDER BY date DESC, prayer ASC';
      
      const records = await sql(query, params);
      return res.status(200).json(records.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { studentId, date, prayer, status } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      console.log('Recording namaz:', { studentId, date, prayer, status });
      
      const result = await sql`
        INSERT INTO namaz_attendance (
          student_id, date, prayer, status, created_by, created_at
        ) VALUES (
          ${studentId}, ${date}, ${prayer}, ${status}, ${session.user.id}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Namaz API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
