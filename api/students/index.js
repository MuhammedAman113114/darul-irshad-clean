// GET /api/students - List students with filters
// POST /api/students - Create new student
import { neon } from '@neondatabase/serverless';

// Convert snake_case to camelCase
function toCamelCase(obj) {
  const result = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

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
      
      query += ' ORDER BY id DESC';
      
      const students = await sql(query, params);
      
      // Convert to camelCase for frontend
      const camelCaseStudents = students.map(toCamelCase);
      
      console.log(`Found ${camelCaseStudents.length} students with filters:`, { courseType, year, courseDivision, batch });
      
      return res.status(200).json(camelCaseStudents);
    }

    if (req.method === 'POST') {
      const {
        name, rollNo, courseType, courseDivision, year, batch,
        dob, bloodGroup, fatherName, motherName, contact1, contact2,
        address, aadharNumber, photoUrl, status
      } = req.body;
      
      console.log('Creating student:', { name, rollNo, courseType, courseDivision, year, batch });
      
      const result = await sql`
        INSERT INTO students (
          name, roll_no, course_type, course_division, year, batch,
          dob, blood_group, father_name, mother_name, contact_1, contact_2,
          address, aadhar_number, photo_url, status, created_at
        ) VALUES (
          ${name}, ${rollNo}, ${courseType}, ${courseDivision || null}, ${year}, ${batch || null},
          ${dob || null}, ${bloodGroup || null}, ${fatherName || null}, ${motherName || null}, 
          ${contact1 || null}, ${contact2 || null}, ${address || null}, ${aadharNumber || null}, 
          ${photoUrl || null}, ${status || 'active'}, NOW()
        ) RETURNING *
      `;
      
      const newStudent = toCamelCase(result[0]);
      console.log('Student created:', newStudent);
      
      return res.status(201).json(newStudent);
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
