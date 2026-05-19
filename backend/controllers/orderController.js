const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();
const QueueService        = require('../services/QueueServices');
const NotificationService = require('../services/NotificationService');

const queue = new QueueService(db);
const notif = new NotificationService(db);
const genOrderNum = () => `HG-${new Date().getFullYear()}-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`;

exports.placeOrder = (req, res) => {
  const { items, delivery_address, payment_method='cod', is_urgent=false, notes='' } = req.body;
  if (!items?.length || !delivery_address)
    return res.status(400).json({ success:false, message:'Items and delivery address required' });

  const tx = db.transaction(() => {
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const prod = db.prepare(`SELECT * FROM products WHERE id=? AND status='active'`).get(item.product_id);
      if (!prod)              throw new Error(`Product not found: ${item.product_id}`);
      if (prod.stock<item.quantity) throw new Error(`Insufficient stock for ${prod.name}`);
      totalAmount += prod.price * item.quantity;
      orderItems.push({ prod, quantity:item.quantity, unit_price:prod.price, total_price:prod.price*item.quantity });
    }
    const deliveryFee = totalAmount > 2000 ? 0 : 150;
    const priority    = is_urgent ? 3 : 1;
    const orderId     = uuidv4();
    const orderNumber = genOrderNum();
    const sellerId    = orderItems[0].prod.seller_id;

    db.prepare(`INSERT INTO orders (id,order_number,customer_id,seller_id,total_amount,delivery_fee,final_amount,delivery_address,status,payment_method,is_urgent,priority_level,notes) VALUES (?,?,?,?,?,?,?,'pending',?,?,?,?,?)`)
      .run(orderId, orderNumber, req.user.id, sellerId, totalAmount, deliveryFee, totalAmount+deliveryFee, delivery_address, payment_method, is_urgent?1:0, priority, notes);

    for (const item of orderItems) {
      db.prepare(`INSERT INTO order_items (id,order_id,product_id,quantity,unit_price,total_price) VALUES (?,?,?,?,?,?)`).run(uuidv4(),orderId,item.prod.id,item.quantity,item.unit_price,item.total_price);
      db.prepare(`UPDATE products SET stock=stock-? WHERE id=?`).run(item.quantity, item.prod.id);
    }
    db.prepare('DELETE FROM carts WHERE customer_id=?').run(req.user.id);
    queue.enqueue('order', orderId, priority);
    notif.create(sellerId,'New Order Received 🛒',`Order ${orderNumber} received. Please confirm.`,'warning',orderId,'order');
    return { orderId, orderNumber, totalAmount, deliveryFee, finalAmount:totalAmount+deliveryFee };
  });

  try {
    const result = tx();
    res.status(201).json({ success:true, message:'Order placed successfully', data:result });
  } catch (err) {
    res.status(400).json({ success:false, message:err.message });
  }
};

exports.getMyOrders = (req, res) => {
  const orders = db.prepare(`SELECT o.*,u.name as seller_name FROM orders o LEFT JOIN users u ON o.seller_id=u.id WHERE o.customer_id=? ORDER BY o.created_at DESC`).all(req.user.id);
  const result  = orders.map(o => ({ ...o, items: db.prepare(`SELECT oi.*,p.name as product_name,p.unit FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`).all(o.id) }));
  res.json({ success:true, data:result });
};

exports.getOrderById = (req, res) => {
  const order = db.prepare(`SELECT o.*,u.name as customer_name,u.phone as customer_phone FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.id=?`).get(req.params.id);
  if (!order) return res.status(404).json({ success:false, message:'Not found' });
  const items    = db.prepare(`SELECT oi.*,p.name,p.unit FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`).all(order.id);
  const delivery = db.prepare(`SELECT da.*,u.name as driver_name,u.phone as driver_phone FROM delivery_assignments da LEFT JOIN users u ON da.driver_id=u.id WHERE da.order_id=?`).get(order.id);
  res.json({ success:true, data:{ ...order, items, delivery } });
};

exports.getSellerOrders = (req, res) => {
  const { status } = req.query;
  let q = `SELECT o.*,u.name as customer_name,u.phone as customer_phone FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.seller_id=?`;
  const params = [req.user.id];
  if (status) { q += ` AND o.status=?`; params.push(status); }
  q += ` ORDER BY o.is_urgent DESC, o.created_at DESC`;
  res.json({ success:true, data: db.prepare(q).all(...params) });
};

exports.updateOrderStatus = (req, res) => {
  const { status } = req.body;
  if (!['confirmed','processing','dispatched','delivered','cancelled'].includes(status))
    return res.status(400).json({ success:false, message:'Invalid status' });
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ success:false, message:'Not found' });
  db.prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);

  // Queue update
  const qe = db.prepare(`SELECT * FROM queue_entries WHERE reference_id=? AND status!='completed'`).get(req.params.id);
  if (qe) {
    if (['delivered','cancelled'].includes(status)) queue.complete(qe.id);
    else if (status==='confirmed') queue.updateStatus(qe.id,'processing');
  }

  // Auto-assign driver on dispatch
  if (status==='dispatched' && !db.prepare('SELECT id FROM delivery_assignments WHERE order_id=?').get(req.params.id)) {
    const driver = db.prepare(`SELECT u.id FROM users u JOIN driver_profiles dp ON u.id=dp.user_id WHERE dp.availability='online' AND dp.approval_status='approved' ORDER BY dp.total_deliveries ASC LIMIT 1`).get();
    if (driver) {
      db.prepare(`INSERT INTO delivery_assignments (id,order_id,driver_id,status,earnings) VALUES (?,?,?,'assigned',150)`).run(uuidv4(),req.params.id,driver.id);
      notif.create(driver.id,'New Delivery Task 🚚',`New delivery for order ${order.order_number}`,'info',req.params.id,'order');
    }
  }
  notif.sendOrderUpdate(order.customer_id, order.order_number, status, req.params.id);
  res.json({ success:true, message:'Status updated' });
};

exports.getAllOrders = (req, res) => {
  const { status, page=1, limit=50 } = req.query;
  let q = `SELECT o.*,u.name as customer_name,s.name as seller_name FROM orders o LEFT JOIN users u ON o.customer_id=u.id LEFT JOIN users s ON o.seller_id=s.id WHERE 1=1`;
  const params = [];
  if (status) { q+=` AND o.status=?`; params.push(status); }
  q += ` ORDER BY o.is_urgent DESC,o.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit),(parseInt(page)-1)*parseInt(limit));
  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get()?.count || 0;
  res.json({ success:true, data: db.prepare(q).all(...params), meta:{ total } });
};