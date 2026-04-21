// pages/api/orders/index.js
import { getUserFromRequest, canPerform } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // List orders based on role
    let sql, params;
    if (user.role === 'admin') {
      sql = `SELECT o.*, r.name as restaurant_name FROM orders o JOIN restaurants r ON o.restaurant_id = r.id ORDER BY o.created_at DESC`;
      params = [];
    } else if (user.role === 'manager') {
      sql = `SELECT o.*, r.name as restaurant_name FROM orders o JOIN restaurants r ON o.restaurant_id = r.id WHERE o.region = ? ORDER BY o.created_at DESC`;
      params = [user.region];
    } else {
      sql = `SELECT o.*, r.name as restaurant_name FROM orders o JOIN restaurants r ON o.restaurant_id = r.id WHERE o.user_id = ? ORDER BY o.created_at DESC`;
      params = [user.id];
    }
    const orders = await query(sql, params);
    return res.status(200).json({ orders });
  }

  if (req.method === 'POST') {
    if (!canPerform(user, 'create_order')) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const { restaurant_id, items } = req.body;
    if (!restaurant_id || !items?.length) {
      return res.status(400).json({ error: 'restaurant_id and items are required.' });
    }

    // Fetch restaurant and verify region access
    const [restaurant] = await query('SELECT * FROM restaurants WHERE id = ?', [restaurant_id]);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    if (user.role !== 'admin' && restaurant.region !== user.region) {
      return res.status(403).json({ error: 'You cannot order from this region.' });
    }

    // Calculate totals
    const itemIds = items.map(i => i.menu_item_id);
    const menuItems = await query(`SELECT * FROM menu_items WHERE id IN (${itemIds.map(() => '?').join(',')})`, itemIds);
    const menuMap = Object.fromEntries(menuItems.map(m => [m.id, m]));

    let total = 0;
    const orderItems = items.map(i => {
      const mi = menuMap[i.menu_item_id];
      if (!mi) throw new Error(`Menu item ${i.menu_item_id} not found`);
      const subtotal = parseFloat(mi.price) * i.quantity;
      total += subtotal;
      return { menu_item_id: mi.id, quantity: i.quantity, unit_price: mi.price, subtotal };
    });

    // Create order
    const [result] = await query(
      `INSERT INTO orders (user_id, restaurant_id, status, total_amount, region) VALUES (?, ?, 'draft', ?, ?)`,
      [user.id, restaurant_id, total.toFixed(2), restaurant.region]
    );
    const orderId = result.insertId;

    // Insert order items
    for (const oi of orderItems) {
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`,
        [orderId, oi.menu_item_id, oi.quantity, oi.unit_price, oi.subtotal]
      );
    }

    const [order] = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    return res.status(201).json({ order });
  }

  return res.status(405).end();
}
