// GET /api/students - List students with filters
// POST /api/students - Create new student
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const { courseType, year, courseDivision, batch, status } = req.query;
      
      let query = 'SELECT * FROM students WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (courseType) {
        query += ` AND course_type = $${paramIndex++}`;
        params.push(courseType);
      }
      if (year) {
        query += ` AND year = $${paramIndex++}`;
        params.push(year);
      }
      if (courseDivision) {
        query += ` AND course_division = $${paramIndex++}`;
        params.push(courseDivision);
      }
      if (batch) {
        query += ` AND batch = $${paramIndex++}`;
        params.push(batch);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      const students = await sql(query, params);
      return res.status(200).json(students);
    }

    if (req.method === 'POST') {
      const {
        name, rollNo, courseType, courseDivision, year, batch,
        dob, bloodGroup, fatherName, motherName, contact1, contact2,
        address, aadharNumber, photoUrl, status
      } = req.body;
      
      const result = await sql`
        INSERT INTO students (
          name, roll_no, course_type, course_division, year, batch,
          dob, blood_group, father_name, mother_name, contact_1, contact_2,
          address, aadhar_number, photo_url, status, created_at
        ) VALUES (
          ${name}, ${rollNo}, ${courseType}, ${courseDivision}, ${year}, ${batch},
          ${dob}, ${bloodGroup}, ${fatherName}, ${motherName}, ${contact1}, ${contact2},
          ${address}, ${aadharNumber}, ${photoUrl}, ${status || 'active'}, NOW()
        ) RETURNING *
      `;
      
      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Students API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message,
      details: error.toString()
    });
  }
}
