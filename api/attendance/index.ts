// GET /api/attendance - Fetch attendance records
// POST /api/attendance - Record attendance
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { attendance, students } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { date, courseType, year, section, period } = req.query;
      
      const conditions = [];
      if (date) conditions.push(eq(attendance.date, date as string));
      if (courseType) conditions.push(eq(attendance.courseType, courseType as string));
      if (year) conditions.push(eq(attendance.batchYear, year as string));
      if (section) conditions.push(eq(attendance.section, section as string));
      if (period) conditions.push(eq(attendance.period, parseInt(period as string)));
      
      const result = conditions.length > 0
        ? await db.select().from(attendance).where(and(...conditions))
        : await db.select().from(attendance);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  }

  if (req.method === 'POST') {
    try {
      const attendanceData = req.body;
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      const session = JSON.parse(Buffer.from(sessionCookie!.split('=')[1], 'base64').toString());
      
      attendanceData.createdBy = session.user.id;
      
      const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
      return res.status(201).json(newAttendance);
    } catch (error) {
      console.error('Error recording attendance:', error);
      return res.status(500).json({ error: 'Failed to record attendance' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
