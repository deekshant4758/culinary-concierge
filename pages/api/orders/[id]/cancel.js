// pages/api/orders/[id]/cancel.js
import { getUserFromRequest, canPerform } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!canPerform(user, 'cancel_order')) {
    return res.status(403).json({ error: 'Only Admins and Managers can cancel orders.' });
  }

  const { id } = req.query;
  const [order] = await query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // ABAC: managers can only cancel orders in their region
  if (user.role === 'manager' && order.region !== user.region) {
    return res.status(403).json({ error: 'You can only cancel orders in your region.' });
  }

  if (!['draft', 'placed', 'processing'].includes(order.status)) {
    return res.status(400).json({ error: 'This order cannot be cancelled.' });
  }

  await query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [id]);
  const [updated] = await query('SELECT * FROM orders WHERE id = ?', [id]);
  return res.status(200).json({ order: updated });
}
