// Holidays API - All operations in one file
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

    // GET - Fetch holidays
    if (req.method === 'GET') {
      const { startDate, endDate, type, id } = req.query;
      
      // Get single holiday by ID
      if (id) {
        const result = await sql`SELECT * FROM holidays WHERE id = ${parseInt(id)} AND is_deleted = false`;
        return res.status(200).json(result.length > 0 ? toCamelCase(result[0]) : null);
      }
      
      let query = 'SELECT * FROM holidays WHERE is_deleted = false';
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
      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }
      
      query += ' ORDER BY date ASC';
      
      const holidays = await sql(query, params);
      return res.status(200).json(holidays.map(toCamelCase));
    }

    // POST - Create holiday
    if (req.method === 'POST') {
      const { date, name, type, reason, affectedCourses, triggeredAt } = req.body;
      
      const result = await sql`
        INSERT INTO holidays (
          date, name, type, reason, affected_courses, triggered_at,
          is_deleted, created_by, created_at
        ) VALUES (
          ${date}, ${name}, ${type}, ${reason || null},
          ${affectedCourses || null}, ${triggeredAt || null},
          false, ${session.user.id}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    // PATCH - Update holiday
    if (req.method === 'PATCH') {
      const { id, name, reason, isDeleted } = req.body;
      
      const result = await sql`
        UPDATE holidays SET
          name = ${name},
          reason = ${reason || null},
          is_deleted = ${isDeleted !== undefined ? isDeleted : false}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    // DELETE - Soft delete holiday
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      const result = await sql`
        UPDATE holidays SET is_deleted = true WHERE id = ${parseInt(id)} RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      return res.status(200).json({ message: 'Holiday deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Holidays API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
