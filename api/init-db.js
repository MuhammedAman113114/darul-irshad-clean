// API Route: /api/init-db
// Initialize database tables (run once after deployment)

import { sql } from './lib/db.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Create students table
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        roll_no VARCHAR(50) NOT NULL UNIQUE,
        course_type VARCHAR(50) NOT NULL,
        course_division VARCHAR(50),
        year VARCHAR(10) NOT NULL,
        batch VARCHAR(10),
        dob DATE NOT NULL,
        blood_group VARCHAR(10),
        father_name VARCHAR(255),
        mother_name VARCHAR(255),
        contact1 VARCHAR(20),
        contact2 VARCHAR(20),
        address TEXT,
        aadhar_number VARCHAR(20),
        photo_url TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index on roll_no for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(roll_no)
    `;

    // Create index on course filters
    await sql`
      CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_type, year, course_division, batch)
    `;

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables: ['students'],
      indexes: ['idx_students_roll_no', 'idx_students_course']
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize database',
      message: error.message
    });
  }
}
