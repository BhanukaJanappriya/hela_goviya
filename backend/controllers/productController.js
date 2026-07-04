const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();

exports.getAll = (req, res) => {
  const { category, search, organic, featured, page = 1, limit = 20 } = req.query;
  let q = `SELECT p.*,c.name as category_name,c.icon as category_icon,u.name as seller_name
           FROM products p
           LEFT JOIN categories c ON p.category_id=c.id
           LEFT JOIN users u ON p.seller_id=u.id
           WHERE p.status='active'`;
  const params = [];
  if (category)      { q += ` AND c.slug=?`;                                   params.push(category); }
  if (search)        { q += ` AND (p.name LIKE ? OR p.description LIKE ?)`;    params.push(`%${search}%`,`%${search}%`); }
  if (organic==='1') { q += ` AND p.is_organic=1`; }
  if (featured==='1'){ q += ` AND p.is_featured=1`; }
  q += ` ORDER BY p.is_featured DESC, p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page)-1)*parseInt(limit));
  const products = db.prepare(q).all(...params);
  const total    = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='active'`).get()?.count || 0;
  res.json({ success:true, data:products, meta:{ total, page:+page, limit:+limit } });
};

exports.getById = (req, res) => {
  const product = db.prepare(`SELECT p.*,c.name as category_name,c.icon as category_icon,u.name as seller_name
    FROM products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN users u ON p.seller_id=u.id WHERE p.id=?`).get(req.params.id);
  if (!product) return res.status(404).json({ success:false, message:'Product not found' });
  const reviews = db.prepare(`SELECT r.*,u.name as customer_name FROM reviews r JOIN users u ON r.customer_id=u.id WHERE r.product_id=? ORDER BY r.created_at DESC LIMIT 10`).all(req.params.id);
  res.json({ success:true, data:{ ...product, reviews } });
};

exports.create = (req, res) => {
  const { name, description, price, original_price, unit, stock, category_id, is_organic, vendor_id, image_url } = req.body;
  if (!name || !price || !category_id) return res.status(400).json({ success:false, message:'Name, price, category required' });
  const id = uuidv4();
  const images = JSON.stringify(image_url ? [image_url] : []);
  db.prepare(`INSERT INTO products (id,seller_id,vendor_id,category_id,name,description,price,original_price,unit,stock,is_organic,images,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active')`)
    .run(id, req.user.id, vendor_id||null, category_id, name, description||'', price, original_price||price, unit||'kg', stock||0, is_organic?1:0, images);
  res.status(201).json({ success:true, message:'Product created', data:{ id } });
};

exports.update = (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ success:false, message:'Not found' });
  if (req.user.role!=='admin' && p.seller_id!==req.user.id)
    return res.status(403).json({ success:false, message:'Not authorized' });
  const { name, description, price, original_price, unit, stock, is_organic, status, image_url } = req.body;
  let images = p.images;
  if (image_url !== undefined) images = JSON.stringify(image_url ? [image_url] : []);
  db.prepare(`UPDATE products SET name=?,description=?,price=?,original_price=?,unit=?,stock=?,is_organic=?,images=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name||p.name, description||p.description, price||p.price, original_price||p.original_price,
         unit||p.unit, stock!==undefined?stock:p.stock, is_organic!==undefined?(is_organic?1:0):p.is_organic, images, status||p.status, req.params.id);
  res.json({ success:true, message:'Product updated' });
};

exports.delete = (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ success:false, message:'Not found' });
  if (req.user.role!=='admin' && p.seller_id!==req.user.id)
    return res.status(403).json({ success:false, message:'Not authorized' });
  db.prepare(`UPDATE products SET status='inactive' WHERE id=?`).run(req.params.id);
  res.json({ success:true, message:'Product removed' });
};

exports.getSellerProducts = (req, res) => {
  const products = db.prepare(`SELECT p.*,c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.seller_id=? ORDER BY p.created_at DESC`).all(req.user.id);
  res.json({ success:true, data:products });
};

exports.getLowStock = (req, res) => {
  const products = db.prepare(`SELECT * FROM products WHERE stock<=min_stock_alert AND seller_id=? AND status='active'`).all(req.user.id);
  res.json({ success:true, data:products });
};

exports.getCategories = (req, res) => {
  res.json({ success:true, data: db.prepare('SELECT * FROM categories ORDER BY name').all() });
};