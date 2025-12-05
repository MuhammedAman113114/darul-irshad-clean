import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with more robust settings
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = "password";
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;

// Check if DATABASE_URL is set, if not use JSON storage mode
const DATABASE_URL = process.env.DATABASE_URL;
// Check if it's a placeholder/example URL
const isPlaceholder = !DATABASE_URL || 
  DATABASE_URL === 'postgresql://username:password@host:5432/database_name' ||
  DATABASE_URL.includes('@host:5432') ||
  DATABASE_URL === 'postgresql://username:password@host:5432/database_name?sslmode=require';
const USE_JSON_STORAGE = isPlaceholder;

if (USE_JSON_STORAGE) {
  console.warn('⚠️  DATABASE_URL not configured. Running in JSON storage mode.');
  console.warn('⚠️  Data will be stored in db.json file.');
  console.warn('⚠️  For production, configure DATABASE_URL in .env file.');
}

// Create connection pool with retry configuration (only if DATABASE_URL is valid)
export const pool = USE_JSON_STORAGE ? null : new Pool({ 
  connectionString: DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  allowExitOnIdle: false
});

export const db = USE_JSON_STORAGE ? null : drizzle({ client: pool!, schema });

// Add connection error handling
if (pool) {
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('Database connected successfully');
  });
}

export { USE_JSON_STORAGE };
