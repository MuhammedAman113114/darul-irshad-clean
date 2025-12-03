// POST /api/auth/login - User login
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Hardcoded credentials check
    if (username === 'darul001' && password === 'darul100') {
      // Set session cookie
      res.setHeader('Set-Cookie', `session=${Buffer.from(JSON.stringify({ user: { id: 1, username: 'darul001', name: 'Admin', role: 'teacher' } })).toString('base64')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      
      return res.status(200).json({
        user: {
          id: 1,
          username: 'darul001',
          name: 'Admin',
          role: 'teacher'
        }
      });
    }

    // Check database for other users
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    // Set session cookie
    res.setHeader('Set-Cookie', `session=${Buffer.from(JSON.stringify({ user: { id: user.id, username: user.username, name: user.name, role: user.role } })).toString('base64')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
