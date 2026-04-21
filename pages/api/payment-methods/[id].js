// pages/api/payment-methods/[id].js
import { getUserFromRequest, canPerform } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!canPerform(user, 'update_payment')) {
    return res.status(403).json({ error: 'Only Admins can manage payment methods.' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { label, type, last_four, cardholder_name, expiry, region } = req.body;
    await query(
      `UPDATE payment_methods SET label=?, type=?, last_four=?, cardholder_name=?, expiry=?, region=? WHERE id=?`,
      [label, type, last_four || null, cardholder_name || null, expiry || null, region, id]
    );
    const [pm] = await query('SELECT * FROM payment_methods WHERE id = ?', [id]);
    return res.status(200).json({ paymentMethod: pm });
  }

  if (req.method === 'DELETE') {
    await query('UPDATE payment_methods SET is_active = 0 WHERE id = ?', [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
