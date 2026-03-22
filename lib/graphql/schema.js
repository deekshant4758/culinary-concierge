// lib/graphql/schema.js
// Plain string — explicit multi-line format for maximum parser compatibility

export const typeDefs = `
  enum Role {
    admin
    manager
    member
  }

  enum Region {
    india
    america
    global
  }

  enum RestRegion {
    india
    america
  }

  enum OrderStatus {
    draft
    placed
    processing
    delivering
    delivered
    cancelled
  }

  enum PayType {
    card
    bank
    upi
  }

  type User {
    id: Int!
    name: String!
    email: String!
    role: Role!
    region: Region!
    createdAt: String!
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
    placedAt: String
    createdAt: String!
    user: User!
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

  type Query {
    restaurants: [Restaurant!]!
    restaurant(id: Int!): Restaurant
    orders: [Order!]!
    order(id: Int!): Order
    dashboardStats: DashboardStats!
    paymentMethods: [PaymentMethod!]!
  }

  type Mutation {
    createOrder(restaurantId: Int!, items: [OrderItemInput!]!): Order!
    placeOrder(id: Int!, paymentMethodId: Int!): Order!
    cancelOrder(id: Int!): Order!
    createPaymentMethod(input: PaymentMethodInput!): PaymentMethod!
    updatePaymentMethod(id: Int!, input: PaymentMethodInput!): PaymentMethod!
    deletePaymentMethod(id: Int!): Boolean!
  }
`;