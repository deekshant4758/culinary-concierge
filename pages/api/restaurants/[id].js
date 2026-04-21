// pages/api/restaurants/[id].js
import { getUserFromRequest } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const [restaurant] = await query('SELECT * FROM restaurants WHERE id = ? AND is_active = 1', [id]);
  if (!restaurant) return res.status(404).json({ error: 'Not found' });

  // ABAC region check
  if (user.role !== 'admin' && restaurant.region !== user.region) {
    return res.status(403).json({ error: 'Access denied to this region.' });
  }

  const menuItems = await query('SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY category', [id]);
  return res.status(200).json({ restaurant, menuItems });
}
