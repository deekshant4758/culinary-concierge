// lib/auth.js
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getUserFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;
  return verifyToken(token);
}

// RBAC permission checker
export function canPerform(user, action) {
  const permissions = {
    admin: ['view_restaurants', 'create_order', 'place_order', 'cancel_order', 'update_payment'],
    manager: ['view_restaurants', 'create_order', 'place_order', 'cancel_order'],
    member: ['view_restaurants', 'create_order'],
  };
  return permissions[user.role]?.includes(action) ?? false;
}

// Region-based data filter
// Admin sees all; managers/members see only their region
export function getRegionFilter(user) {
  if (user.role === 'admin') return null; // No filter
  return user.region;
}
