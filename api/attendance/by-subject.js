// GET /api/attendance/by-subject - Subject-wise attendance
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
    const { subjectId, courseType, year, section, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (subjectId) {
      query += ` AND subject_id = $${paramIndex++}`;
      params.push(parseInt(subjectId));
    }
    if (courseType) {
      query += ` AND course_type = $${paramIndex++}`;
      params.push(courseType);
    }
    if (year) {
      query += ` AND batch_year = $${paramIndex++}`;
      params.push(year);
    }
    if (section) {
      query += ` AND section = $${paramIndex++}`;
      params.push(section);
    }
    if (startDate) {
      query += ` AND date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC';
    
    const attendance = await sql(query, params);
    return res.status(200).json(attendance.map(toCamelCase));
  } catch (error) {
    console.error('Subject attendance API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
