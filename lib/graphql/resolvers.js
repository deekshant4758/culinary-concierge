// lib/graphql/resolvers.js
import { GraphQLError } from 'graphql';
import { prisma } from '../prisma.js';
import { canPerform } from '../auth.js';

// ── helpers ────────────────────────────────────────────────────────────────

function requireAuth(user) {
  if (!user) throw new GraphQLError('Not authenticated.', { extensions: { code: 'UNAUTHENTICATED' } });
}

function requirePermission(user, action) {
  requireAuth(user);
  if (!canPerform(user, action))
    throw new GraphQLError(`Permission denied: cannot ${action}.`, { extensions: { code: 'FORBIDDEN' } });
}

// Region filter for non-admin users
function regionWhere(user) {
  if (user.role === 'admin') return {};
  return { region: user.region === 'global' ? undefined : user.region };
}

// Order visibility filter based on role
function orderWhere(user) {
  if (user.role === 'admin')   return {};
  if (user.role === 'manager') return { region: user.region };
  return { userId: user.id };   // member sees only own orders
}

// Serialise Prisma Decimal → plain number for GraphQL Float
function num(val) {
  return val == null ? 0 : parseFloat(val.toString());
}

// ── resolvers ─────────────────────────────────────────────────────────────

export const resolvers = {

  // ── Field resolvers (Decimal → Float) ───────────────────────────────────
  Restaurant: {
    rating:    (r) => num(r.rating),
    menuItems: (r) => r.menuItems ?? prisma.menuItem.findMany({ where: { restaurantId: r.id, isAvailable: true } }),
  },

  MenuItem: {
    price:      (m) => num(m.price),
    restaurant: (m) => m.restaurant ?? prisma.restaurant.findUnique({ where: { id: m.restaurantId } }),
  },

  OrderItem: {
    unitPrice: (oi) => num(oi.unitPrice),
    subtotal:  (oi) => num(oi.subtotal),
    menuItem:  (oi) => oi.menuItem ?? prisma.menuItem.findUnique({ where: { id: oi.menuItemId } }),
  },

  Order: {
    totalAmount:   (o) => num(o.totalAmount),
    user:          (o) => o.user          ?? prisma.user.findUnique({ where: { id: o.userId } }),
    restaurant:    (o) => o.restaurant    ?? prisma.restaurant.findUnique({ where: { id: o.restaurantId } }),
    paymentMethod: (o) => o.paymentMethodId
      ? (o.paymentMethod ?? prisma.paymentMethod.findUnique({ where: { id: o.paymentMethodId } }))
      : null,
    items:         (o) => o.items ?? prisma.orderItem.findMany({
      where: { orderId: o.id },
      include: { menuItem: true },
    }),
  },

  // ── Query ────────────────────────────────────────────────────────────────
  Query: {

    restaurants: async (_, __, { user }) => {
      requirePermission(user, 'view_restaurants');
      return prisma.restaurant.findMany({
        where: { isActive: true, ...regionWhere(user) },
        orderBy: { rating: 'desc' },
        include: { menuItems: { where: { isAvailable: true } } },
      });
    },

    restaurant: async (_, { id }, { user }) => {
      requirePermission(user, 'view_restaurants');
      const r = await prisma.restaurant.findUnique({
        where: { id },
        include: { menuItems: { where: { isAvailable: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      });
      if (!r || !r.isActive) throw new GraphQLError('Restaurant not found.', { extensions: { code: 'NOT_FOUND' } });
      // ABAC region check
      if (user.role !== 'admin' && r.region !== user.region)
        throw new GraphQLError('Access denied to this region.', { extensions: { code: 'FORBIDDEN' } });
      return r;
    },

    orders: async (_, __, { user }) => {
      requireAuth(user);
      return prisma.order.findMany({
        where: orderWhere(user),
        orderBy: { createdAt: 'desc' },
        include: { restaurant: true, user: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
    },

    order: async (_, { id }, { user }) => {
      requireAuth(user);
      const o = await prisma.order.findUnique({
        where: { id },
        include: { restaurant: true, user: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
      if (!o) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      // ABAC
      if (user.role === 'member'  && o.userId !== user.id)    throw new GraphQLError('Access denied.', { extensions: { code: 'FORBIDDEN' } });
      if (user.role === 'manager' && o.region !== user.region) throw new GraphQLError('Access denied.', { extensions: { code: 'FORBIDDEN' } });
      return o;
    },

    dashboardStats: async (_, __, { user }) => {
      requireAuth(user);
      const where = orderWhere(user);
      const rWhere = user.role === 'admin' ? { isActive: true } : { isActive: true, region: user.region };

      const [totalOrders, activeOrders, restaurants, spent] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({ where: { ...where, status: { in: ['placed', 'processing', 'delivering'] } } }),
        prisma.restaurant.count({ where: rWhere }),
        prisma.order.aggregate({ where: { ...where, status: { not: 'cancelled' } }, _sum: { totalAmount: true } }),
      ]);

      return {
        totalOrders,
        activeOrders,
        restaurants,
        totalSpent: num(spent._sum.totalAmount),
      };
    },

    paymentMethods: async (_, __, { user }) => {
      requirePermission(user, 'update_payment');
      return prisma.paymentMethod.findMany({
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
      });
    },
  },

  // ── Mutation ─────────────────────────────────────────────────────────────
  Mutation: {

    createOrder: async (_, { restaurantId, items }, { user }) => {
      requirePermission(user, 'create_order');

      // Verify the user from JWT still exists in DB (stale token after re-seed)
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new GraphQLError('Session expired. Please log out and log in again.', { extensions: { code: 'UNAUTHENTICATED' } });

      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      if (!restaurant || !restaurant.isActive)
        throw new GraphQLError('Restaurant not found.', { extensions: { code: 'NOT_FOUND' } });
      if (user.role !== 'admin' && restaurant.region !== user.region)
        throw new GraphQLError('Cannot order from a different region.', { extensions: { code: 'FORBIDDEN' } });

      // Fetch all menu items in one query
      const menuItemIds = items.map(i => i.menuItemId);
      const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });
      const menuMap = Object.fromEntries(menuItems.map(m => [m.id, m]));

      let total = 0;
      const itemData = items.map(i => {
        const mi = menuMap[i.menuItemId];
        if (!mi) throw new GraphQLError(`Menu item ${i.menuItemId} not found.`, { extensions: { code: 'NOT_FOUND' } });
        const subtotal = num(mi.price) * i.quantity;
        total += subtotal;
        return { menuItemId: mi.id, quantity: i.quantity, unitPrice: mi.price, subtotal };
      });

      // Create order + items in one transaction
      return prisma.order.create({
        data: {
          userId:       user.id,
          restaurantId: restaurant.id,
          region:       restaurant.region,
          totalAmount:  total,
          status:       'draft',
          items:        { create: itemData },
        },
        include: { restaurant: true, user: true, items: { include: { menuItem: true } } },
      });
    },

    placeOrder: async (_, { id, paymentMethodId }, { user }) => {
      requirePermission(user, 'place_order');

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      if (user.role === 'manager' && order.region !== user.region)
        throw new GraphQLError('Cannot place orders in a different region.', { extensions: { code: 'FORBIDDEN' } });
      if (order.status !== 'draft')
        throw new GraphQLError('Only draft orders can be placed.', { extensions: { code: 'BAD_REQUEST' } });

      return prisma.order.update({
        where: { id },
        data: { status: 'placed', paymentMethodId, placedAt: new Date() },
        include: { restaurant: true, user: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
    },

    cancelOrder: async (_, { id }, { user }) => {
      requirePermission(user, 'cancel_order');

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      if (user.role === 'manager' && order.region !== user.region)
        throw new GraphQLError('Cannot cancel orders in a different region.', { extensions: { code: 'FORBIDDEN' } });
      if (!['draft', 'placed', 'processing'].includes(order.status))
        throw new GraphQLError('This order cannot be cancelled.', { extensions: { code: 'BAD_REQUEST' } });

      return prisma.order.update({
        where: { id },
        data: { status: 'cancelled' },
        include: { restaurant: true, user: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
    },

    createPaymentMethod: async (_, { input }, { user }) => {
      requirePermission(user, 'update_payment');
      return prisma.paymentMethod.create({ data: input });
    },

    updatePaymentMethod: async (_, { id, input }, { user }) => {
      requirePermission(user, 'update_payment');
      return prisma.paymentMethod.update({ where: { id }, data: input });
    },

    deletePaymentMethod: async (_, { id }, { user }) => {
      requirePermission(user, 'update_payment');
      await prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
      return true;
    },
  },
};