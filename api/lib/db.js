// Neon PostgreSQL Database Connection
// Using @neondatabase/serverless for optimal Vercel performance

import { neon } from '@neondatabase/serverless';

// Get database URL from environment variable
const DATABASE_URL = process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

// Create SQL query function
export const sql = neon(DATABASE_URL);

// Helper function to execute queries with error handling
export async function query(text, params = []) {
  try {
    const result = await sql(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
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
    
    console.log('✅ Database tables initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Export for use in API routes
export default sql;
