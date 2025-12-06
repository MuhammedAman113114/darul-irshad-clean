// Consolidated Auth API
// POST /api/auth - Login (with action=login in body)
// GET /api/auth - Get current user (me)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/auth - Get current user (me)
    if (req.method === 'GET') {
      const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
      
      if (!sessionCookie) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionData = sessionCookie.split('=')[1];
      const session = JSON.parse(Buffer.from(sessionData, 'base64').toString());

      return res.status(200).json(session);
    }

    // POST /api/auth - Login
    if (req.method === 'POST') {
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
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed', message: error.message });
  }
}
