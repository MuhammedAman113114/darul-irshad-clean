// GET /api/namaz-attendance/stats - Prayer statistics
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { studentId, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        prayer,
        status,
        COUNT(*) as count
      FROM namaz_attendance
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (studentId) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(parseInt(studentId));
    }
    if (startDate) {
      query += ` AND date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ' GROUP BY prayer, status ORDER BY prayer, status';
    
    const stats = await sql(query, params);
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Namaz stats API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
