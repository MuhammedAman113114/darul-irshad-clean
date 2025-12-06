// GET /api/attendance - Fetch attendance records
// POST /api/attendance - Record attendance
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
      const { date, courseType, year, section, period, studentId, status } = req.query;
      
      let query = 'SELECT * FROM attendance WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (date) {
        query += ` AND date = $${paramIndex++}`;
        params.push(date);
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
      if (period) {
        query += ` AND period = $${paramIndex++}`;
        params.push(parseInt(period));
      }
      if (studentId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(parseInt(studentId));
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      query += ' ORDER BY date DESC, period ASC';
      
      const attendance = await sql(query, params);
      const camelCaseAttendance = attendance.map(toCamelCase);
      
      console.log(`Found ${camelCaseAttendance.length} attendance records`);
      return res.status(200).json(camelCaseAttendance);
    }

    if (req.method === 'POST') {
      const {
        studentId, rollNo, date, period, status,
        courseType, courseName, courseDivision, section, batchYear, year, subjectId
      } = req.body;
      
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
      
      // Use courseDivision if courseName not provided, and year if batchYear not provided
      const finalCourseName = courseName || courseDivision || null;
      const finalBatchYear = batchYear || year || null;
      
      console.log('Recording attendance:', { 
        studentId, 
        rollNo: rollNo || studentId.toString(), 
        date, 
        period, 
        status, 
        courseType,
        courseName: finalCourseName,
        section,
        batchYear: finalBatchYear
      });
      
      const result = await sql`
        INSERT INTO attendance (
          student_id, roll_no, date, period, status,
          course_type, course_name, section, batch_year, subject_id,
          created_by, recorded_at, synced, updated_at
        ) VALUES (
          ${studentId}, ${rollNo || studentId.toString()}, ${date}, ${period}, ${status},
          ${courseType}, ${finalCourseName}, ${section || null}, ${finalBatchYear},
          ${subjectId || null}, ${session.user.id}, NOW(), true, NOW()
        ) RETURNING *
      `;
      
      const newAttendance = toCamelCase(result[0]);
      console.log('Attendance recorded:', newAttendance.id);
      
      return res.status(201).json(newAttendance);
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
