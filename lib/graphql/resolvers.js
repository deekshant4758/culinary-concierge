// lib/graphql/resolvers.js
import { GraphQLError } from 'graphql';
import { prisma } from '../prisma.js';
import { canPerform } from '../auth.js';
import { calculateOrderTotal } from '../pricing.js';

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
  return { OR: [{ userId: user.id }, { sharedWithUserId: user.id }] };
}

function canViewOrder(user, order) {
  if (!user || !order) return false;
  if (user.role === 'admin') return true;
  if (order.userId === user.id || order.sharedWithUserId === user.id) return true;
  if (user.role === 'manager') return order.region === user.region;
  return false;
}

function canEditDraft(user, order) {
  if (!user || !order) return false;
  if (user.role === 'admin') return true;
  return order.userId === user.id || order.sharedWithUserId === user.id;
}

// Serialise Prisma Decimal → plain number for GraphQL Float
function num(val) {
  return val == null ? 0 : parseFloat(val.toString());
}

async function saveDraftOrderForUser(user, restaurantId, items, draftOrderId = null) {
  requireAuth(user);

  let actor = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, region: true },
  });
  if (!actor && user.email) {
    actor = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, role: true, region: true },
    });
  }
  if (!actor) {
    throw new GraphQLError('Your session is no longer valid. Please sign in again.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  if (!canPerform(actor, 'create_order')) {
    throw new GraphQLError('Permission denied: cannot create_order.', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !restaurant.isActive)
    throw new GraphQLError('Restaurant not found.', { extensions: { code: 'NOT_FOUND' } });
  if (actor.role !== 'admin' && restaurant.region !== actor.region)
    throw new GraphQLError('Cannot order from a different region.', { extensions: { code: 'FORBIDDEN' } });

  return prisma.$transaction(async (tx) => {
    const existingDraft = await tx.order.findFirst({
      where: draftOrderId
        ? { id: draftOrderId, restaurantId: restaurant.id, status: 'draft' }
        : {
            restaurantId: restaurant.id,
            status: 'draft',
            OR: [{ userId: actor.id }, { sharedWithUserId: actor.id }],
          },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDraft && !canEditDraft(actor, existingDraft)) {
      throw new GraphQLError('You cannot edit this draft.', { extensions: { code: 'FORBIDDEN' } });
    }

    if (!items.length) {
      if (!existingDraft) return null;
      await tx.order.delete({ where: { id: existingDraft.id } });
      return null;
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await tx.menuItem.findMany({ where: { id: { in: menuItemIds } } });
    const menuMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));

    let orderSubtotal = 0;
    const itemData = items.map((i) => {
      const menuItem = menuMap[i.menuItemId];
      if (!menuItem) {
        throw new GraphQLError(`Menu item ${i.menuItemId} not found.`, { extensions: { code: 'NOT_FOUND' } });
      }
      if (!menuItem.isAvailable) {
        throw new GraphQLError(`${menuItem.name} is no longer available.`, { extensions: { code: 'BAD_REQUEST' } });
      }
      if (menuItem.restaurantId !== restaurant.id) {
        throw new GraphQLError('All items must belong to the selected restaurant.', { extensions: { code: 'BAD_REQUEST' } });
      }
      if (!Number.isInteger(i.quantity) || i.quantity < 1) {
        throw new GraphQLError('Item quantity must be at least 1.', { extensions: { code: 'BAD_REQUEST' } });
      }

      const subtotal = num(menuItem.price) * i.quantity;
      orderSubtotal += subtotal;
      return {
        menuItemId: menuItem.id,
        quantity: i.quantity,
        unitPrice: menuItem.price,
        subtotal,
      };
    });

    const total = calculateOrderTotal(orderSubtotal);

    if (existingDraft) {
      return tx.order.update({
        where: { id: existingDraft.id },
        data: {
          totalAmount: total,
          paymentMethodId: null,
          placedAt: null,
          items: {
            deleteMany: {},
            create: itemData,
          },
        },
        include: { restaurant: true, user: true, items: { include: { menuItem: true } } },
      });
    }

    return tx.order.create({
      data: {
        userId: actor.id,
        restaurantId: restaurant.id,
        region: restaurant.region,
        totalAmount: total,
        status: 'draft',
        items: { create: itemData },
      },
      include: { restaurant: true, user: true, items: { include: { menuItem: true } } },
    });
  });
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
    sharedWithUser: (o) => o.sharedWithUserId
      ? (o.sharedWithUser ?? prisma.user.findUnique({ where: { id: o.sharedWithUserId } }))
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
        include: { restaurant: true, user: true, sharedWithUser: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
      if (!o) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      if (!canViewOrder(user, o)) throw new GraphQLError('Access denied.', { extensions: { code: 'FORBIDDEN' } });
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

    saveDraftOrder: async (_, { restaurantId, items, draftOrderId }, { user }) => (
      saveDraftOrderForUser(user, restaurantId, items, draftOrderId)
    ),

    createOrder: async (_, { restaurantId, items, draftOrderId }, { user }) => {
      const draft = await saveDraftOrderForUser(user, restaurantId, items, draftOrderId);
      if (!draft) {
        throw new GraphQLError('Add at least one item before saving the order.', { extensions: { code: 'BAD_REQUEST' } });
      }
      return draft;
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
        include: { restaurant: true, user: true, sharedWithUser: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
    },

    shareDraftOrder: async (_, { id, userId }, { user }) => {
      requireAuth(user);

      const order = await prisma.order.findUnique({
        where: { id },
        include: { user: true, sharedWithUser: true },
      });
      if (!order) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      if (order.status !== 'draft') {
        throw new GraphQLError('Only draft orders can be shared.', { extensions: { code: 'BAD_REQUEST' } });
      }
      if (user.role !== 'admin' && order.userId !== user.id) {
        throw new GraphQLError('Only the draft owner or an admin can share this cart.', { extensions: { code: 'FORBIDDEN' } });
      }
      if (userId === order.userId) {
        throw new GraphQLError('You cannot invite the owner as a collaborator.', { extensions: { code: 'BAD_REQUEST' } });
      }

      const invitedUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!invitedUser) {
        throw new GraphQLError('Invited user not found.', { extensions: { code: 'NOT_FOUND' } });
      }
      if (invitedUser.role !== 'admin' && invitedUser.region !== order.region) {
        throw new GraphQLError('You can only invite a same-region user or an admin.', { extensions: { code: 'BAD_REQUEST' } });
      }

      return prisma.order.update({
        where: { id },
        data: { sharedWithUserId: invitedUser.id },
        include: { restaurant: true, user: true, sharedWithUser: true, paymentMethod: true, items: { include: { menuItem: true } } },
      });
    },

    removeDraftShare: async (_, { id }, { user }) => {
      requireAuth(user);

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new GraphQLError('Order not found.', { extensions: { code: 'NOT_FOUND' } });
      if (order.status !== 'draft') {
        throw new GraphQLError('Only draft orders can be updated.', { extensions: { code: 'BAD_REQUEST' } });
      }
      if (user.role !== 'admin' && order.userId !== user.id) {
        throw new GraphQLError('Only the draft owner or an admin can remove collaborators.', { extensions: { code: 'FORBIDDEN' } });
      }

      return prisma.order.update({
        where: { id },
        data: { sharedWithUserId: null },
        include: { restaurant: true, user: true, sharedWithUser: true, paymentMethod: true, items: { include: { menuItem: true } } },
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
