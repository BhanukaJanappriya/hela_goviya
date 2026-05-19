require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dbInstance = require('./db');
const db = dbInstance.getDb();

async function seed() {
  console.log('🌱 Seeding Hela Goviya database...');

  // Clear tables
  const tables = [
    'delivery_assignments','order_items','orders','carts',
    'reviews','products','categories','driver_profiles',
    'seller_profiles','vendor_profiles','notifications','queue_entries','users'
  ];
  tables.forEach(t => db.prepare(`DELETE FROM ${t}`).run());

  const hash = pw => bcrypt.hashSync(pw, 10);

  // ── Users ──────────────────────────────────────────────
  const adminId   = uuidv4();
  const custId    = uuidv4();
  const vendorId  = uuidv4();
  const vendor2Id = uuidv4();
  const sellerId  = uuidv4();
  const driverId  = uuidv4();
  const driver2Id = uuidv4();
  const cust2Id   = uuidv4();

  const insertUser = db.prepare(
    `INSERT INTO users (id,name,email,password,role,phone,address,status) VALUES (?,?,?,?,?,?,?,?)`
  );

  insertUser.run(adminId,  'Admin User',           'admin@helagoviya.lk',    hash('admin123'),    'admin',    '0771000001', 'Colombo',                    'active');
  insertUser.run(custId,   'Nimal Perera',          'customer@helagoviya.lk', hash('customer123'), 'customer', '0771000002', '123 Kandy Road, Colombo 07', 'active');
  insertUser.run(cust2Id,  'Priya Wickramasinghe',  'priya@helagoviya.lk',    hash('customer123'), 'customer', '0771000003', '45 Galle Road, Colombo 03',  'active');
  insertUser.run(vendorId, 'Kamal Silva',           'vendor@helagoviya.lk',   hash('vendor123'),   'vendor',   '0771000004', 'Kandy, Sri Lanka',           'active');
  insertUser.run(vendor2Id,'Chamara Bandara',       'chamara@helagoviya.lk',  hash('vendor123'),   'vendor',   '0771000005', 'Nuwara Eliya',               'active');
  insertUser.run(sellerId, 'Sunil Fernando',        'seller@helagoviya.lk',   hash('seller123'),   'seller',   '0771000006', 'Colombo 05',                 'active');
  insertUser.run(driverId, 'Ruwan Jayawardena',     'driver@helagoviya.lk',   hash('driver123'),   'driver',   '0771000007', 'Nugegoda',                   'active');
  insertUser.run(driver2Id,'Dilshan Rajapaksa',     'dilshan@helagoviya.lk',  hash('driver123'),   'driver',   '0771000008', 'Maharagama',                 'active');

  // ── Profiles ───────────────────────────────────────────
  db.prepare(`INSERT INTO vendor_profiles (id,user_id,business_name,business_type,location,description,approval_status,rating,total_reviews) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), vendorId,  'Green Valley Farms',    'Vegetable Farming', 'Kandy, Sri Lanka', 'Organic vegetables from the hills', 'approved', 4.7, 128);
  db.prepare(`INSERT INTO vendor_profiles (id,user_id,business_name,business_type,location,description,approval_status,rating,total_reviews) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), vendor2Id, 'Sunrise Organic Farm',  'Mixed Farming',     'Nuwara Eliya',     'Premium hill country produce',      'approved', 4.5,  94);

  db.prepare(`INSERT INTO seller_profiles (id,user_id,store_name,store_description,rating,total_sales) VALUES (?,?,?,?,?,?)`)
    .run(uuidv4(), sellerId, 'Fresh Harvest Market', 'Your trusted source for fresh produce', 4.8, 1240);

  db.prepare(`INSERT INTO driver_profiles (id,user_id,vehicle_type,vehicle_number,license_number,approval_status,availability,total_deliveries,rating,daily_earnings) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), driverId,  'Motorcycle', 'WP CAA-1234', 'B1234567', 'approved', 'online', 342, 4.9, 2850.00);
  db.prepare(`INSERT INTO driver_profiles (id,user_id,vehicle_type,vehicle_number,license_number,approval_status,availability,total_deliveries,rating,daily_earnings) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), driver2Id, 'Van',        'WP CAB-5678', 'B7654321', 'approved', 'online', 215, 4.6, 3200.00);

  // ── Categories ─────────────────────────────────────────
  const cats = [
    { id: uuidv4(), name: 'Vegetables',    slug: 'vegetables', icon: '🥬', desc: 'Fresh farm vegetables' },
    { id: uuidv4(), name: 'Fruits',        slug: 'fruits',     icon: '🍎', desc: 'Seasonal fresh fruits' },
    { id: uuidv4(), name: 'Grains & Rice', slug: 'grains',     icon: '🌾', desc: 'Rice, grains and pulses' },
    { id: uuidv4(), name: 'Herbs & Spices',slug: 'herbs',      icon: '🌿', desc: 'Aromatic herbs and spices' },
    { id: uuidv4(), name: 'Dairy & Eggs',  slug: 'dairy',      icon: '🥚', desc: 'Farm fresh dairy' },
    { id: uuidv4(), name: 'Organic',       slug: 'organic',    icon: '♻️', desc: 'Certified organic produce' },
  ];
  const insC = db.prepare(`INSERT INTO categories (id,name,slug,icon,description) VALUES (?,?,?,?,?)`);
  cats.forEach(c => insC.run(c.id, c.name, c.slug, c.icon, c.desc));

  const vegId   = cats[0].id;
  const fruitId = cats[1].id;
  const grainId = cats[2].id;
  const herbId  = cats[3].id;

  // ── Products ───────────────────────────────────────────
  const prods = [
    { name:'Organic Tomatoes',  price:180, orig:220, stock:150, cat:vegId,   unit:'kg',    organic:1, featured:1, desc:'Fresh organic tomatoes from Green Valley Farm' },
    { name:'Green Cabbage',     price:80,  orig:100, stock:200, cat:vegId,   unit:'kg',    organic:0, featured:0, desc:'Crisp farm-fresh cabbage' },
    { name:'Carrots',           price:120, orig:150, stock:180, cat:vegId,   unit:'kg',    organic:1, featured:1, desc:'Sweet organic carrots from hill country' },
    { name:'Leeks',             price:95,  orig:120, stock:160, cat:vegId,   unit:'kg',    organic:0, featured:0, desc:'Fresh leeks from Nuwara Eliya' },
    { name:'Bell Peppers',      price:320, orig:380, stock:90,  cat:vegId,   unit:'kg',    organic:1, featured:1, desc:'Colorful organic bell peppers' },
    { name:'Ripe Bananas',      price:90,  orig:110, stock:300, cat:fruitId, unit:'dozen', organic:0, featured:1, desc:'Sweet ripe bananas, locally grown' },
    { name:'Mangoes',           price:350, orig:400, stock:120, cat:fruitId, unit:'kg',    organic:1, featured:1, desc:'Premium Willard mangoes' },
    { name:'Pineapple',         price:200, orig:250, stock:80,  cat:fruitId, unit:'piece', organic:0, featured:0, desc:'Juicy fresh pineapples' },
    { name:'Papaya',            price:150, orig:180, stock:60,  cat:fruitId, unit:'piece', organic:1, featured:0, desc:'Ripe organic papaya' },
    { name:'Samba Rice',        price:220, orig:250, stock:500, cat:grainId, unit:'kg',    organic:0, featured:1, desc:'Premium quality Samba rice' },
    { name:'Red Rice',          price:190, orig:210, stock:400, cat:grainId, unit:'kg',    organic:1, featured:0, desc:'Traditional red rice, high nutrition' },
    { name:'Green Gram',        price:280, orig:320, stock:200, cat:grainId, unit:'kg',    organic:1, featured:0, desc:'Fresh green gram / mung beans' },
    { name:'Cinnamon',          price:450, orig:500, stock:60,  cat:herbId,  unit:'100g',  organic:1, featured:1, desc:'True Ceylon cinnamon, premium grade' },
    { name:'Turmeric Powder',   price:280, orig:320, stock:100, cat:herbId,  unit:'250g',  organic:1, featured:0, desc:'Pure organic turmeric powder' },
    { name:'Curry Leaves',      price:60,  orig:80,  stock:150, cat:herbId,  unit:'bunch', organic:0, featured:0, desc:'Fresh aromatic curry leaves' },
  ];
  const insP = db.prepare(`INSERT INTO products (id,seller_id,vendor_id,category_id,name,description,price,original_price,unit,stock,is_organic,is_featured,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active')`);
  const prodIds = prods.map(p => {
    const id = uuidv4();
    insP.run(id, sellerId, vendorId, p.cat, p.name, p.desc, p.price, p.orig, p.unit, p.stock, p.organic, p.featured);
    return id;
  });

  // ── Orders ─────────────────────────────────────────────
  const makeOrder = (num, custId, status, urgent, priority, addr) => {
    const id = uuidv4();
    db.prepare(`INSERT INTO orders (id,order_number,customer_id,seller_id,total_amount,delivery_fee,final_amount,delivery_address,status,payment_method,is_urgent,priority_level) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, num, custId, sellerId, 0, 150, 150, addr, status, 'cod', urgent ? 1 : 0, priority);
    return id;
  };

  const o1 = makeOrder('HG-2024-001', custId,  'delivered',   false, 1, '123 Kandy Road, Colombo 07');
  const o2 = makeOrder('HG-2024-002', custId,  'dispatched',  true,  3, '123 Kandy Road, Colombo 07');
  const o3 = makeOrder('HG-2024-003', custId,  'pending',     false, 1, '456 Galle Road, Colombo 03');
  const o4 = makeOrder('HG-2024-004', cust2Id, 'confirmed',   false, 1, '45 Galle Road, Colombo 03');
  const o5 = makeOrder('HG-2024-005', cust2Id, 'processing',  false, 2, '45 Galle Road, Colombo 03');

  const insOI = db.prepare(`INSERT INTO order_items (id,order_id,product_id,quantity,unit_price,total_price) VALUES (?,?,?,?,?,?)`);
  const addItem = (orderId, prodIdx, qty) => {
    const p = prods[prodIdx];
    const total = p.price * qty;
    insOI.run(uuidv4(), orderId, prodIds[prodIdx], qty, p.price, total);
    db.prepare(`UPDATE orders SET total_amount=total_amount+?, final_amount=final_amount+? WHERE id=?`).run(total, total, orderId);
  };

  addItem(o1, 0, 2); addItem(o1, 1, 2); addItem(o1, 9, 1);
  addItem(o2, 6, 1); addItem(o2, 12, 2);
  addItem(o3, 9, 2); addItem(o3, 3, 1);
  addItem(o4, 0, 3); addItem(o4, 4, 1);
  addItem(o5, 1, 4); addItem(o5, 10, 2);

  // ── Delivery Assignments ───────────────────────────────
  const insDA = db.prepare(`INSERT INTO delivery_assignments (id,order_id,driver_id,status,earnings) VALUES (?,?,?,?,?)`);
  insDA.run(uuidv4(), o1, driverId,  'delivered',   150);
  insDA.run(uuidv4(), o2, driverId,  'on_the_way',  150);
  insDA.run(uuidv4(), o4, driver2Id, 'assigned',    150);

  // ── Queue Entries ──────────────────────────────────────
  const insQ = db.prepare(`INSERT INTO queue_entries (id,type,reference_id,priority,status) VALUES (?,?,?,?,?)`);
  insQ.run(uuidv4(), 'order', o3, 1, 'waiting');
  insQ.run(uuidv4(), 'order', o5, 2, 'processing');

  // ── Notifications ──────────────────────────────────────
  const insN = db.prepare(`INSERT INTO notifications (id,user_id,title,message,type,is_read) VALUES (?,?,?,?,?,?)`);
  insN.run(uuidv4(), custId,    'Order Confirmed ✓',       'Your order HG-2024-002 has been confirmed!',    'success', 0);
  insN.run(uuidv4(), custId,    'Order Dispatched 🚚',      'Your order HG-2024-002 is on its way!',         'info',    0);
  insN.run(uuidv4(), custId,    'Order Delivered ✓',       'Your order HG-2024-001 has been delivered.',    'success', 1);
  insN.run(uuidv4(), driverId,  'New Delivery Task 🚚',     'New delivery assigned for HG-2024-002',         'info',    0);
  insN.run(uuidv4(), driverId,  'Delivery Complete ✓',     'HG-2024-001 marked delivered. Rs.150 earned.',  'success', 1);
  insN.run(uuidv4(), sellerId,  'New Order Received 🛒',   'Order HG-2024-003 is awaiting confirmation.',   'warning', 0);
  insN.run(uuidv4(), sellerId,  'New Order Received 🛒',   'Order HG-2024-005 needs processing.',           'warning', 0);
  insN.run(uuidv4(), vendorId,  'Stock Alert ⚠️',           'Cinnamon stock is below 10 units.',             'warning', 0);
  insN.run(uuidv4(), driver2Id, 'New Delivery Assigned 🚚', 'Order HG-2024-004 assigned to you.',           'info',    0);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📋 Test Credentials:');
  console.log('──────────────────────────────────────────');
  console.log('  Admin:    admin@helagoviya.lk    / admin123');
  console.log('  Customer: customer@helagoviya.lk / customer123');
  console.log('  Vendor:   vendor@helagoviya.lk   / vendor123');
  console.log('  Seller:   seller@helagoviya.lk   / seller123');
  console.log('  Driver:   driver@helagoviya.lk   / driver123');
  console.log('──────────────────────────────────────────\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });