// Vercel Serverless Function Wrapper for Express
// This file wraps the Express app to work with Vercel's serverless platform

export default async function handler(req, res) {
  // Set VERCEL environment variable
  process.env.VERCEL = '1';
  process.env.NODE_ENV = 'production';
  
  // Import and initialize the app
  const { default: createApp } = await import('../dist/server-wrapper.js');
  const app = await createApp();
  
  // Handle the request
  return app(req, res);
}
