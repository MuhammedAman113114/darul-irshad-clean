// Render.com API-only entry point - No frontend, no vite, just API
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cookieSession from 'cookie-session';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - Allow frontend from Vercel
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://darul-irshad-clean.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session management
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Import and register API routes dynamically (avoids TypeScript at startup)
const server = createServer(app);

// Dynamically import routes using tsx at runtime
import('tsx/esm').then(async () => {
  const { registerRoutes } = await import('./routes.ts');
  await registerRoutes(app);
  
  // Start server
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Frontend: ${process.env.FRONTEND_URL}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
