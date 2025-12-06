// GET /api/students - List students with filters
// POST /api/students - Create new student
// PATCH /api/students - Update student (including photo upload)
import { neon } from '@neondatabase/serverless';
import { uploadStudentPhoto, deleteStudentPhoto } from '../lib/cloudinary.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
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
      const { courseType, year, courseDivision, batch, section, status } = req.query;
      
      // Accept both 'batch' and 'section' parameters (they mean the same thing)
      const sectionFilter = batch || section;
      
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
      if (sectionFilter) {
        query += ` AND batch = $${paramIndex++}`;
        params.push(sectionFilter);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      query += ' ORDER BY id DESC';
      
      const students = await sql(query, params);
      
      // Convert to camelCase for frontend
      const camelCaseStudents = students.map(toCamelCase);
      
      return res.status(200).json(camelCaseStudents);
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
          ${name}, ${rollNo}, ${courseType}, ${courseDivision || null}, ${year}, ${batch || null},
          ${dob || null}, ${bloodGroup || null}, ${fatherName || null}, ${motherName || null}, 
          ${contact1 || null}, ${contact2 || null}, ${address || null}, ${aadharNumber || null}, 
          ${photoUrl || null}, ${status || 'active'}, NOW()
        ) RETURNING *
      `;
      
      const newStudent = toCamelCase(result[0]);
      
      return res.status(201).json(newStudent);
    }

    if (req.method === 'PATCH') {
      const { id, photoBase64, photoContentType, deletePhoto, ...updateFields } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Handle photo upload to Cloudinary
      if (photoBase64 && photoContentType) {
        try {
          // Convert base64 to buffer
          const photoBuffer = Buffer.from(photoBase64, 'base64');
          
          // Upload to Cloudinary
          const photoUrl = await uploadStudentPhoto(id, photoBuffer, photoContentType);
          
          // Update student record with photo URL
          await sql`
            UPDATE students 
            SET photo_url = ${photoUrl}, updated_at = NOW()
            WHERE id = ${id}
          `;
          
          return res.status(200).json({ 
            success: true, 
            photoUrl,
            message: 'Photo uploaded successfully' 
          });
        } catch (error) {
          console.error('Photo upload error:', error);
          return res.status(500).json({ 
            error: 'Failed to upload photo', 
            message: error.message 
          });
        }
      }

      // Handle photo deletion
      if (deletePhoto) {
        try {
          await deleteStudentPhoto(id);
          await sql`
            UPDATE students 
            SET photo_url = NULL, updated_at = NOW()
            WHERE id = ${id}
          `;
          
          return res.status(200).json({ 
            success: true, 
            message: 'Photo deleted successfully' 
          });
        } catch (error) {
          console.error('Photo deletion error:', error);
          return res.status(500).json({ 
            error: 'Failed to delete photo', 
            message: error.message 
          });
        }
      }

      // Handle general field updates
      if (Object.keys(updateFields).length > 0) {
        try {
          const setClauses = [];
          const values = [];
          let paramIndex = 1;
          
          // Convert camelCase to snake_case and build SET clause
          for (const [key, value] of Object.entries(updateFields)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex++}`);
            values.push(value);
          }
          
          // Add updated_at
          setClauses.push(`updated_at = NOW()`);
          
          // Add id for WHERE clause
          values.push(id);
          const query = `UPDATE students SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
          
          const result = await sql(query, values);
          
          if (result.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
          }
          
          return res.status(200).json(toCamelCase(result[0]));
        } catch (error) {
          console.error('Update error:', error);
          return res.status(500).json({ 
            error: 'Failed to update student', 
            message: error.message 
          });
        }
      }

      return res.status(400).json({ error: 'No update data provided' });
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
