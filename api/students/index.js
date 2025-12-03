// GET /api/students - List students with filters
// POST /api/students - Create new student
import { getStudents, createStudent } from '../../server/json-storage.js';

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

  if (req.method === 'GET') {
    try {
      const { courseType, year, courseDivision, batch, status } = req.query;
      
      const filters = {};
      if (courseType) filters.courseType = courseType;
      if (year) filters.year = year;
      if (courseDivision) filters.courseDivision = courseDivision;
      if (batch) filters.batch = batch;
      if (status) filters.status = status;
      
      const students = await getStudents(filters);
      return res.status(200).json(students);
    } catch (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({ error: 'Failed to fetch students', message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const studentData = req.body;
      const newStudent = await createStudent(studentData);
      return res.status(201).json(newStudent);
    } catch (error) {
      console.error('Error creating student:', error);
      return res.status(500).json({ error: 'Failed to create student', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
