// POST /api/auth/login - User login
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Hardcoded credentials check
    if (username === 'darul001' && password === 'darul100') {
      const userData = {
        user: {
          id: 1,
          username: 'darul001',
          name: 'Admin',
          role: 'teacher'
        }
      };

      // Set session cookie
      const sessionData = Buffer.from(JSON.stringify(userData)).toString('base64');
      res.setHeader('Set-Cookie', `session=${sessionData}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure`);
      
      return res.status(200).json(userData);
    }

    return res.status(401).json({ error: 'Wrong username or password' });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed', message: error.message });
  }
}
