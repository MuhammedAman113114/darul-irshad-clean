// GET /api/auth/me - Get current user
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    return res.status(200).json({ user: session.user });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
