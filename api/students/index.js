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

    if (req.method === 'PATCH') {
      const { id, photoUrl, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      console.log(`Updating student ${id}:`, { photoUrl, ...updateData });

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (photoUrl !== undefined) {
        updates.push(`photo_url = $${paramIndex++}`);
        values.push(photoUrl);
      }
      if (updateData.name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      if (updateData.rollNo) {
        updates.push(`roll_no = $${paramIndex++}`);
        values.push(updateData.rollNo);
      }
      if (updateData.dob) {
        updates.push(`dob = $${paramIndex++}`);
        values.push(updateData.dob);
      }
      if (updateData.bloodGroup) {
        updates.push(`blood_group = $${paramIndex++}`);
        values.push(updateData.bloodGroup);
      }
      if (updateData.fatherName) {
        updates.push(`father_name = $${paramIndex++}`);
        values.push(updateData.fatherName);
      }
      if (updateData.motherName) {
        updates.push(`mother_name = $${paramIndex++}`);
        values.push(updateData.motherName);
      }
      if (updateData.contact1) {
        updates.push(`contact_1 = $${paramIndex++}`);
        values.push(updateData.contact1);
      }
      if (updateData.contact2) {
        updates.push(`contact_2 = $${paramIndex++}`);
        values.push(updateData.contact2);
      }
      if (updateData.address) {
        updates.push(`address = $${paramIndex++}`);
        values.push(updateData.address);
      }
      if (updateData.aadharNumber) {
        updates.push(`aadhar_number = $${paramIndex++}`);
        values.push(updateData.aadharNumber);
      }
      if (updateData.status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      const query = `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await sql(query, values);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const updatedStudent = toCamelCase(result[0]);
      console.log('Student updated:', updatedStudent);
      
      return res.status(200).json(updatedStudent);
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
