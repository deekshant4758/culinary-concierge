// pages/api/payment-methods/index.js
import { getUserFromRequest, canPerform } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!canPerform(user, 'update_payment')) {
    return res.status(403).json({ error: 'Only Admins can manage payment methods.' });
  }

  if (req.method === 'GET') {
    const methods = await query('SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY is_primary DESC');
    return res.status(200).json({ methods });
  }

  if (req.method === 'POST') {
    const { label, type, last_four, cardholder_name, expiry, region } = req.body;
    if (!label || !type || !region) return res.status(400).json({ error: 'label, type, and region are required.' });

    const [result] = await query(
      `INSERT INTO payment_methods (label, type, last_four, cardholder_name, expiry, region) VALUES (?, ?, ?, ?, ?, ?)`,
      [label, type, last_four || null, cardholder_name || null, expiry || null, region]
    );
    const [pm] = await query('SELECT * FROM payment_methods WHERE id = ?', [result.insertId]);
    return res.status(201).json({ paymentMethod: pm });
  }

  return res.status(405).end();
}
