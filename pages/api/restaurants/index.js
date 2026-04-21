// pages/api/restaurants/index.js
import { getUserFromRequest } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const params = user.role === 'admin' ? [] : [user.region];
  const filter = user.role === 'admin' ? '' : 'WHERE region = ?';
  const restaurants = await query(`SELECT * FROM restaurants ${filter} AND is_active = 1 ORDER BY rating DESC`, params);

  return res.status(200).json({ restaurants });
}
