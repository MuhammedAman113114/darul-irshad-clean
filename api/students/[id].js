// GET /api/students/:id - Get student by ID
// PUT/PATCH /api/students/:id - Update student
// DELETE /api/students/:id - Delete student
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const studentId = parseInt(id);

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM students WHERE id = ${studentId}`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      return res.status(200).json(toCamelCase(result[0]));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const {
        name, rollNo, courseType, courseDivision, year, batch,
        dob, bloodGroup, fatherName, motherName, contact1, contact2,
        address, aadharNumber, photoUrl, status
      } = req.body;

      console.log('Updating student:', studentId, req.body);

      const result = await sql`
        UPDATE students SET
          name = ${name},
          roll_no = ${rollNo},
          course_type = ${courseType},
          course_division = ${courseDivision || null},
          year = ${year},
          batch = ${batch || null},
          dob = ${dob || null},
          blood_group = ${bloodGroup || null},
          father_name = ${fatherName || null},
          mother_name = ${motherName || null},
          contact_1 = ${contact1 || null},
          contact_2 = ${contact2 || null},
          address = ${address || null},
          aadhar_number = ${aadharNumber || null},
          photo_url = ${photoUrl || null},
          status = ${status || 'active'}
        WHERE id = ${studentId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const updatedStudent = toCamelCase(result[0]);
      console.log('Student updated:', updatedStudent);

      return res.status(200).json(updatedStudent);
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM students WHERE id = ${studentId} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      console.log('Student deleted:', studentId);
      return res.status(200).json({ message: 'Student deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Student API error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message,
      details: error.toString()
    });
  }
}
