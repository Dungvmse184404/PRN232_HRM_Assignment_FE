# HRM Assignment — Frontend

UI kiểm thử cho dịch vụ **Identity** (FR-01..05): đăng ký, đăng nhập, và trang admin quản lý tài khoản.

**Stack:** React 18 + Vite + TypeScript + Tailwind v4 + React Router + axios.
Thiết kế theo `DESIGN.md` (hệ "Harvest" — nền kem, điểm nhấn cam).

## Yêu cầu
- Node.js 18+ (đã test trên Node 24)
- Backend Identity đang chạy ở `http://localhost:5001` (xem `../HRM_Assignment_BE`)

## Chạy
```bash
npm install
npm run dev          # http://localhost:5173
```
Vite proxy chuyển mọi request `/api/*` sang `http://localhost:5001` (khai báo trong `vite.config.ts`),
nên không cần cấu hình CORS ở backend. Nếu backend chạy cổng khác, sửa `target` trong `vite.config.ts`.

## Tài khoản mặc định (seed sẵn ở backend)
- Admin: `admin@hrm.local` / `Admin@123`

## Cấu trúc
```
src/
├─ lib/api.ts            # axios client, kiểu dữ liệu, tự refresh token khi 401
├─ auth/AuthContext.tsx  # trạng thái đăng nhập, lưu token (localStorage)
├─ routes/Guards.tsx     # ProtectedRoute (cần đăng nhập) + AdminRoute (cần role Admin)
├─ components/           # AppLayout (header) + UI primitives (Button, Input, Card…)
└─ pages/
   ├─ LoginPage / RegisterPage / DashboardPage
   └─ admin/UsersPage    # tìm kiếm, lọc role, khóa/mở, xóa mềm, phân quyền, phân trang
```

## Bản đồ FR → màn hình
| FR | Màn hình |
|----|----------|
| FR-01 Đăng ký | `RegisterPage` (chọn Horse Owner / Jockey / Spectator) |
| FR-02 Đăng nhập | `LoginPage` (JWT + refresh token) |
| FR-04 Quản lý tài khoản | `admin/UsersPage` (xem/tìm, khóa/mở, xóa) |
| FR-05 Phân quyền | `admin/UsersPage` → nút **Vai trò** |
