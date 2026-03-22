// pages/api/auth/login.js
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { signToken } from '../../../lib/auth.js';
import { prisma } from '../../../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = signToken({
    id: user.id, name: user.name, email: user.email,
    role: user.role, region: user.region,
  });

  res.setHeader('Set-Cookie', serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }));

  return res.status(200).json({
    user: { id: user.id, name: user.name, role: user.role, region: user.region },
  });
}
