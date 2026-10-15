# Roblox Acc Shop

Web shop bán acc game Roblox — Node.js + Express + SQLite + EJS.

## Tính năng

**Khách hàng**
- Trang chủ, cửa hàng, tìm kiếm & lọc theo danh mục
- Chi tiết acc, giỏ hàng, checkout
- Đặt hàng và nhận mã đơn

**Admin** (`/admin/login`)
- Dashboard thống kê: tổng acc, còn bán, đã bán, danh mục, đơn hàng, doanh thu
- Quản lý danh mục (thêm/sửa/xoá)
- Quản lý acc: tiêu đề, danh mục, giá, kho, mô tả, ảnh, username/password/email Roblox, trạng thái
- Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái, xem thông tin acc để giao khách

## Cài đặt

```powershell
npm install
npm run seed
npm start
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin/login
- Tài khoản mặc định: `admin` / `admin123`

## Cấu trúc

```
server.js          # Express app + routes
seed.js            # Seed danh mục + acc mẫu
schema.sql         # Schema SQLite
.env               # PORT, SESSION_SECRET, DB_FILE
views/             # EJS templates
  partials/        # header, footer
  admin/           # admin pages
public/css/        # stylesheet
shop.db            # SQLite database (tự tạo)
```

## Bảo mật (lưu ý)

- Đổi `SESSION_SECRET` trong `.env` trước khi deploy
- Đổi mật khẩu admin mặc định
- `roblox_password` hiện lưu plaintext trong DB — production nên mã hoá (AES) trước khi lưu
- Nên chạy sau HTTPS + reverse proxy (nginx/Caddy) khi public
