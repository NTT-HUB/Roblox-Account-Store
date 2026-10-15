require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = process.env.DB_FILE || 'shop.db';
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const adminCount = db.prepare('SELECT COUNT(*) c FROM admins').get().c;
if (adminCount === 0) {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', bcrypt.hashSync('admin123', 10));
  console.log('Created admin / admin123');
}

function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/d/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const cats = [
  { name: 'Acc Roblox trang', description: 'Acc moi tao, chua choi game nao', sort_order: 1 },
  { name: 'Acc Roblox VIP', description: 'Acc co nhieu game, item xin', sort_order: 2 },
  { name: 'Acc Limited', description: 'Acc co item limited quy', sort_order: 3 },
  { name: 'Acc co Robux', description: 'Acc kem so du Robux', sort_order: 4 }
];

const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)');
for (const c of cats) insertCat.run(c.name, slugify(c.name), c.description, c.sort_order);

const catMap = {};
for (const row of db.prepare('SELECT id, slug FROM categories').all()) catMap[row.slug] = row.id;

const products = [
  { cat: 'acc-roblox-trang', title: 'Acc Roblox trang 001', price: 15000, stock: 1, u: 'roblox_newbie01', p: 'pass_newbie01', e: 'nb01@mail.local', desc: 'Acc trang, chua verify email.' },
  { cat: 'acc-roblox-trang', title: 'Acc Roblox trang 002', price: 15000, stock: 1, u: 'roblox_newbie02', p: 'pass_newbie02', e: 'nb02@mail.local', desc: 'Acc trang, chua verify email.' },
  { cat: 'acc-roblox-vip', title: 'Acc Roblox VIP Blox Fruits Lv 1000', price: 250000, stock: 1, u: 'vip_bf_max', p: 'vip_bf_pass', e: 'bfvip@mail.local', desc: 'Acc co Blox Fruits level 1000+, nhieu fruit xin.' },
  { cat: 'acc-roblox-vip', title: 'Acc Roblox VIP Adopt Me full pet', price: 320000, stock: 1, u: 'vip_adoptme', p: 'adoptme_pass', e: 'am@mail.local', desc: 'Acc Adopt Me co nhieu pet legendary.' },
  { cat: 'acc-limited', title: 'Acc Limited co Dominus', price: 1500000, stock: 1, u: 'limited_dom', p: 'dom_pass', e: 'dom@mail.local', desc: 'Acc co Dominus nhieu mau.' },
  { cat: 'acc-co-robux', title: 'Acc co 1000 Robux', price: 180000, stock: 1, u: 'robux_1k', p: 'robux_1k_pass', e: 'r1k@mail.local', desc: 'Acc co san 1000 Robux trong vi.' },
  { cat: 'acc-co-robux', title: 'Acc co 5000 Robux', price: 800000, stock: 1, u: 'robux_5k', p: 'robux_5k_pass', e: 'r5k@mail.local', desc: 'Acc co san 5000 Robux.' }
];

const insertProd = db.prepare('INSERT INTO products (category_id, title, slug, description, price, stock, roblox_username, roblox_password, roblox_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'available\')');
let n = 0;
for (const p of products) {
  const cid = catMap[p.cat];
  if (!cid) continue;
  const slug = slugify(p.title);
  const exists = db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug);
  if (exists) continue;
  insertProd.run(cid, p.title, slug, p.desc, p.price, p.stock, p.u, p.p, p.e);
  n++;
}

console.log('Seed done: ' + n + ' products, ' + Object.keys(catMap).length + ' categories.');
