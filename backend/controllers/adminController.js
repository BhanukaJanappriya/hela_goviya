const db = require('../database/db').getDb();
const NotificationService = require('../services/NotificationService');
const notif = new NotificationService(db);

exports.getUsers = (req, res) => {
  const { role, status } = req.query;
  let q = `SELECT id,name,email,role,phone,status,created_at FROM users WHERE 1=1`;
  const p = [];
  if (role)   { q+=` AND role=?`;   p.push(role); }
  if (status) { q+=` AND status=?`; p.push(status); }
  q += ` ORDER BY created_at DESC`;
  res.json({ success:true, data: db.prepare(q).all(...p) });
};

exports.updateUserStatus = (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);
  notif.create(req.params.id,'Account Status Updated',`Your account is now ${status}.`, status==='active'?'success':'warning');
  res.json({ success:true, message:'User status updated' });
};

exports.approveVendor = (req, res) => {
  const { status } = req.body;
  const v = db.prepare('SELECT * FROM vendor_profiles WHERE user_id=?').get(req.params.userId);
  if (!v) return res.status(404).json({ success:false, message:'Vendor not found' });
  db.prepare('UPDATE vendor_profiles SET approval_status=? WHERE user_id=?').run(status, req.params.userId);
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status==='approved'?'active':'inactive', req.params.userId);
  notif.create(req.params.userId,
    status==='approved'?'Vendor Application Approved ✓':'Vendor Application Rejected',
    status==='approved'?'Congratulations! Your vendor account is approved.':'Your vendor application was not approved.',
    status==='approved'?'success':'error');
  res.json({ success:true, message:`Vendor ${status}` });
};

exports.approveDriver = (req, res) => {
  const { status } = req.body;
  const d = db.prepare('SELECT * FROM driver_profiles WHERE user_id=?').get(req.params.userId);
  if (!d) return res.status(404).json({ success:false, message:'Driver not found' });
  db.prepare('UPDATE driver_profiles SET approval_status=? WHERE user_id=?').run(status, req.params.userId);
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status==='approved'?'active':'inactive', req.params.userId);
  notif.create(req.params.userId,
    status==='approved'?'Driver Application Approved ✓':'Driver Application Rejected',
    status==='approved'?'Your driver account is approved. Start accepting deliveries!':'Your driver application was not approved.',
    status==='approved'?'success':'error');
  res.json({ success:true, message:`Driver ${status}` });
};

exports.getPendingApprovals = (req, res) => {
  const vendors = db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.created_at,vp.business_name,vp.location,vp.approval_status FROM users u JOIN vendor_profiles vp ON u.id=vp.user_id WHERE vp.approval_status='pending'`).all();
  const drivers = db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.created_at,dp.vehicle_type,dp.vehicle_number,dp.approval_status FROM users u JOIN driver_profiles dp ON u.id=dp.user_id WHERE dp.approval_status='pending'`).all();
  res.json({ success:true, data:{ vendors, drivers } });
};

exports.getQueueStatus = (req, res) => {
  const QueueService = require('../services/QueueService');
  const queue = new QueueService(db);
  res.json({ success:true, data:{ stats:queue.getStats(), orderQueue:queue.getQueue('order'), allQueues:queue.getQueue('delivery') } });
};

exports.getAvailableDrivers = (req, res) => {
  const drivers = db.prepare(`SELECT u.id,u.name,u.phone,dp.vehicle_type,dp.availability,dp.total_deliveries,dp.rating FROM users u JOIN driver_profiles dp ON u.id=dp.user_id WHERE dp.approval_status='approved' ORDER BY dp.availability DESC,dp.rating DESC`).all();
  res.json({ success:true, data:drivers });
};