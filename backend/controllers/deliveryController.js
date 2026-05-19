const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();
const NotificationService = require('../services/NotificationService');
const notif = new NotificationService(db);

exports.getDriverDeliveries = (req, res) => {
  const deliveries = db.prepare(`SELECT da.*,o.order_number,o.delivery_address,o.final_amount,o.is_urgent,o.priority_level,
    u.name as customer_name,u.phone as customer_phone FROM delivery_assignments da
    JOIN orders o ON da.order_id=o.id LEFT JOIN users u ON o.customer_id=u.id
    WHERE da.driver_id=? ORDER BY o.is_urgent DESC, da.created_at DESC`).all(req.user.id);
  const result = deliveries.map(d => ({ ...d, items: db.prepare(`SELECT oi.quantity,p.name FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`).all(d.order_id) }));
  res.json({ success:true, data:result });
};

exports.updateDeliveryStatus = (req, res) => {
  const { status, notes } = req.body;
  if (!['picked_up','on_the_way','delivered','failed'].includes(status))
    return res.status(400).json({ success:false, message:'Invalid status' });
  const delivery = db.prepare('SELECT * FROM delivery_assignments WHERE id=? AND driver_id=?').get(req.params.id, req.user.id);
  if (!delivery) return res.status(404).json({ success:false, message:'Not found' });

  const pickupTime   = status==='picked_up' ? new Date().toISOString() : null;
  const deliveryTime = status==='delivered' ? new Date().toISOString() : null;
  db.prepare(`UPDATE delivery_assignments SET status=?,notes=?,pickup_time=COALESCE(?,pickup_time),delivery_time=COALESCE(?,delivery_time),updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(status, notes||delivery.notes, pickupTime, deliveryTime, req.params.id);

  if (status==='delivered') {
    db.prepare(`UPDATE orders SET status='delivered',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(delivery.order_id);
    db.prepare(`UPDATE driver_profiles SET total_deliveries=total_deliveries+1,daily_earnings=daily_earnings+? WHERE user_id=?`).run(delivery.earnings||150, req.user.id);
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(delivery.order_id);
    if (order) notif.sendOrderUpdate(order.customer_id, order.order_number, 'delivered', order.id);
  } else if (status==='on_the_way') {
    db.prepare(`UPDATE orders SET status='dispatched' WHERE id=?`).run(delivery.order_id);
  }
  res.json({ success:true, message:'Status updated' });
};

exports.getDriverStats = (req, res) => {
  const stats          = db.prepare(`SELECT dp.*,u.name,u.phone FROM driver_profiles dp JOIN users u ON dp.user_id=u.id WHERE dp.user_id=?`).get(req.user.id);
  const todayCount     = db.prepare(`SELECT COUNT(*) as count FROM delivery_assignments WHERE driver_id=? AND DATE(delivery_time)=DATE('now') AND status='delivered'`).get(req.user.id)?.count||0;
  const pendingCount   = db.prepare(`SELECT COUNT(*) as count FROM delivery_assignments WHERE driver_id=? AND status IN ('assigned','picked_up','on_the_way')`).get(req.user.id)?.count||0;
  res.json({ success:true, data:{ ...stats, today_deliveries:todayCount, pending_deliveries:pendingCount } });
};

exports.updateAvailability = (req, res) => {
  const { availability } = req.body;
  if (!['online','offline','busy'].includes(availability))
    return res.status(400).json({ success:false, message:'Invalid availability' });
  db.prepare('UPDATE driver_profiles SET availability=? WHERE user_id=?').run(availability, req.user.id);
  res.json({ success:true, message:`Status set to ${availability}` });
};

exports.getAllDeliveries = (req, res) => {
  const deliveries = db.prepare(`SELECT da.*,o.order_number,o.delivery_address,u.name as driver_name,c.name as customer_name
    FROM delivery_assignments da JOIN orders o ON da.order_id=o.id LEFT JOIN users u ON da.driver_id=u.id LEFT JOIN users c ON o.customer_id=c.id
    ORDER BY da.created_at DESC LIMIT 100`).all();
  res.json({ success:true, data:deliveries });
};

exports.assignDriver = (req, res) => {
  const { order_id, driver_id } = req.body;
  const exists = db.prepare('SELECT id FROM delivery_assignments WHERE order_id=?').get(order_id);
  if (exists) db.prepare('UPDATE delivery_assignments SET driver_id=?,status="assigned",updated_at=CURRENT_TIMESTAMP WHERE order_id=?').run(driver_id, order_id);
  else db.prepare('INSERT INTO delivery_assignments (id,order_id,driver_id,status,earnings) VALUES (?,?,?,"assigned",150)').run(uuidv4(),order_id,driver_id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(order_id);
  notif.create(driver_id,'New Delivery Assigned 🚚',`Order ${order?.order_number} assigned to you.`,'info',order_id,'order');
  res.json({ success:true, message:'Driver assigned' });
};