# 📖 How To Use — Roblox Acc Shop

Hướng dẫn cài đặt, chạy và sử dụng web shop bán acc Roblox.

---

## 1. Yêu cầu hệ thống

- **Node.js ≥ 22.5** (bắt buộc, vì dùng `node:sqlite` built-in)
  - Kiểm tra: `node --version`
  - Nếu thấp hơn, tải tại https://nodejs.org (chọn bản LTS mới nhất)
- **npm** (đi kèm Node.js)
- Windows / macOS / Linux đều chạy được

---

## 2. Cài đặt lần đầu

Mở PowerShell / Terminal tại thư mục dự án:

```powershell
# 1. Cài dependencies
npm install

# 2. Tạo database + dữ liệu mẫu (admin, danh mục, acc)
npm run seed

# 3. Chạy server
npm start
```

Sau khi chạy, terminal sẽ hiện:
```
Shop running: http://localhost:3000
Admin:        http://localhost:3000/admin/login  (admin / admin123)
```

Mở trình duyệt truy cập **http://localhost:3000**

---

## 3. Đăng nhập Admin

- URL: **http://localhost:3000/admin/login**
- Tài khoản mặc định:
  - **Username:** `admin`
  - **Password:** `admin123`

> ⚠️ **Đổi mật khẩu ngay** sau khi deploy lên môi trường thật.

---

## 4. Hướng dẫn sử dụng Admin

### 4.1. Quản lý danh mục

Vào menu **📁 Danh mục**

- **Thêm danh mục:** nhập tên + mô tả + thứ tự hiển thị → bấm **Thêm**
- **Sửa danh mục:** sửa trực tiếp ô trên bảng → bấm **Lưu**
- **Xoá danh mục:** chỉ xoá được khi danh mục **không còn acc nào**. Muốn xoá thì chuyển acc sang danh mục khác trước.

### 4.2. Quản lý Acc (sản phẩm)

Vào menu **🎮 Acc / Sản phẩm**

**Thêm acc mới:**
1. Bấm **+ Thêm acc**
2. Điền các trường:
   - **Tiêu đề** — vd: `Acc Roblox VIP Blox Fruits Lv 1000`
   - **Danh mục** — chọn từ dropdown
   - **Giá (VND)** — số nguyên, vd: `250000`
   - **Kho** — số lượng có sẵn (thường = 1 với acc độc nhất)
   - **Trạng thái** — `available` (đang bán) / `sold` (đã bán) / `hidden` (ẩn)
   - **Ảnh (URL)** — dán link ảnh (tùy chọn)
   - **Mô tả** — thông tin chi tiết hiển thị cho khách
   - **Username / Password / Email Roblox** — thông tin đăng nhập acc (⚠️ chỉ admin xem được)
   - **Thông tin thêm** — vd: `2FA bật`, `email gốc`, `level`, v.v.
3. Bấm **Lưu**

**Sửa acc:** bấm **Sửa** ở cột hành động → sửa → **Lưu**

**Xoá acc:** bấm **Xoá** (có xác nhận)

**Lọc / tìm:** dùng dropdown danh mục và ô tìm kiếm phía trên bảng.

### 4.3. Quản lý Đơn hàng

Vào menu **🧾 Đơn hàng**

- Xem danh sách toàn bộ đơn, sắp xếp mới nhất trước
- Bấm **Xem** để vào chi tiết đơn

**Trong chi tiết đơn:**
- Xem thông tin khách (tên, liên hệ), ghi chú, tổng tiền
- **Xem bảng acc trong đơn** — bao gồm **username / password / email Roblox** để giao khách
- **Cập nhật trạng thái:**
  - `pending` — khách vừa đặt, chờ thanh toán
  - `paid` — khách đã thanh toán
  - `delivered` — đã giao acc
  - `cancelled` — huỷ đơn

> Khi đặt trạng thái `paid` hoặc `delivered`, các acc trong đơn sẽ **tự động chuyển sang `sold`** (không còn hiện trên shop).

---

## 5. Hướng dẫn cho Khách hàng (shop)

### 5.1. Mua acc

1. Vào **Cửa hàng** (`/shop`)
2. Chọn danh mục hoặc tìm theo tên
3. Bấm vào acc muốn xem → trang chi tiết
4. Bấm **Thêm vào giỏ**
5. Vào **Giỏ hàng** (biểu tượng trên header)
6. Bấm **Thanh toán**
7. Điền **Họ tên**, **Liên hệ** (Discord/Facebook/SĐT), **Ghi chú** → **Đặt hàng**
8. Nhận **mã đơn** (vd: `ORD20251015-AB12CD`)

### 5.2. Nhận acc

- Sau khi đặt, admin sẽ **liên hệ qua thông tin bạn cung cấp**
- Thanh toán theo hướng dẫn của admin
- Admin xác nhận và gửi **username / password acc** cho bạn

---

## 6. Tuỳ chỉnh cấu hình

Mở file `.env`:

```
PORT=3000
SESSION_SECRET=change-me-in-production-please-32chars-min
DB_FILE=shop.db
```

- **PORT** — cổng server (mặc định 3000)
- **SESSION_SECRET** — chuỗi bí mật cho session, **đổi thành chuỗi ngẫu nhiên ≥ 32 ký tự**
- **DB_FILE** — tên file SQLite (mặc định `shop.db`)

---

## 7. Xử lý sự cố thường gặp

### Lỗi: `Cannot find module 'better-sqlite3'` hoặc crash native module
→ Không dùng file `server.js` cũ. Phiên bản hiện tại đã dùng `node:sqlite` built-in, cần **Node ≥ 22.5**.

### Lỗi: `Error: Cannot find module 'node:sqlite'`
→ Node của bạn cũ hơn 22.5. Nâng cấp Node lên bản LTS mới.

### Lỗi: cổng 3000 đã bị chiếm
→ Đổi `PORT` trong `.env`, ví dụ `PORT=3001`.

### Muốn reset database
```powershell
Remove-Item shop.db*
npm run seed
```

### Xem log lỗi server
Server in log ra terminal. Nếu chạy nền, redirect:
```powershell
node server.js > srv_out.txt 2> srv_err.txt
```

---

## 8. Deploy production (gợi ý)

1. **Đổi `SESSION_SECRET`** trong `.env`
2. **Đổi mật khẩu admin**
3. **Mã hoá `roblox_password`** trước khi lưu (hiện tại đang plaintext)
4. Chạy sau **HTTPS** + reverse proxy (nginx / Caddy)
5. Cân nhắc backup DB định kỳ:
   ```powershell
   Copy-Item shop.db "backup\shop_$(Get-Date -Format yyyyMMdd_HHmmss).db"
   ```
6. Dùng **PM2** hoặc **systemd** để giữ server chạy nền:
   ```
   pm2 start server.js --name roblox-shop
   ```

---

## 9. Cấu trúc file dự án

```
web shop/
├─ server.js           # Express app + tất cả routes
├─ seed.js             # Seed admin + danh mục + acc mẫu
├─ schema.sql          # Schema SQLite
├─ package.json        # Dependencies & scripts
├─ .env                # Cấu hình
├─ README.md           # Tổng quan dự án
├─ How To Use.md       # File này
├─ public/
│  └─ css/style.css    # Stylesheet
└─ views/              # EJS templates
   ├─ partials/        # header, footer
   ├─ home.ejs, shop.ejs, product.ejs, cart.ejs, checkout.ejs, order_success.ejs, 404.ejs
   └─ admin/
      ├─ login.ejs, _sidebar.ejs, dashboard.ejs
      ├─ categories.ejs
      ├─ products.ejs, product_form.ejs
      └─ orders.ejs, order_detail.ejs
```

---

## 10. FAQ

**Q: Có nhiều khách mua cùng lúc không?**
A: Có. SQLite đủ dùng cho shop nhỏ/vừa. Nếu > 1000 đơn/ngày, cân nhắc chuyển sang MySQL/PostgreSQL.

**Q: Acc đã bán có bị xoá không?**
A: Không xoá, chỉ đổi trạng thái sang `sold`. Đơn hàng cũ vẫn truy được thông tin acc đã giao.

**Q: Có thanh toán tự động không?**
A: Chưa. Hiện tại admin xác nhận thanh toán thủ công. Muốn tích hợp VNPay/Momo/Binance Pay thì cần code thêm.

**Q: Password acc có an toàn không?**
A: Hiện tại lưu **plaintext** trong SQLite — chưa an toàn cho production. Cần mã hoá AES-256-GCM với key trong `.env`.

**Q: Backup thế nào?**
A: Copy file `shop.db` (và `shop.db-wal`, `shop.db-shm` nếu có) sang nơi khác.
