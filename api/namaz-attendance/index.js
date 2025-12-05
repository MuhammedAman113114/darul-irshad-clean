// GET /api/namaz-attendance - Fetch prayer records
// POST /api/namaz-attendance - Record prayer attendance
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
      const { date, prayer, studentId, status } = req.query;
      
      let query = 'SELECT * FROM namaz_attendance WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (date) {
        query += ` AND date = $${paramIndex++}`;
        params.push(date);
      }
      if (prayer) {
        query += ` AND prayer = $${paramIndex++}`;
        params.push(prayer);
      }
      if (studentId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(parseInt(studentId));
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      query += ' ORDER BY date DESC, prayer ASC';
      
      const records = await sql(query, params);
      return res.status(200).json(records.map(toCamelCase));
    }

    if (req.method === 'POST') {
      const { date, prayer, students } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      // Handle bulk upload (array of students)
      if (Array.isArray(students)) {
        console.log(`📤 Recording namaz for ${students.length} students: ${prayer} on ${date}`);
        
        const results = [];
        for (const student of students) {
          try {
            // Check if record exists
            const existing = await sql`
              SELECT id FROM namaz_attendance 
              WHERE student_id = ${student.id} AND date = ${date} AND prayer = ${prayer}
            `;
            
            if (existing.length > 0) {
              // Update existing record
              const result = await sql`
                UPDATE namaz_attendance 
                SET status = ${student.status}, created_by = ${session.user.id}
                WHERE student_id = ${student.id} AND date = ${date} AND prayer = ${prayer}
                RETURNING *
              `;
              results.push(toCamelCase(result[0]));
            } else {
              // Insert new record
              const result = await sql`
                INSERT INTO namaz_attendance (
                  student_id, date, prayer, status, created_by, created_at
                ) VALUES (
                  ${student.id}, ${date}, ${prayer}, ${student.status}, ${session.user.id}, NOW()
                ) RETURNING *
              `;
              results.push(toCamelCase(result[0]));
            }
          } catch (error) {
            console.error(`Failed to record for student ${student.id}:`, error);
          }
        }
        
        console.log(`✅ Recorded ${results.length}/${students.length} namaz records`);
        return res.status(201).json({ 
          success: true, 
          count: results.length,
          records: results 
        });
      }
      
      // Handle single student (legacy support)
      const { studentId, status } = req.body;
      console.log('Recording namaz:', { studentId, date, prayer, status });
      
      // Check if record exists
      const existing = await sql`
        SELECT id FROM namaz_attendance 
        WHERE student_id = ${studentId} AND date = ${date} AND prayer = ${prayer}
      `;
      
      let result;
      if (existing.length > 0) {
        result = await sql`
          UPDATE namaz_attendance 
          SET status = ${status}, created_by = ${session.user.id}
          WHERE student_id = ${studentId} AND date = ${date} AND prayer = ${prayer}
          RETURNING *
        `;
      } else {
        result = await sql`
          INSERT INTO namaz_attendance (
            student_id, date, prayer, status, created_by, created_at
          ) VALUES (
            ${studentId}, ${date}, ${prayer}, ${status}, ${session.user.id}, NOW()
          ) RETURNING *
        `;
      }
      
      return res.status(201).json(toCamelCase(result[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Namaz API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
