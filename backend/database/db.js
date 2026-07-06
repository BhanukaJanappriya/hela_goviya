const Database = require('better-sqlite3');
const path = require('path');

let instance = null;

class DatabaseSingleton {
  constructor() {
    if (instance) return instance;
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'hela_goviya.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    instance = this;
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','customer','vendor','seller','driver')),
        phone TEXT,
        address TEXT,
        avatar TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','pending','suspended')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendor_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
        business_name TEXT NOT NULL,
        business_type TEXT,
        location TEXT,
        description TEXT,
        approval_status TEXT DEFAULT 'pending',
        rating REAL DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seller_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
        store_name TEXT NOT NULL,
        store_description TEXT,
        rating REAL DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS driver_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
        vehicle_type TEXT,
        vehicle_number TEXT,
        license_number TEXT,
        approval_status TEXT DEFAULT 'pending',
        availability TEXT DEFAULT 'offline',
        total_deliveries INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        daily_earnings REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        seller_id TEXT REFERENCES users(id),
        vendor_id TEXT REFERENCES users(id),
        category_id TEXT REFERENCES categories(id),
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        original_price REAL,
        unit TEXT DEFAULT 'kg',
        stock INTEGER DEFAULT 0,
        min_stock_alert INTEGER DEFAULT 10,
        images TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        is_organic INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES users(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL REFERENCES users(id),
        seller_id TEXT REFERENCES users(id),
        total_amount REAL NOT NULL,
        delivery_fee REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        delivery_address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'cod',
        payment_status TEXT DEFAULT 'pending',
        is_urgent INTEGER DEFAULT 0,
        priority_level INTEGER DEFAULT 1,
        notes TEXT,
        estimated_delivery DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS delivery_assignments (
        id TEXT PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL REFERENCES orders(id),
        driver_id TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        pickup_time DATETIME,
        delivery_time DATETIME,
        distance REAL,
        earnings REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS queue_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        status TEXT DEFAULT 'waiting',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        reference_id TEXT,
        reference_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES users(id),
        product_id TEXT REFERENCES products(id),
        seller_id TEXT REFERENCES users(id),
        order_id TEXT REFERENCES orders(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS site_ratings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status, priority);
    `);
  }

  getDb() { return this.db; }
}

module.exports = new DatabaseSingleton();