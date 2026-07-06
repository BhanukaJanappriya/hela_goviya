const db = require('../database/db').getDb();

exports.getAdminDashboard = (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);

  const totalUsers      = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role!='admin'`).get()?.c||0;
  const totalOrders     = db.prepare(`SELECT COUNT(*) as c FROM orders`).get()?.c||0;
  const totalRevenue    = db.prepare(`SELECT SUM(final_amount) as t FROM orders WHERE status='delivered'`).get()?.t||0;
  const pendingOrders   = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status='pending'`).get()?.c||0;
  const deliveredOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status='delivered'`).get()?.c||0;
  const pendingVendors  = db.prepare(`SELECT COUNT(*) as c FROM vendor_profiles WHERE approval_status='pending'`).get()?.c||0;
  const pendingDrivers  = db.prepare(`SELECT COUNT(*) as c FROM driver_profiles WHERE approval_status='pending'`).get()?.c||0;
  const activeDrivers   = db.prepare(`SELECT COUNT(*) as c FROM driver_profiles WHERE availability='online'`).get()?.c||0;
  const newUsersWeek    = db.prepare(`SELECT COUNT(*) as c FROM users WHERE created_at>=DATE('now','-7 days') AND role!='admin'`).get()?.c||0;
  const ratingRow       = db.prepare(`SELECT ROUND(AVG(rating),1) as avg, COUNT(*) as total FROM site_ratings`).get();

  const recentOrders    = db.prepare(`SELECT o.*,u.name as customer_name FROM orders o LEFT JOIN users u ON o.customer_id=u.id ORDER BY o.created_at DESC LIMIT 10`).all();
  const ordersByStatus  = db.prepare(`SELECT status,COUNT(*) as count FROM orders GROUP BY status`).all();
  const salesByDay      = db.prepare(`SELECT DATE(created_at) as date,COUNT(*) as orders,SUM(final_amount) as revenue FROM orders WHERE status!='cancelled' AND created_at>=DATE('now','-${days} days') GROUP BY DATE(created_at) ORDER BY date`).all();
  const topProducts     = db.prepare(`SELECT p.name,SUM(oi.quantity) as total_sold,SUM(oi.total_price) as revenue FROM order_items oi JOIN products p ON oi.product_id=p.id GROUP BY p.id ORDER BY revenue DESC LIMIT 5`).all();
  const usersByRole     = db.prepare(`SELECT role,COUNT(*) as count FROM users GROUP BY role`).all();
  const ordersByPayment = db.prepare(`SELECT payment_method,COUNT(*) as count FROM orders GROUP BY payment_method`).all();

  res.json({ success:true, data:{
    summary:{ totalUsers,totalOrders,totalRevenue,pendingOrders,deliveredOrders,pendingVendors,pendingDrivers,activeDrivers,newUsersWeek,avgRating:ratingRow?.avg||null,totalRatings:ratingRow?.total||0 },
    recentOrders,ordersByStatus,salesByDay,topProducts,usersByRole,ordersByPayment
  }});
};

exports.getSellerAnalytics = (req, res) => {
  const id = req.user.id;
  const totalOrders   = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE seller_id=?`).get(id)?.c||0;
  const totalRevenue  = db.prepare(`SELECT SUM(final_amount) as t FROM orders WHERE seller_id=? AND status='delivered'`).get(id)?.t||0;
  const pendingOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE seller_id=? AND status='pending'`).get(id)?.c||0;
  const activeProducts= db.prepare(`SELECT COUNT(*) as c FROM products WHERE seller_id=? AND status='active'`).get(id)?.c||0;
  const recentOrders  = db.prepare(`SELECT o.*,u.name as customer_name FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.seller_id=? ORDER BY o.created_at DESC LIMIT 10`).all(id);
  const topProducts   = db.prepare(`SELECT p.name,SUM(oi.quantity) as total_sold,SUM(oi.total_price) as revenue FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE p.seller_id=? GROUP BY p.id ORDER BY total_sold DESC LIMIT 5`).all(id);
  const salesByDay    = db.prepare(`SELECT DATE(created_at) as date,COUNT(*) as orders,SUM(final_amount) as revenue FROM orders WHERE seller_id=? AND status!='cancelled' AND created_at>=DATE('now','-7 days') GROUP BY DATE(created_at) ORDER BY date`).all(id);
  res.json({ success:true, data:{ summary:{ totalOrders,totalRevenue,pendingOrders,activeProducts }, recentOrders,topProducts,salesByDay } });
};

exports.getVendorAnalytics = (req, res) => {
  const id = req.user.id;
  const totalProducts = db.prepare(`SELECT COUNT(*) as c FROM products WHERE vendor_id=?`).get(id)?.c||0;
  const lowStock      = db.prepare(`SELECT COUNT(*) as c FROM products WHERE vendor_id=? AND stock<=min_stock_alert`).get(id)?.c||0;
  const recentProducts= db.prepare(`SELECT * FROM products WHERE vendor_id=? ORDER BY updated_at DESC LIMIT 10`).all(id);
  res.json({ success:true, data:{ summary:{ totalProducts,lowStock }, recentProducts } });
};

exports.getDriverAnalytics = (req, res) => {
  const id = req.user.id;
  const stats = db.prepare(`SELECT * FROM driver_profiles WHERE user_id=?`).get(id);
  const monthlyEarnings = db.prepare(`SELECT DATE(delivery_time) as date,SUM(earnings) as earnings,COUNT(*) as deliveries FROM delivery_assignments WHERE driver_id=? AND status='delivered' AND delivery_time>=DATE('now','-30 days') GROUP BY DATE(delivery_time) ORDER BY date`).all(id);
  res.json({ success:true, data:{ stats, monthlyEarnings } });
};