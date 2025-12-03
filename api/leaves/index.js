// GET /api/leaves - Fetch leave records
// POST /api/leaves - Create leave request
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
      const { studentId, status, fromDate, toDate } = req.query;
      
      let query = 'SELECT * FROM leaves WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (studentId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(parseInt(studentId));
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (fromDate) {
        query += ` AND from_date >= $${paramIndex++}`;
        params.push(fromDate);
      }
      if (toDate) {
        query += ` AND to_date <= $${paramIndex++}`;
        params.push(toDate);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const leaves = await sql(query, params);
      return res.status(200).json(leaves.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { studentId, fromDate, toDate, reason, status } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      console.log('Creating leave:', { studentId, fromDate, toDate });
      
      const result = await sql`
        INSERT INTO leaves (
          student_id, from_date, to_date, reason, status, created_by, created_at
        ) VALUES (
          ${studentId}, ${fromDate}, ${toDate}, ${reason}, 
          ${status || 'active'}, ${session.user.id}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Leaves API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
