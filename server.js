require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || 'shop.db';

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

(function ensureAdmin() {
  const row = db.prepare('SELECT COUNT(*) AS c FROM admins').get();
  if (row.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('[init] Default admin created: admin / admin123');
  }
})();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

app.use((req, res, next) => {
  res.locals.currentAdmin = req.session.admin || null;
  res.locals.formatVnd = (n) => Number(n || 0).toLocaleString('vi-VN') + 'd';
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + i.qty, 0);
  next();
});

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/d/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}
function uniqueSlug(table, base) {
  let s = base, n = 2;
  const q = db.prepare('SELECT 1 FROM ' + table + ' WHERE slug = ?');
  while (q.get(s)) { s = base + '-' + n++; }
  return s;
}
function genOrderCode() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return 'ORD' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  next();
}
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

app.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  const featured = db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.status='available' ORDER BY p.id DESC LIMIT 8").all();
  res.render('home', { categories, featured });
});

app.get('/shop', (req, res) => {
  const cat = req.query.cat; const q = req.query.q;
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  let sql = "SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.status='available'";
  const params = [];
  let activeCat = null;
  if (cat) {
    const c = db.prepare('SELECT * FROM categories WHERE slug = ?').get(cat);
    if (c) { sql += ' AND p.category_id = ?'; params.push(c.id); activeCat = c; }
  }
  if (q) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push('%' + q + '%', '%' + q + '%'); }
  sql += ' ORDER BY p.id DESC';
  const products = db.prepare(sql).all(...params);
  res.render('shop', { categories, products, activeCat, q: q || '' });
});

app.get('/product/:slug', (req, res) => {
  const p = db.prepare("SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.slug = ?").get(req.params.slug);
  if (!p) return res.status(404).render('404');
  const related = db.prepare("SELECT p.* FROM products p WHERE p.category_id = ? AND p.id <> ? AND p.status='available' LIMIT 4").all(p.category_id, p.id);
  res.render('product', { p, related });
});

app.post('/cart/add', (req, res) => {
  const id = parseInt(req.body.product_id, 10);
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND status='available'").get(id);
  if (!p) return res.redirect('back');
  req.session.cart = req.session.cart || [];
  const ex = req.session.cart.find(i => i.id === id);
  if (ex) ex.qty = 1;
  else req.session.cart.push({ id: p.id, title: p.title, price: p.price, qty: 1 });
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const id = parseInt(req.body.product_id, 10);
  req.session.cart = (req.session.cart || []).filter(i => i.id !== id);
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.render('cart', { cart, total });
});

app.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.render('checkout', { cart, total });
});

app.post('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const buyer_name = req.body.buyer_name, buyer_contact = req.body.buyer_contact, note = req.body.note;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const code = genOrderCode();
  tx(() => {
    const info = db.prepare('INSERT INTO orders (code, buyer_name, buyer_contact, total, status, note) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, buyer_name || '', buyer_contact || '', total, 'pending', note || '');
    const oid = info.lastInsertRowid;
    const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, price, snapshot_title) VALUES (?, ?, ?, ?)');
    for (const i of cart) insItem.run(oid, i.id, i.price, i.title);
  });
  req.session.cart = [];
  res.render('order_success', { code });
});

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});
app.post('/admin/login', (req, res) => {
  const username = req.body.username, password = req.body.password;
  const a = db.prepare('SELECT * FROM admins WHERE username = ?').get(username || '');
  if (!a || !bcrypt.compareSync(password || '', a.password_hash)) {
    return res.render('admin/login', { error: 'Sai tai khoan hoac mat khau' });
  }
  req.session.admin = { id: a.id, username: a.username };
  res.redirect('/admin');
});
app.post('/admin/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const stats = {
    products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
    available: db.prepare("SELECT COUNT(*) c FROM products WHERE status='available'").get().c,
    sold: db.prepare("SELECT COUNT(*) c FROM products WHERE status='sold'").get().c,
    categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    orders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status IN ('paid','delivered')").get().s
  };
  const recent = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all();
  res.render('admin/dashboard', { stats, recent });
});

app.get('/admin/categories', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c ORDER BY sort_order, id').all();
  res.render('admin/categories', { categories });
});
app.post('/admin/categories', requireAdmin, (req, res) => {
  const name = req.body.name, description = req.body.description, sort_order = req.body.sort_order;
  try {
    const slug = uniqueSlug('categories', slugify(name));
    db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)')
      .run(name, slug, description || '', parseInt(sort_order, 10) || 0);
  } catch (e) {}
  res.redirect('/admin/categories');
});
app.post('/admin/categories/:id/update', requireAdmin, (req, res) => {
  const name = req.body.name, description = req.body.description, sort_order = req.body.sort_order;
  db.prepare('UPDATE categories SET name=?, description=?, sort_order=? WHERE id=?')
    .run(name, description || '', parseInt(sort_order, 10) || 0, req.params.id);
  res.redirect('/admin/categories');
});
app.post('/admin/categories/:id/delete', requireAdmin, (req, res) => {
  const cnt = db.prepare('SELECT COUNT(*) c FROM products WHERE category_id = ?').get(req.params.id).c;
  if (cnt === 0) db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.redirect('/admin/categories');
});

app.get('/admin/products', requireAdmin, (req, res) => {
  const cat = req.query.cat, q = req.query.q;
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  let sql = 'SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE 1=1';
  const params = [];
  if (cat) { sql += ' AND c.id = ?'; params.push(cat); }
  if (q) { sql += ' AND p.title LIKE ?'; params.push('%' + q + '%'); }
  sql += ' ORDER BY p.id DESC';
  const products = db.prepare(sql).all(...params);
  res.render('admin/products', { products, categories, cat: cat || '', q: q || '' });
});
app.get('/admin/products/new', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.render('admin/product_form', { p: null, categories, error: null });
});
app.post('/admin/products/new', requireAdmin, (req, res) => {
  const b = req.body;
  try {
    const slug = uniqueSlug('products', slugify(b.title));
    db.prepare('INSERT INTO products (category_id, title, slug, description, price, stock, roblox_username, roblox_password, roblox_email, extra_info, thumbnail_url, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(b.category_id, b.title, slug, b.description || '', parseInt(b.price, 10) || 0, parseInt(b.stock, 10) || 1,
           b.roblox_username || '', b.roblox_password || '', b.roblox_email || '', b.extra_info || '', b.thumbnail_url || '', b.status || 'available');
    res.redirect('/admin/products');
  } catch (e) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
    res.render('admin/product_form', { p: b, categories, error: e.message });
  }
});
app.get('/admin/products/:id/edit', requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.redirect('/admin/products');
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.render('admin/product_form', { p, categories, error: null });
});
app.post('/admin/products/:id/edit', requireAdmin, (req, res) => {
  const b = req.body;
  try {
    db.prepare('UPDATE products SET category_id=?, title=?, description=?, price=?, stock=?, roblox_username=?, roblox_password=?, roblox_email=?, extra_info=?, thumbnail_url=?, status=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(b.category_id, b.title, b.description || '', parseInt(b.price, 10) || 0, parseInt(b.stock, 10) || 1,
           b.roblox_username || '', b.roblox_password || '', b.roblox_email || '', b.extra_info || '', b.thumbnail_url || '', b.status || 'available',
           req.params.id);
    res.redirect('/admin/products');
  } catch (e) {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
    res.render('admin/product_form', { p: Object.assign({}, b, { id: req.params.id }), categories, error: e.message });
  }
});
app.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  try { db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id); } catch (e) {}
  res.redirect('/admin/products');
});

app.get('/admin/orders', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.render('admin/orders', { orders });
});
app.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.redirect('/admin/orders');
  const items = db.prepare('SELECT oi.*, p.roblox_username, p.roblox_password, p.roblox_email, p.extra_info FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(o.id);
  res.render('admin/order_detail', { o, items });
});
app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const status = req.body.status;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (status === 'delivered' || status === 'paid') {
    const items = db.prepare('SELECT product_id FROM order_items WHERE order_id = ?').all(req.params.id);
    const upd = db.prepare("UPDATE products SET status='sold' WHERE id = ?");
    for (const it of items) upd.run(it.product_id);
  }
  res.redirect('/admin/orders/' + req.params.id);
});

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log('Shop running: http://localhost:' + PORT);
  console.log('Admin:        http://localhost:' + PORT + '/admin/login  (admin / admin123)');
});
