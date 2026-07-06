const express = require('express');
const router = express.Router();

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();

// =====================
// SAFE MIDDLEWARE IMPORT
// =====================
const authMiddleware = require('../middlewares/auth');
const authenticate = authMiddleware.authenticate;
const authorize = authMiddleware.authorize;


// =====================
// CONTROLLERS
// =====================
const auth = require('../controllers/authController');
const prod = require('../controllers/productController');
const cart = require('../controllers/cartController');
const ord = require('../controllers/orderController');
const del = require('../controllers/deliveryController');
const ana = require('../controllers/analyticsController');
const adm = require('../controllers/adminController');

// =====================
// NOTIFICATION SERVICE
// =====================
const NotificationService = require('../services/NotificationService');
const notif = new NotificationService(db);

// =====================
// AUTH ROUTES
// =====================
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/profile', authenticate, auth.getProfile);
router.put('/auth/profile', authenticate, auth.updateProfile);

// =====================
// PRODUCTS & CATEGORIES
// =====================
router.get('/categories', prod.getCategories);
router.get('/products', prod.getAll);
router.get('/products/seller', authenticate, authorize('seller'), prod.getSellerProducts);
router.get('/products/low-stock', authenticate, authorize('seller'), prod.getLowStock);
router.get('/products/:id', prod.getById);
router.post('/products', authenticate, authorize('seller', 'admin'), prod.create);
router.put('/products/:id', authenticate, authorize('seller', 'admin'), prod.update);
router.delete('/products/:id', authenticate, authorize('seller', 'admin'), prod.delete);

// =====================
// CART
// =====================
router.get('/cart', authenticate, authorize('customer'), cart.getCart);
router.post('/cart', authenticate, authorize('customer'), cart.addToCart);
router.put('/cart/:id', authenticate, authorize('customer'), cart.updateCartItem);
router.delete('/cart/:id', authenticate, authorize('customer'), cart.removeFromCart);
router.delete('/cart', authenticate, authorize('customer'), cart.clearCart);

// =====================
// ORDERS
// =====================
router.post('/orders', authenticate, authorize('customer'), ord.placeOrder);
router.get('/orders/my', authenticate, authorize('customer'), ord.getMyOrders);
router.get('/orders/seller', authenticate, authorize('seller'), ord.getSellerOrders);
router.get('/orders/all', authenticate, authorize('admin'), ord.getAllOrders);
router.get('/orders/:id', authenticate, ord.getOrderById);
router.put('/orders/:id/status', authenticate, authorize('seller', 'admin'), ord.updateOrderStatus);

// =====================
// DELIVERIES
// =====================
router.get('/deliveries/my', authenticate, authorize('driver'), del.getDriverDeliveries);
router.get('/deliveries/stats', authenticate, authorize('driver'), del.getDriverStats);
router.put('/deliveries/:id/status', authenticate, authorize('driver'), del.updateDeliveryStatus);
router.put('/deliveries/availability', authenticate, authorize('driver'), del.updateAvailability);
router.get('/deliveries/all', authenticate, authorize('admin'), del.getAllDeliveries);
router.post('/deliveries/assign', authenticate, authorize('admin'), del.assignDriver);

// =====================
// ANALYTICS
// =====================
router.get('/analytics/admin', authenticate, authorize('admin'), ana.getAdminDashboard);
router.get('/analytics/seller', authenticate, authorize('seller'), ana.getSellerAnalytics);
router.get('/analytics/vendor', authenticate, authorize('vendor'), ana.getVendorAnalytics);
router.get('/analytics/driver', authenticate, authorize('driver'), ana.getDriverAnalytics);

// =====================
// NOTIFICATIONS
// =====================
router.get('/notifications', authenticate, (req, res) =>
  res.json({
    success: true,
    data: notif.getUserNotifications(req.user.id)
  })
);

router.get('/notifications/unread-count', authenticate, (req, res) =>
  res.json({
    success: true,
    data: { count: notif.getUnreadCount(req.user.id) }
  })
);

router.put('/notifications/read-all', authenticate, (req, res) => {
  notif.markAllRead(req.user.id);
  res.json({ success: true });
});

router.put('/notifications/:id/read', authenticate, (req, res) => {
  notif.markRead(req.params.id, req.user.id);
  res.json({ success: true });
});

// =====================
// ADMIN
// =====================
router.get('/admin/users', authenticate, authorize('admin'), adm.getUsers);
router.put('/admin/users/:id/status', authenticate, authorize('admin'), adm.updateUserStatus);
router.put('/admin/vendors/:userId/approve', authenticate, authorize('admin'), adm.approveVendor);
router.put('/admin/drivers/:userId/approve', authenticate, authorize('admin'), adm.approveDriver);
router.get('/admin/pending-approvals', authenticate, authorize('admin'), adm.getPendingApprovals);
router.get('/admin/queue', authenticate, authorize('admin'), adm.getQueueStatus);
router.get('/admin/drivers', authenticate, authorize('admin'), adm.getAvailableDrivers);

// =====================
// REVIEWS
// =====================
router.post('/reviews', authenticate, authorize('customer'), (req, res) => {
  const { product_id, seller_id, order_id, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
  const existing = order_id
    ? db.prepare('SELECT id FROM reviews WHERE order_id=? AND customer_id=?').get(order_id, req.user.id)
    : null;
  if (existing)
    return res.status(409).json({ success: false, message: 'You have already reviewed this order' });
  db.prepare('INSERT INTO reviews (id,customer_id,product_id,seller_id,order_id,rating,comment) VALUES (?,?,?,?,?,?,?)')
    .run(uuidv4(), req.user.id, product_id || null, seller_id || null, order_id || null, rating, comment || null);
  res.status(201).json({ success: true, message: 'Review submitted' });
});

router.post('/reviews/site', authenticate, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
  db.prepare('INSERT INTO site_ratings (id,user_id,rating,comment) VALUES (?,?,?,?)')
    .run(uuidv4(), req.user.id, rating, comment || null);
  res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
});

// =====================
// HEALTH CHECK
// =====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hela Goviya API running ✓'
  });
});

// =====================
// EXPORT ROUTER
// =====================
module.exports = router;