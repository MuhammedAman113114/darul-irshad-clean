// Results API - All operations in one file
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

    // GET - Fetch results
    if (req.method === 'GET') {
      const { year, courseType, courseName, section, examType } = req.query;
      
      let query = 'SELECT * FROM results WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (year) {
        query += ` AND year = $${paramIndex++}`;
        params.push(year);
      }
      if (courseType) {
        query += ` AND course_type = $${paramIndex++}`;
        params.push(courseType);
      }
      if (courseName) {
        query += ` AND course_name = $${paramIndex++}`;
        params.push(courseName);
      }
      if (section) {
        query += ` AND section = $${paramIndex++}`;
        params.push(section);
      }
      if (examType) {
        query += ` AND exam_type = $${paramIndex++}`;
        params.push(examType);
      }
      
      query += ' ORDER BY upload_date DESC';
      
      const results = await sql(query, params);
      return res.status(200).json(results.map(toCamelCase));
    }

    // POST - Upload result
    if (req.method === 'POST') {
      const { year, courseType, courseName, section, examType, fileUrl, fileType, uploadedBy, notes } = req.body;
      
      const result = await sql`
        INSERT INTO results (
          year, course_type, course_name, section, exam_type,
          file_url, file_type, uploaded_by, upload_date, notes
        ) VALUES (
          ${year}, ${courseType}, ${courseName || null}, ${section || null}, ${examType},
          ${fileUrl}, ${fileType}, ${uploadedBy || 'System'}, NOW(), ${notes || null}
        ) RETURNING *
      `;
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Results API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
