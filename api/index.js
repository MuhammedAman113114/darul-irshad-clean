// Vercel Serverless Function - Entry Point
import app from '../dist/index.js';

export default function handler(req, res) {
  // Handle the request with the Express app
  return app(req, res);
}
