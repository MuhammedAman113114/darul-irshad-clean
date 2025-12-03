// API Route: /api/students
// Methods: GET (all students), POST (create student)

import { sql } from '../lib/db.js';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj) {
  const camelObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    camelObj[camelKey] = obj[key];
  }
  return camelObj;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj) {
  const snakeObj = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = obj[key];
  }
  return snakeObj;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Fetch all students
    if (req.method === 'GET') {
      const { courseType, year, courseDivision, batch, status } = req.query;
      
      let query = 'SELECT * FROM students WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // Add filters if provided
      if (courseType) {
        query += ` AND course_type = $${paramIndex}`;
        params.push(courseType);
        paramIndex++;
      }
      if (year) {
        query += ` AND year = $${paramIndex}`;
        params.push(year);
        paramIndex++;
      }
      if (courseDivision) {
        query += ` AND course_division = $${paramIndex}`;
        params.push(courseDivision);
        paramIndex++;
      }
      if (batch) {
        query += ` AND batch = $${paramIndex}`;
        params.push(batch);
        paramIndex++;
      }
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const students = await sql(query, params);
      
      // Convert to camelCase for frontend
      const formattedStudents = students.map(toCamelCase);

      return res.status(200).json({
        success: true,
        count: formattedStudents.length,
        data: formattedStudents
      });
    }

    // POST: Create new student
    if (req.method === 'POST') {
      const {
        name,
        rollNo,
        courseType,
        courseDivision,
        year,
        batch,
        dob,
        bloodGroup,
        fatherName,
        motherName,
        contact1,
        contact2,
        address,
        aadharNumber,
        photoUrl,
        status = 'active'
      } = req.body;

      // Validation
      if (!name || !rollNo || !courseType || !year || !dob) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, rollNo, courseType, year, dob'
        });
      }

      // Check if roll number already exists
      const existing = await sql`
        SELECT id FROM students WHERE roll_no = ${rollNo}
      `;

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Student with this roll number already exists'
        });
      }

      // Insert new student
      const result = await sql`
        INSERT INTO students (
          name, roll_no, course_type, course_division, year, batch,
          dob, blood_group, father_name, mother_name, contact1, contact2,
          address, aadhar_number, photo_url, status
        ) VALUES (
          ${name}, ${rollNo}, ${courseType}, ${courseDivision || null}, ${year}, ${batch || null},
          ${dob}, ${bloodGroup || null}, ${fatherName || null}, ${motherName || null},
          ${contact1 || null}, ${contact2 || null}, ${address || null},
          ${aadharNumber || null}, ${photoUrl || null}, ${status}
        )
        RETURNING *
      `;

      const newStudent = toCamelCase(result[0]);

      return res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: newStudent
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
