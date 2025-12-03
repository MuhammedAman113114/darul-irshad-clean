// GET /api/namaz-attendance/history - Historical prayer data
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
    const { startDate, endDate, studentId } = req.query;
    
    let query = 'SELECT * FROM namaz_attendance WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (studentId) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(parseInt(studentId));
    }
    
    query += ' ORDER BY date DESC, prayer ASC';
    
    const records = await sql(query, params);
    return res.status(200).json(records.map(toCamelCase));
  } catch (error) {
    console.error('Namaz history API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
