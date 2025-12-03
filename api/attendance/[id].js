// PUT /api/attendance/:id - Update attendance
// DELETE /api/attendance/:id - Delete attendance
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
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const attendanceId = parseInt(id);

  if (!attendanceId || isNaN(attendanceId)) {
    return res.status(400).json({ error: 'Invalid attendance ID' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'PUT') {
      const { status } = req.body;
      
      const result = await sql`
        UPDATE attendance SET
          status = ${status},
          updated_at = NOW()
        WHERE id = ${attendanceId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM attendance WHERE id = ${attendanceId} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      return res.status(200).json({ message: 'Attendance deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
