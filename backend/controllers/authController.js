const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();

const generateToken = user =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'hela_goviya_secret', { expiresIn: '7d' });

exports.register = (req, res) => {
  try {
    const { name, email, password, role, phone, address, businessName, storeName, vehicleType, vehicleNumber } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
    if (!['customer','vendor','seller','driver'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const userId = uuidv4();
    db.prepare(`INSERT INTO users (id,name,email,password,role,phone,address,status) VALUES (?,?,?,?,?,?,?,?)`)
      .run(userId, name, email, bcrypt.hashSync(password, 10), role, phone || null, address || null,
           ['vendor','driver'].includes(role) ? 'pending' : 'active');

    if (role === 'vendor')
      db.prepare(`INSERT INTO vendor_profiles (id,user_id,business_name,approval_status) VALUES (?,?,?,'pending')`).run(uuidv4(), userId, businessName || `${name}'s Farm`);
    else if (role === 'seller')
      db.prepare(`INSERT INTO seller_profiles (id,user_id,store_name) VALUES (?,?,?)`).run(uuidv4(), userId, storeName || `${name}'s Store`);
    else if (role === 'driver')
      db.prepare(`INSERT INTO driver_profiles (id,user_id,vehicle_type,vehicle_number,approval_status) VALUES (?,?,?,?,'pending')`).run(uuidv4(), userId, vehicleType || 'Motorcycle', vehicleNumber || null);

    const user  = db.prepare('SELECT id,name,email,role,status FROM users WHERE id=?').get(userId);
    res.status(201).json({ success: true, message: 'Registration successful', data: { user, token: generateToken(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.status === 'suspended')
      return res.status(403).json({ success: false, message: 'Account suspended' });
    const { password: _, ...safe } = user;
    res.json({ success: true, message: 'Login successful', data: { user: safe, token: generateToken(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.getProfile = (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,phone,address,status,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  let profile = null;
  if (user.role === 'vendor')  profile = db.prepare('SELECT * FROM vendor_profiles  WHERE user_id=?').get(user.id);
  if (user.role === 'seller')  profile = db.prepare('SELECT * FROM seller_profiles  WHERE user_id=?').get(user.id);
  if (user.role === 'driver')  profile = db.prepare('SELECT * FROM driver_profiles  WHERE user_id=?').get(user.id);
  res.json({ success: true, data: { user, profile } });
};

exports.updateProfile = (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('UPDATE users SET name=?,phone=?,address=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name, phone, address, req.user.id);
  res.json({ success: true, message: 'Profile updated' });
};