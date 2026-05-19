const { v4: uuidv4 } = require('uuid');

class NotificationService {
  constructor(db) { this.db = db; this.observers = []; }

  subscribe(observer) { this.observers.push(observer); }
  notify(event, data) { this.observers.forEach(o => o.update && o.update(event, data)); }

  create(userId, title, message, type = 'info', referenceId = null, referenceType = null) {
    const id = uuidv4();
    this.db.prepare(`INSERT INTO notifications (id,user_id,title,message,type,reference_id,reference_type) VALUES (?,?,?,?,?,?,?)`)
      .run(id, userId, title, message, type, referenceId, referenceType);
    this.notify('new_notification', { userId, title, message });
    return id;
  }

  getUserNotifications(userId, limit = 25) {
    return this.db.prepare(`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
  }

  getUnreadCount(userId) {
    return this.db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0`).get(userId)?.count || 0;
  }

  markRead(id, userId)  { this.db.prepare(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`).run(id, userId); }
  markAllRead(userId)   { this.db.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`).run(userId); }

  sendOrderUpdate(customerId, orderNumber, status, orderId) {
    const map = {
      confirmed:  { title: 'Order Confirmed ✓',    msg: `Your order ${orderNumber} has been confirmed!`,   type: 'success' },
      processing: { title: 'Order Processing ⚙️',   msg: `Order ${orderNumber} is being prepared.`,         type: 'info'    },
      dispatched: { title: 'Order Dispatched 🚚',   msg: `Your order ${orderNumber} is on its way!`,        type: 'info'    },
      delivered:  { title: 'Order Delivered ✓',    msg: `Order ${orderNumber} delivered. Enjoy!`,           type: 'success' },
      cancelled:  { title: 'Order Cancelled',       msg: `Order ${orderNumber} has been cancelled.`,         type: 'error'   },
    };
    const n = map[status];
    if (n) this.create(customerId, n.title, n.msg, n.type, orderId, 'order');
  }
}

module.exports = NotificationService;