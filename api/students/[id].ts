// GET /api/students/:id - Get student by ID
// PUT /api/students/:id - Update student
// DELETE /api/students/:id - Delete student
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { students } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check authentication
  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const studentId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const [student] = await db.select().from(students).where(eq(students.id, studentId));
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.status(200).json(student);
    } catch (error) {
      console.error('Error fetching student:', error);
      return res.status(500).json({ error: 'Failed to fetch student' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const updateData = req.body;
      const [updatedStudent] = await db
        .update(students)
        .set(updateData)
        .where(eq(students.id, studentId))
        .returning();
      
      if (!updatedStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.status(200).json(updatedStudent);
    } catch (error) {
      console.error('Error updating student:', error);
      return res.status(500).json({ error: 'Failed to update student' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await db.delete(students).where(eq(students.id, studentId));
      return res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Error deleting student:', error);
      return res.status(500).json({ error: 'Failed to delete student' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
