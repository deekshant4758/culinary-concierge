# 🍽️ Culinary Concierge

A full-stack food ordering application built with **Next.js** (frontend + API routes) and **MySQL** (database), featuring Role-Based Access Control (RBAC) and Region-Based Access Control (ABAC/Bonus objective).

---

## 📋 Features

- **Authentication** — JWT-based login via HTTP-only cookies
- **RBAC** — Three roles with different permissions
- **ABAC** — Regional data isolation (India vs America)
- **Food Ordering** — Browse restaurants, add items to cart, create draft orders
- **Order Management** — Place, cancel, and track orders
- **Payment Settings** — Admin-only CRUD for payment methods

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (Pages Router) |
| Backend API | Next.js API Routes |
| Database | MySQL 8+ |
| Styling | Tailwind CSS |
| Auth | JWT + HTTP-only cookies |
| Password | bcryptjs |

---

## 👥 Users & Roles

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

| Function | Admin | Manager | Member |
|----------|-------|---------|--------|
| View restaurants & menu | ✅ Global | ✅ Region-only | ✅ Region-only |
| Create order (add items) | ✅ | ✅ Region-only | ✅ Region-only |
| Place order (checkout & pay) | ✅ | ✅ Region-only | ❌ |
| Cancel order | ✅ | ✅ Region-only | ❌ |
| Update payment methods | ✅ | ❌ | ❌ |

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

### Step 1: Clone & Install

```bash
git clone <your-repo-url>
cd culinary-concierge
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env.local` and fill in your MySQL credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=culinary_concierge
JWT_SECRET=your_secret_key_here
```

### Step 3: Set Up Database

```bash
# Create tables
npm run db:migrate

# Seed with sample data (users, restaurants, menu items, payment methods)
npm run db:seed
```

### Step 4: Run the App

```bash
npm run dev
```

Visit **http://localhost:3000**

---

## 📁 Project Structure

```
culinary-concierge/
├── components/
│   └── Layout.js            # Sidebar + header shell
├── lib/
│   ├── auth.js              # JWT helpers + RBAC canPerform()
│   └── db.js                # MySQL connection pool
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.js     # POST /api/auth/login
│   │   │   └── logout.js    # POST /api/auth/logout
│   │   ├── orders/
│   │   │   ├── index.js     # GET/POST /api/orders
│   │   │   └── [id]/
│   │   │       ├── place.js  # POST /api/orders/:id/place
│   │   │       └── cancel.js # POST /api/orders/:id/cancel
│   │   ├── restaurants/
│   │   │   ├── index.js     # GET /api/restaurants
│   │   │   └── [id].js      # GET /api/restaurants/:id
│   │   └── payment-methods/
│   │       ├── index.js     # GET/POST /api/payment-methods
│   │       └── [id].js      # PUT/DELETE /api/payment-methods/:id
│   ├── dashboard.js         # Home dashboard (all roles)
│   ├── login.js             # Login page
│   ├── payment-settings.js  # Admin-only payment management
│   ├── restaurants/
│   │   ├── index.js         # Restaurant listing
│   │   └── [id].js          # Restaurant detail + menu + cart
│   └── orders/
│       ├── index.js         # All orders (role-filtered)
│       └── [id].js          # Order detail + checkout
├── scripts/
│   ├── migrate.js           # DB schema creation
│   └── seed.js              # Sample data seeder
├── styles/
│   └── globals.css          # Tailwind + global styles
├── .env.example
└── README.md
```

---

## 🗃️ Database Schema

```sql
users               -- id, name, email, password, role, region
restaurants         -- id, name, description, cuisine, region, city, rating, image_url
menu_items          -- id, restaurant_id, name, description, price, category, is_vegetarian
payment_methods     -- id, label, type, last_four, cardholder_name, expiry, region, is_primary
orders              -- id, user_id, restaurant_id, payment_method_id, status, total_amount, region
order_items         -- id, order_id, menu_item_id, quantity, unit_price, subtotal
```

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email & password |
| POST | `/api/auth/logout` | Clear auth cookie |

### Restaurants
| Method | Endpoint | Auth | Access |
|--------|----------|------|--------|
| GET | `/api/restaurants` | ✅ | Region-filtered |
| GET | `/api/restaurants/:id` | ✅ | Region-gated |

### Orders
| Method | Endpoint | Auth | Role Required |
|--------|----------|------|---------------|
| GET | `/api/orders` | ✅ | All (role-filtered) |
| POST | `/api/orders` | ✅ | Admin, Manager, Member |
| POST | `/api/orders/:id/place` | ✅ | Admin, Manager only |
| POST | `/api/orders/:id/cancel` | ✅ | Admin, Manager only |

### Payment Methods
| Method | Endpoint | Auth | Role Required |
|--------|----------|------|---------------|
| GET | `/api/payment-methods` | ✅ | Admin only |
| POST | `/api/payment-methods` | ✅ | Admin only |
| PUT | `/api/payment-methods/:id` | ✅ | Admin only |
| DELETE | `/api/payment-methods/:id` | ✅ | Admin only |

---

## 🏛️ Architecture

```
Browser
  │
  ├─ Next.js Pages (SSR via getServerSideProps)
  │    ├─ Auth check via JWT cookie
  │    ├─ RBAC via canPerform()
  │    └─ ABAC via region comparison
  │
  ├─ Next.js API Routes (/api/*)
  │    ├─ getUserFromRequest() → verify JWT
  │    ├─ canPerform() → role-based gate
  │    └─ region check → attribute-based gate
  │
  └─ MySQL (via mysql2 connection pool)
       └─ culinary_concierge database
```

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

### ABAC / Region Isolation

Every API query filters by `user.region` for non-admin users:

```js
// Admins see everything; managers/members see their region only
if (user.role === 'admin') {
  // No WHERE clause
} else {
  // WHERE region = user.region
}
```

---

## 🎥 Demo Flow

1. **Login as Nick Fury** → See global dashboard with both India & America data
2. **Login as Captain Marvel** → See only India restaurants and orders
3. **Login as Thanos** → Add items to cart, but cannot place or cancel — sees "Request Manager Approval"
4. **Login as Captain Marvel** → Place Thanos's order with a payment method
5. **Login as Nick Fury** → Go to Payment Settings → Add/Edit payment methods
6. **Try visiting `/payment-settings` as Captain Marvel** → Redirected (403)
7. **Try fetching `/api/restaurants?region=america` as Thanos** → Returns India-only data

---

## 📝 Notes

- The app uses **Next.js SSR** so all data-fetching and auth checks happen server-side — no sensitive data leaks to the client
- The JWT token is stored in an **HTTP-only cookie** (not accessible to JavaScript)
- Region isolation is enforced at **both the API layer and page layer**
- The seed script creates realistic restaurant and menu data for both India and America regions
