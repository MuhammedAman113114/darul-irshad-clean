// GET /api/students - List students with filters
// POST /api/students - Create new student
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { students } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check authentication
  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { courseType, year, courseDivision, batch, status } = req.query;
      
      let query = db.select().from(students);
      const conditions = [];
      
      if (courseType) conditions.push(eq(students.courseType, courseType as string));
      if (year) conditions.push(eq(students.year, year as string));
      if (courseDivision) conditions.push(eq(students.courseDivision, courseDivision as string));
      if (batch) conditions.push(eq(students.batch, batch as string));
      if (status) conditions.push(eq(students.status, status as string));
      
      const result = conditions.length > 0 
        ? await query.where(and(...conditions))
        : await query;
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  if (req.method === 'POST') {
    try {
      const studentData = req.body;
      const [newStudent] = await db.insert(students).values(studentData).returning();
      return res.status(201).json(newStudent);
    } catch (error) {
      console.error('Error creating student:', error);
      return res.status(500).json({ error: 'Failed to create student' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
