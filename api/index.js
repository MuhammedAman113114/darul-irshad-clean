// Vercel Serverless Function - Entry Point
// This file imports the built Express server

export default async function handler(req, res) {
  // Import the built server
  const { default: app } = await import('../dist/index.js');
  
  // Handle the request with Express
  return app(req, res);
}
