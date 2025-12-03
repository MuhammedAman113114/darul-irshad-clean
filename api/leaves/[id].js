// PUT /api/leaves/:id - Update leave
// DELETE /api/leaves/:id - Delete leave
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
  const leaveId = parseInt(id);

  if (!leaveId || isNaN(leaveId)) {
    return res.status(400).json({ error: 'Invalid leave ID' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'PUT') {
      const { fromDate, toDate, reason, status } = req.body;
      
      const result = await sql`
        UPDATE leaves SET
          from_date = ${fromDate},
          to_date = ${toDate},
          reason = ${reason},
          status = ${status}
        WHERE id = ${leaveId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Leave not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM leaves WHERE id = ${leaveId} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Leave not found' });
      }

      return res.status(200).json({ message: 'Leave deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Leave API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
