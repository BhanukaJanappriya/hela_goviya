const { v4: uuidv4 } = require('uuid');
const db = require('../database/db').getDb();

exports.getCart = (req, res) => {
  const items = db.prepare(`SELECT c.id,c.quantity,p.id as product_id,p.name,p.price,p.unit,p.stock,(p.price*c.quantity) as subtotal
    FROM carts c JOIN products p ON c.product_id=p.id WHERE c.customer_id=? AND p.status='active'`).all(req.user.id);
  res.json({ success:true, data:{ items, total:items.reduce((s,i)=>s+i.subtotal,0), count:items.length } });
};

exports.addToCart = (req, res) => {
  const { product_id, quantity=1 } = req.body;
  const product = db.prepare(`SELECT * FROM products WHERE id=? AND status='active'`).get(product_id);
  if (!product) return res.status(404).json({ success:false, message:'Product not found' });
  if (product.stock < quantity) return res.status(400).json({ success:false, message:'Insufficient stock' });
  const existing = db.prepare('SELECT id,quantity FROM carts WHERE customer_id=? AND product_id=?').get(req.user.id, product_id);
  if (existing) db.prepare('UPDATE carts SET quantity=? WHERE id=?').run(existing.quantity+quantity, existing.id);
  else db.prepare('INSERT INTO carts (id,customer_id,product_id,quantity) VALUES (?,?,?,?)').run(uuidv4(), req.user.id, product_id, quantity);
  res.json({ success:true, message:'Added to cart' });
};

exports.updateCartItem = (req, res) => {
  const { quantity } = req.body;
  if (quantity <= 0) {
    db.prepare('DELETE FROM carts WHERE id=? AND customer_id=?').run(req.params.id, req.user.id);
    return res.json({ success:true, message:'Item removed' });
  }
  db.prepare('UPDATE carts SET quantity=? WHERE id=? AND customer_id=?').run(quantity, req.params.id, req.user.id);
  res.json({ success:true, message:'Cart updated' });
};

exports.removeFromCart = (req, res) => {
  db.prepare('DELETE FROM carts WHERE id=? AND customer_id=?').run(req.params.id, req.user.id);
  res.json({ success:true, message:'Removed' });
};

exports.clearCart = (req, res) => {
  db.prepare('DELETE FROM carts WHERE customer_id=?').run(req.user.id);
  res.json({ success:true, message:'Cart cleared' });
};