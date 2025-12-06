// PATCH /api/students/[id] - Update student by ID
// DELETE /api/students/[id] - Delete student by ID
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM students WHERE id = ${id}`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.status(200).json(toCamelCase(result[0]));
    }

    if (req.method === 'PATCH') {
      const { photoUrl, ...updateData } = req.body;

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

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM students WHERE id = ${id} RETURNING *`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      console.log(`Student ${id} deleted`);
      return res.status(200).json({ message: 'Student deleted successfully', student: toCamelCase(result[0]) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(`Student ${id} API error:`, error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message 
    });
  }
}
