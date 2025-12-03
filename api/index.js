// Vercel Serverless Function Entry Point
import('../dist/index.js').then(module => {
  // Export the Express app as a serverless function
  module.default;
}).catch(err => {
  console.error('Failed to load server:', err);
});
