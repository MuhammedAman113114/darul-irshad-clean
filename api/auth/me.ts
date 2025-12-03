// GET /api/auth/me - Get current user
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = sessionCookie.split('=')[1];
    const session = JSON.parse(Buffer.from(sessionData, 'base64').toString());

    return res.status(200).json(session);
  } catch (error: any) {
    console.error('Auth check error:', error);
    return res.status(401).json({ error: 'Invalid session', message: error.message });
  }
}
