# 🍽️ Culinary Concierge

A full-stack enterprise food ordering web application built using **Next.js** and **MySQL**. Features role-based access control (RBAC), regional data isolation (Re-BAC), a GraphQL API powered by Apollo Server, Prisma ORM, and a Next.js frontend.

**Live Demo:** [culinary-concierge-xi.vercel.app](https://culinary-concierge-xi.vercel.app/)  
**GraphQL Playground:** `https://culinary-concierge-xi.vercel.app/api/graphql`  
**Repository:** [github.com/deekshant4758/culinary-concierge](https://github.com/deekshant4758/culinary-concierge)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Test Credentials](#-test-credentials)
- [Access Control Matrix](#-access-control-matrix)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [GraphQL API Reference](#-graphql-api-reference)
- [Architecture](#-architecture)
- [Local Setup](#-local-setup)
- [Screens & Flows](#-screens--flows)

---

## 🔍 Overview

Nick Fury runs a business with 5 employees across two regions — India and America. This app lets them browse restaurants, create food orders, and manage payments — but with strict controls over who can do what and what data they can see.

| User | Role | Region | Key Restriction |
|------|------|--------|----------------|
| Nick Fury | Admin | Global | Can do everything, sees all data |
| Captain Marvel | Manager | India | Can place/cancel orders, India data only |
| Captain America | Manager | America | Can place/cancel orders, America data only |
| Thanos | Member | India | Can browse and add items, cannot place orders |
| Thor | Member | India | Can browse and add items, cannot place orders |
| Travis | Member | America | Can browse and add items, cannot place orders |

---

## 🧑‍💼 Test Credentials

| Name | Email | Password | Role | Region |
|------|-------|----------|------|--------|
| Nick Fury | nick@shield.com | admin123 | Admin | Global |
| Captain Marvel | marvel@shield.com | manager123 | Manager | India |
| Captain America | america@shield.com | manager123 | Manager | America |
| Thanos | thanos@shield.com | member123 | Member | India |
| Thor | thor@shield.com | member123 | Member | India |
| Travis | travis@shield.com | member123 | Member | America |

---

## 🔐 Access Control Matrix

### RBAC — Role Based Access Control

| Function | Admin | Manager | Member |
|----------|:-----:|:-------:|:------:|
| View restaurants & menu items | ✅ | ✅ | ✅ |
| Create order (add food items) | ✅ | ✅ | ✅ |
| Place order (checkout & pay) | ✅ | ✅ | ❌ |
| Cancel order | ✅ | ✅ | ❌ |
| Update payment methods | ✅ | ❌ | ❌ |

### Re-BAC — Relational Access Control (Bonus Objective)

On top of RBAC, every non-admin user's data is scoped to their region:

| Role | Data visible |
|------|-------------|
| Admin (Nick Fury) | All restaurants and orders globally |
| Manager (India) | Only India restaurants and orders |
| Manager (America) | Only America restaurants and orders |
| Member (India) | Only India restaurants, only their own orders |
| Member (America) | Only America restaurants, only their own orders |

This means Captain Marvel logging in will never see The Brooklyn Grill (America), and Travis will never see Bukhara Grill (India) — enforced at both the API resolver level and the SSR page level.

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (Pages Router) | SSR for auth + data fetching, file-based routing |
| Styling | Tailwind CSS | Utility-first, fast to build |
| API | GraphQL — Apollo Server 4 | Single endpoint, self-documenting, type-safe |
| ORM | Prisma 5 | Type-safe DB queries, schema-first, easy migrations |
| Database | MySQL 8 | Relational data with foreign keys |
| Auth | JWT + HTTP-only cookies | Secure, stateless, SSR-compatible |
| Password | bcryptjs | Industry standard hashing |
| DB Host | Railway | Free tier MySQL in the cloud |
| App Host | Vercel | Zero-config Next.js deployment |

---

## ✨ Features

- **Authentication** — Email/password login with JWT stored in HTTP-only cookies (not accessible to JavaScript)
- **Role-Based Access Control** — Three roles (Admin, Manager, Member) with different permitted actions enforced on every API resolver
- **Regional Data Isolation** — India and America data is completely siloed; users only see their region
- **Restaurant Browsing** — Grid of restaurants filtered by region, with ratings and cuisine tags
- **Menu & Cart** — Browse menu items by category, add/remove from cart with live total calculation
- **Order Management** — Create draft orders, place with payment method, cancel active orders, track status
- **Order Progress Tracker** — Visual step indicator (Draft → Placed → Processing → Delivering → Delivered)
- **Payment Settings** — Admin-only CRUD for organizational payment methods
- **Dashboard** — Personalized stats (total orders, active orders, restaurant count, total spent)
- **GraphQL Playground** — Interactive API explorer at `/api/graphql` for testing queries/mutations
- **Responsive UI** — Works on mobile and desktop with a collapsible sidebar

---

## 📁 Project Structure

```
culinary-concierge/
│
├── components/
│   └── Layout.js                  # Shared sidebar + topbar shell used by all pages
│
├── lib/
│   ├── auth.js                    # JWT sign/verify, getUserFromRequest(), canPerform() RBAC
│   ├── prisma.js                  # Prisma client singleton (safe for Next.js hot reload)
│   └── graphql/
│       ├── schema.js              # GraphQL SDL type definitions (all types, inputs, queries, mutations)
│       └── resolvers.js           # All query + mutation resolvers with RBAC + region enforcement
│
├── pages/
│   ├── _app.js                    # Global CSS import
│   ├── _document.js               # HTML document — favicon, fonts loaded once globally
│   ├── index.js                   # Redirects to /dashboard or /login based on auth
│   ├── login.js                   # Login page with quick-login panel for all test users
│   ├── dashboard.js               # Home dashboard — stats + recent orders (SSR, Prisma)
│   ├── payment-settings.js        # Payment method CRUD — Admin only, uses GraphQL mutations
│   │
│   ├── api/
│   │   ├── graphql.js             # Single Apollo Server endpoint — all data operations
│   │   └── auth/
│   │       ├── login.js           # POST /api/auth/login — bcrypt verify, set JWT cookie
│   │       └── logout.js          # POST /api/auth/logout — clear cookie
│   │
│   ├── restaurants/
│   │   ├── index.js               # Restaurant listing — SSR, Prisma, region-filtered
│   │   └── [id].js                # Restaurant detail + menu + cart — GraphQL mutation on submit
│   │
│   └── orders/
│       ├── index.js               # Orders list — SSR, Prisma, role + region filtered
│       └── [id].js                # Order detail + checkout — GraphQL mutations for place/cancel
│
├── prisma/
│   └── schema.prisma              # Prisma schema — all models, enums, relations, indexes
│
├── public/
│   ├── favicon.ico                # Multi-size ICO (16 + 32 + 48px)
│   ├── favicon-32.png             # PNG favicon for modern browsers
│   ├── favicon-16.png             # PNG favicon small
│   └── apple-touch-icon.png       # 180x180 for iOS home screen
│
├── scripts/
│   └── seed.js                    # Seeds all users, restaurants, menu items, payment methods
│
├── styles/
│   └── globals.css                # Tailwind directives + custom component classes
│
├── .env                           # DATABASE_URL for Prisma CLI (not committed)
├── .env.local                     # DATABASE_URL + JWT_SECRET for Next.js (not committed)
├── .env.example                   # Template showing required env vars
├── .gitignore
├── next.config.js                 # Next.js config — Prisma external packages, image domains
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🗃️ Database Schema

### Entity Relationship

```
users ──────────────────────── orders ──────────── order_items
  id, name, email                 id, userId            id, orderId
  password, role, region          restaurantId          menuItemId
                                  paymentMethodId       quantity
restaurants ────────────────────── region              unitPrice
  id, name, description           status                subtotal
  cuisine, region, city           totalAmount
  rating, imageUrl           └──── payment_methods
                                       id, label, type
menu_items                             lastFour, region
  id, restaurantId                     isPrimary
  name, description
  price, category
  isVegetarian, imageUrl
```

### Table Definitions

```
users
  id            INT PK AUTO_INCREMENT
  name          VARCHAR(100)
  email         VARCHAR(150) UNIQUE
  password      VARCHAR(255)           bcrypt hash
  role          ENUM(admin|manager|member)
  region        ENUM(india|america|global)
  created_at    TIMESTAMP

restaurants
  id            INT PK AUTO_INCREMENT
  name          VARCHAR(200)
  description   TEXT
  cuisine       VARCHAR(100)
  region        ENUM(india|america)
  city          VARCHAR(100)
  rating        DECIMAL(2,1)
  image_url     VARCHAR(500)
  is_active     BOOLEAN

menu_items
  id            INT PK AUTO_INCREMENT
  restaurant_id INT FK → restaurants.id
  name          VARCHAR(200)
  description   TEXT
  price         DECIMAL(10,2)
  category      VARCHAR(100)
  is_vegetarian BOOLEAN
  is_available  BOOLEAN
  image_url     VARCHAR(500)

payment_methods
  id              INT PK AUTO_INCREMENT
  label           VARCHAR(150)
  type            ENUM(card|bank|upi)
  last_four       VARCHAR(4)
  cardholder_name VARCHAR(150)
  expiry          VARCHAR(7)
  region          ENUM(india|america|global)
  is_primary      BOOLEAN
  is_active       BOOLEAN

orders
  id                INT PK AUTO_INCREMENT
  user_id           INT FK → users.id
  restaurant_id     INT FK → restaurants.id
  payment_method_id INT FK → payment_methods.id (nullable)
  status            ENUM(draft|placed|processing|delivering|delivered|cancelled)
  total_amount      DECIMAL(10,2)
  region            ENUM(india|america)
  placed_at         TIMESTAMP (nullable)
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

order_items
  id            INT PK AUTO_INCREMENT
  order_id      INT FK → orders.id
  menu_item_id  INT FK → menu_items.id
  quantity      INT
  unit_price    DECIMAL(10,2)
  subtotal      DECIMAL(10,2)
```

---

## 🌐 GraphQL API Reference

**Endpoint:** `POST /api/graphql`  
**Playground:** `GET /api/graphql` (Apollo Sandbox embedded, works offline)  
**Auth:** JWT cookie sent automatically with every request (HTTP-only, set at login)

### Types

```graphql
type Restaurant {
  id: Int!
  name: String!
  description: String
  cuisine: String
  region: RestRegion!    # india | america
  city: String
  rating: Float!
  imageUrl: String
  menuItems: [MenuItem!]!
}

type MenuItem {
  id: Int!
  name: String!
  price: Float!
  category: String
  isVegetarian: Boolean!
  description: String
  imageUrl: String
}

type Order {
  id: Int!
  status: OrderStatus!   # draft|placed|processing|delivering|delivered|cancelled
  totalAmount: Float!
  region: RestRegion!
  createdAt: String!
  placedAt: String
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
```

### Queries

```graphql
# Returns restaurants filtered by the logged-in user's region
# Admin gets all, Manager/Member get their region only
query {
  restaurants {
    id name cuisine region city rating imageUrl
    menuItems { id name price category isVegetarian imageUrl }
  }
}

# Single restaurant — returns 403 if user tries to access wrong region
query {
  restaurant(id: 1) {
    id name menuItems { id name price }
  }
}

# Returns orders filtered by role:
# Admin → all orders | Manager → region orders | Member → own orders only
query {
  orders {
    id status totalAmount region createdAt
    restaurant { name }
    user { name }
  }
}

# Dashboard stats scoped to the user's role + region
query {
  dashboardStats {
    totalOrders activeOrders restaurants totalSpent
  }
}

# Admin only — returns 403 for other roles
query {
  paymentMethods {
    id label type lastFour region isPrimary
  }
}
```

### Mutations

```graphql
# Create a draft order — available to all roles
# Returns 403 if restaurantId is in a different region than the user
mutation {
  createOrder(
    restaurantId: 1
    items: [
      { menuItemId: 1, quantity: 2 }
      { menuItemId: 3, quantity: 1 }
    ]
  ) {
    id status totalAmount
  }
}

# Place a draft order — Admin and Manager only
# Members calling this get: "Permission denied: cannot place_order"
mutation {
  placeOrder(id: 5, paymentMethodId: 1) {
    id status placedAt
  }
}

# Cancel an order — Admin and Manager only
# Only cancels orders with status: draft | placed | processing
mutation {
  cancelOrder(id: 5) {
    id status
  }
}

# Payment method mutations — Admin only
mutation {
  createPaymentMethod(input: {
    label: "India Amex Card"
    type: card
    lastFour: "1234"
    cardholderName: "NICK FURY"
    expiry: "08/27"
    region: india
  }) {
    id label
  }
}

mutation {
  updatePaymentMethod(id: 1, input: {
    label: "Updated Label"
    type: card
    region: global
  }) {
    id label
  }
}

mutation {
  deletePaymentMethod(id: 3)  # soft delete, sets isActive = false
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | No valid JWT cookie — redirect to login |
| `FORBIDDEN` | Valid user but lacks permission (wrong role or wrong region) |
| `NOT_FOUND` | Resource doesn't exist or is inactive |
| `BAD_REQUEST` | Invalid operation (e.g. placing a non-draft order) |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│  Next.js Pages (SSR — getServerSideProps)               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. getUserFromRequest(req) → parse JWT cookie     │  │
│  │  2. canPerform(user, action) → RBAC gate           │  │
│  │  3. region check → ABAC gate                       │  │
│  │  4. prisma.xxx.findMany({ where: ... }) → data     │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│  Client-side mutations   │  fetch('/api/graphql')        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              POST /api/graphql (Apollo Server 4)         │
│                                                          │
│  context(req) → getUserFromRequest() → { user }         │
│                                                          │
│  Resolver called                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  requireAuth(user)       — must be logged in       │  │
│  │  requirePermission(user) — RBAC check              │  │
│  │  region check            — Re-BAC check            │  │
│  │  prisma query/mutation   — actual DB operation     │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Prisma 5 ORM                                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              MySQL 8 on Railway                          │
└─────────────────────────────────────────────────────────┘
```

### Why auth is REST, not GraphQL

Login (`POST /api/auth/login`) is a standard REST route rather than a GraphQL mutation because **`Set-Cookie` headers must be set on the HTTP response object**, and Apollo Server's response model doesn't expose the raw Next.js `res` object in a clean way. The REST route sets an HTTP-only cookie (not accessible to JavaScript) which is then sent automatically on every subsequent request including GraphQL calls.

### RBAC Implementation

```js
// lib/auth.js
const permissions = {
  admin:   ['view_restaurants', 'create_order', 'place_order', 'cancel_order', 'update_payment'],
  manager: ['view_restaurants', 'create_order', 'place_order', 'cancel_order'],
  member:  ['view_restaurants', 'create_order'],
};

export function canPerform(user, action) {
  return permissions[user.role]?.includes(action) ?? false;
}
```

### Re-BAC / Region Isolation

Applied in every resolver and every `getServerSideProps`:

```js
// Resolvers — lib/graphql/resolvers.js
function orderWhere(user) {
  if (user.role === 'admin')   return {};                      // sees all
  if (user.role === 'manager') return { region: user.region }; // own region
  return { userId: user.id };                                  // own orders only
}

// Restaurant access check
if (user.role !== 'admin' && restaurant.region !== user.region) {
  throw new GraphQLError('Access denied to this region.', {
    extensions: { code: 'FORBIDDEN' }
  });
}
```

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- MySQL 8+ running locally
- Git

### 1. Clone & Install

```bash
git clone https://github.com/deekshant4758/culinary-concierge.git
cd culinary-concierge
npm install
```

### 2. Configure Environment

Create `.env` (used by Prisma CLI):
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/culinary_concierge"
```

Create `.env.local` (used by Next.js at runtime):
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/culinary_concierge"
JWT_SECRET="culinary_concierge_super_secret_jwt_key_2026"
```

> Both files are in `.gitignore` and will never be committed.

### 3. Set Up Database

```bash
# Create all tables from prisma/schema.prisma
npx prisma db push

# Seed with users, restaurants, menu items, payment methods
node scripts/seed.js
```

Expected output:
```
✅ Database seeded successfully!

🧑‍💼 Test Credentials:
  Admin:   nick@shield.com     / admin123   (Global)
  Manager: marvel@shield.com   / manager123 (India)
  Manager: america@shield.com  / manager123 (America)
  Member:  thanos@shield.com   / member123  (India)
  Member:  travis@shield.com   / member123  (America)
```

### 4. Run Development Server

```bash
npm run dev
```

Open **http://localhost:3000**

### 5. Explore the GraphQL API

Open **http://localhost:3000/api/graphql** — Apollo Sandbox will load. You can run any query or mutation directly from the browser.

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma visual database browser
node scripts/seed.js # Re-seed the database
```

---


## 🖥️ Screens & Flows

### Login
- Quick-login buttons for all 5 test users on the left panel
- JWT set as HTTP-only cookie on successful login

### Dashboard
- Stats cards: Total Orders, Active Orders, Restaurants, Total Spent
- Recent orders table with region badges (Admin sees all, others see their scope)
- Members see an info notice explaining they need manager approval to place orders

### Restaurants
- Grid of restaurant cards with image, rating, cuisine, region badge
- Region-locked notice for non-admin users
- Clicking a restaurant opens the menu

### Menu & Cart
- Menu items grouped by category with images
- Add/remove items with quantity controls
- Live cart sidebar with subtotal + 5% tax
- Members see a lock notice on the cart; managers/admins can proceed to order

### Orders
- Full order table with status badges, region badges (admin), cancel button (manager+)
- Order detail page with itemized list, payment selector, progress tracker

### Payment Settings (Admin only)
- List of active payment methods with edit/delete
- Add new method form with type, region, card details
- Non-admins are redirected away from this page

---

## 📦 Dependencies

```json
{
  "next": "14.2.5",
  "@apollo/server": "^4.10.4",
  "@as-integrations/next": "^3.1.0",
  "graphql": "^16.8.2",
  "@prisma/client": "^5.14.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "cookie": "^0.6.0"
}
```

---

## 📝 Notes

- `relationMode = "prisma"` in `schema.prisma` is required for Railway/PlanetScale which don't support foreign key constraints at the database level — Prisma enforces them in application code instead
- All `Decimal` fields from Prisma (price, totalAmount, rating) are explicitly converted to `parseFloat()` before being passed as props to avoid serialization errors
- The `_document.js` file loads Google Fonts and Material Symbols once globally, fixing the Next.js warning about stylesheets in `<Head>`
- Auth cookies use `sameSite: 'lax'` and `httpOnly: true` — they are sent automatically with every same-origin request and cannot be read by JavaScript