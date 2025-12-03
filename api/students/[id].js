// API Route: /api/students/[id]
// Methods: GET (one student), PUT (update), DELETE

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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  // Validate ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid student ID'
    });
  }

  try {
    // GET: Fetch single student by ID
    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM students WHERE id = ${id}
      `;

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      const student = toCamelCase(result[0]);

      return res.status(200).json({
        success: true,
        data: student
      });
    }

    // PUT: Update student
    if (req.method === 'PUT') {
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
        status
      } = req.body;

      // Check if student exists
      const existing = await sql`
        SELECT id FROM students WHERE id = ${id}
      `;

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      // Check if roll number is being changed and if it conflicts
      if (rollNo) {
        const rollConflict = await sql`
          SELECT id FROM students WHERE roll_no = ${rollNo} AND id != ${id}
        `;

        if (rollConflict.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Roll number already exists for another student'
          });
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }
      if (rollNo !== undefined) {
        updates.push(`roll_no = $${paramIndex}`);
        values.push(rollNo);
        paramIndex++;
      }
      if (courseType !== undefined) {
        updates.push(`course_type = $${paramIndex}`);
        values.push(courseType);
        paramIndex++;
      }
      if (courseDivision !== undefined) {
        updates.push(`course_division = $${paramIndex}`);
        values.push(courseDivision);
        paramIndex++;
      }
      if (year !== undefined) {
        updates.push(`year = $${paramIndex}`);
        values.push(year);
        paramIndex++;
      }
      if (batch !== undefined) {
        updates.push(`batch = $${paramIndex}`);
        values.push(batch);
        paramIndex++;
      }
      if (dob !== undefined) {
        updates.push(`dob = $${paramIndex}`);
        values.push(dob);
        paramIndex++;
      }
      if (bloodGroup !== undefined) {
        updates.push(`blood_group = $${paramIndex}`);
        values.push(bloodGroup);
        paramIndex++;
      }
      if (fatherName !== undefined) {
        updates.push(`father_name = $${paramIndex}`);
        values.push(fatherName);
        paramIndex++;
      }
      if (motherName !== undefined) {
        updates.push(`mother_name = $${paramIndex}`);
        values.push(motherName);
        paramIndex++;
      }
      if (contact1 !== undefined) {
        updates.push(`contact1 = $${paramIndex}`);
        values.push(contact1);
        paramIndex++;
      }
      if (contact2 !== undefined) {
        updates.push(`contact2 = $${paramIndex}`);
        values.push(contact2);
        paramIndex++;
      }
      if (address !== undefined) {
        updates.push(`address = $${paramIndex}`);
        values.push(address);
        paramIndex++;
      }
      if (aadharNumber !== undefined) {
        updates.push(`aadhar_number = $${paramIndex}`);
        values.push(aadharNumber);
        paramIndex++;
      }
      if (photoUrl !== undefined) {
        updates.push(`photo_url = $${paramIndex}`);
        values.push(photoUrl);
        paramIndex++;
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      // Add ID to values
      values.push(id);

      const query = `
        UPDATE students 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await sql(query, values);
      const updatedStudent = toCamelCase(result[0]);

      return res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent
      });
    }

    // DELETE: Delete student
    if (req.method === 'DELETE') {
      // Check if student exists
      const existing = await sql`
        SELECT id FROM students WHERE id = ${id}
      `;

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      // Delete student
      await sql`
        DELETE FROM students WHERE id = ${id}
      `;

      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
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
