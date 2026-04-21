// scripts/migrate.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const schema = `
CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;
USE \`${process.env.DB_NAME}\`;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'member') NOT NULL DEFAULT 'member',
  region ENUM('india', 'america', 'global') NOT NULL DEFAULT 'india',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cuisine VARCHAR(100),
  region ENUM('india', 'america') NOT NULL,
  city VARCHAR(100),
  rating DECIMAL(2,1) DEFAULT 4.0,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  type ENUM('card', 'bank', 'upi') NOT NULL DEFAULT 'card',
  last_four VARCHAR(4),
  cardholder_name VARCHAR(150),
  expiry VARCHAR(7),
  region ENUM('india', 'america', 'global') NOT NULL DEFAULT 'global',
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shared_with_user_id INT NULL,
  restaurant_id INT NOT NULL,
  payment_method_id INT,
  status ENUM('draft', 'placed', 'processing', 'delivering', 'delivered', 'cancelled') DEFAULT 'draft',
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  region ENUM('india', 'america') NOT NULL,
  notes TEXT,
  placed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

SET @shared_with_column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'shared_with_user_id'
);
SET @shared_with_column_sql := IF(
  @shared_with_column_exists = 0,
  'ALTER TABLE orders ADD COLUMN shared_with_user_id INT NULL AFTER user_id',
  'SELECT 1'
);
PREPARE shared_with_column_stmt FROM @shared_with_column_sql;
EXECUTE shared_with_column_stmt;
DEALLOCATE PREPARE shared_with_column_stmt;

SET @shared_with_fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = '${process.env.DB_NAME}'
    AND TABLE_NAME = 'orders'
    AND CONSTRAINT_NAME = 'fk_orders_shared_with_user'
);
SET @shared_with_fk_sql := IF(
  @shared_with_fk_exists = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_shared_with_user FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE shared_with_fk_stmt FROM @shared_with_fk_sql;
EXECUTE shared_with_fk_stmt;
DEALLOCATE PREPARE shared_with_fk_stmt;
`;

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  console.log('Running migrations...');
  await conn.query(schema);
  console.log('✅ Database schema created successfully!');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
