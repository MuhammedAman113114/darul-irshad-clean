// Remarks API - All operations in one file
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
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());

    // GET - Fetch remarks
    if (req.method === 'GET') {
      const { studentId, category, startDate, endDate } = req.query;
      
      let query = 'SELECT * FROM remarks WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (studentId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(parseInt(studentId));
      }
      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }
      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const remarks = await sql(query, params);
      return res.status(200).json(remarks.map(toCamelCase));
    }

    // POST - Create remark
    if (req.method === 'POST') {
      const { studentId, content, category } = req.body;
      
      const result = await sql`
        INSERT INTO remarks (
          student_id, content, category, submitted_by, created_at
        ) VALUES (
          ${studentId}, ${content}, ${category || 'general'}, ${session.user.id}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Remarks API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
