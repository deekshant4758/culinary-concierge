// lib/graphql/schema.js
import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # ── Enums ──────────────────────────────────────────────
  enum Role       { admin manager member }
  enum Region     { india america global }
  enum RestRegion { india america }
  enum OrderStatus {
    draft placed processing delivering delivered cancelled
  }
  enum PayType { card bank upi }

  # ── Scalars / shared ───────────────────────────────────
  scalar DateTime

  # ── Types ──────────────────────────────────────────────
  type User {
    id: Int!
    name: String!
    email: String!
    role: Role!
    region: Region!
    createdAt: DateTime!
  }

  type Restaurant {
    id: Int!
    name: String!
    description: String
    cuisine: String
    region: RestRegion!
    city: String
    rating: Float!
    imageUrl: String
    isActive: Boolean!
    menuItems: [MenuItem!]!
  }

  type MenuItem {
    id: Int!
    restaurantId: Int!
    name: String!
    description: String
    price: Float!
    category: String
    isVegetarian: Boolean!
    isAvailable: Boolean!
    imageUrl: String
    restaurant: Restaurant!
  }

  type PaymentMethod {
    id: Int!
    label: String!
    type: PayType!
    lastFour: String
    cardholderName: String
    expiry: String
    region: Region!
    isPrimary: Boolean!
    isActive: Boolean!
  }

  type OrderItem {
    id: Int!
    quantity: Int!
    unitPrice: Float!
    subtotal: Float!
    menuItem: MenuItem!
  }

  type Order {
    id: Int!
    status: OrderStatus!
    totalAmount: Float!
    region: RestRegion!
    notes: String
    placedAt: DateTime
    createdAt: DateTime!
    user: User!
    sharedWithUser: User
    restaurant: Restaurant!
    paymentMethod: PaymentMethod
    items: [OrderItem!]!
  }

  type DashboardStats {
    totalOrders: Int!
    activeOrders: Int!
    restaurants: Int!
    totalSpent: Float!
  }

  # ── Inputs ─────────────────────────────────────────────
  input OrderItemInput {
    menuItemId: Int!
    quantity: Int!
  }

  input PaymentMethodInput {
    label: String!
    type: PayType!
    lastFour: String
    cardholderName: String
    expiry: String
    region: Region!
  }

  # ── Query ──────────────────────────────────────────────
  type Query {
    # Restaurants — region-locked for non-admin
    restaurants: [Restaurant!]!
    restaurant(id: Int!): Restaurant

    # Orders — role + region filtered
    orders: [Order!]!
    order(id: Int!): Order

    # Dashboard stats
    dashboardStats: DashboardStats!

    # Payment methods — admin only
    paymentMethods: [PaymentMethod!]!
  }

  # ── Mutation ───────────────────────────────────────────
  type Mutation {
    # Orders
    saveDraftOrder(draftOrderId: Int, restaurantId: Int!, items: [OrderItemInput!]!): Order
    createOrder(draftOrderId: Int, restaurantId: Int!, items: [OrderItemInput!]!): Order!
    placeOrder(id: Int!, paymentMethodId: Int!): Order!
    cancelOrder(id: Int!): Order!
    shareDraftOrder(id: Int!, userId: Int!): Order!
    removeDraftShare(id: Int!): Order!

    # Payment methods — admin only
    createPaymentMethod(input: PaymentMethodInput!): PaymentMethod!
    updatePaymentMethod(id: Int!, input: PaymentMethodInput!): PaymentMethod!
    deletePaymentMethod(id: Int!): Boolean!
  }
`;
