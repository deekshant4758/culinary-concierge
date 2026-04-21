// pages/api/orders/[id]/place.js
import { getUserFromRequest, canPerform } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!canPerform(user, 'place_order')) {
    return res.status(403).json({ error: 'Only Admins and Managers can place orders.' });
  }

  const { id } = req.query;
  const { payment_method_id } = req.body;

  if (!payment_method_id) return res.status(400).json({ error: 'Payment method is required.' });

  const [order] = await query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // ABAC: managers can only place orders in their region
  if (user.role === 'manager' && order.region !== user.region) {
    return res.status(403).json({ error: 'You can only place orders in your region.' });
  }

  if (order.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft orders can be placed.' });
  }

  await query(
    `UPDATE orders SET status = 'placed', payment_method_id = ?, placed_at = NOW() WHERE id = ?`,
    [payment_method_id, id]
  );

  const [updated] = await query('SELECT * FROM orders WHERE id = ?', [id]);
  return res.status(200).json({ order: updated });
}
