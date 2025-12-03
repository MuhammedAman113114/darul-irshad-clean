// PATCH /api/subjects/:id - Update subject
// DELETE /api/subjects/:id - Delete subject
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
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const subjectId = parseInt(id);

  if (!subjectId || isNaN(subjectId)) {
    return res.status(400).json({ error: 'Invalid subject ID' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'PATCH') {
      const { subject, subjectCode } = req.body;
      
      const result = await sql`
        UPDATE subjects SET
          subject = ${subject},
          subject_code = ${subjectCode}
        WHERE id = ${subjectId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM subjects WHERE id = ${subjectId} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      return res.status(200).json({ message: 'Subject deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Subject API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
