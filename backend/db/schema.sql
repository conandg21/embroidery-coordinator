-- Embroidery Production Coordinator — Database Schema
-- Run this once to set up your database

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
    -- roles: 'admin', 'staff', 'digitizer', 'production'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'intake',
    -- statuses: 'intake', 'digitization', 'production', 'qa', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'normal',
    -- priorities: 'low', 'normal', 'high', 'urgent'
  due_date DATE,
  assigned_to INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  notes TEXT,
  garment_type VARCHAR(255),
  thread_colors TEXT,
  stitch_count INTEGER,
  width_mm DECIMAL(10,2),
  height_mm DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files attached to orders
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_category VARCHAR(50) DEFAULT 'other',
    -- categories: 'art', 'dst', 'emb', 'preview', 'other'
  mime_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team chat messages (general + order-specific)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    -- NULL = general team chat, set = order-specific chat
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order stage change history
CREATE TABLE IF NOT EXISTS order_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs — every action is recorded
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_files_order ON files(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

-- Seed: default admin user (password: Admin1234!)
-- Change this immediately after first login!
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@embroidery.local',
  '$2a$10$6eUQ5FJzJqQpqhdQTQ8qFe662g.TjWWnCeMJkHoHoxiz47NoqhCy2',
  'admin'
) ON CONFLICT (email) DO NOTHING;
