// GET /api/class-subjects - Get class-specific subjects
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
    const { courseType, year, stream, section } = req.query;
    
    let query = 'SELECT * FROM subjects WHERE course_type = $1 AND year = $2';
    const params = [courseType, year];
    let paramIndex = 3;
    
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
  } catch (error) {
    console.error('Class subjects API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
