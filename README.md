# HRM Assignment — Frontend

UI kiểm thử cho dịch vụ **Identity** (FR-01..05): đăng ký, đăng nhập, và trang admin quản lý tài khoản.

**Stack:** React 18 + Vite + TypeScript + Tailwind v4 + React Router + axios.
Thiết kế theo `DESIGN.md` (hệ "Harvest" — nền kem, điểm nhấn cam).

## Yêu cầu
- Node.js 18+ (đã test trên Node 24)
- Các backend đang chạy (xem `../HRM_Assignment_BE`):
  - Identity ở `http://localhost:5001`
  - Horse ở `http://localhost:5003`

## Chạy
```bash
npm install
npm run dev          # http://localhost:5173
```
Vite proxy định tuyến theo prefix (khai báo trong `vite.config.ts`), nên không cần cấu hình CORS:
- `/api/horse/*`    → `http://localhost:5003`
- `/api/identity/*` → `http://localhost:5001`

Nếu backend chạy cổng khác, sửa `target` tương ứng trong `vite.config.ts`.

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
| FR-06 Đăng ký ngựa | `HorsesPage` → **+ Thêm ngựa** |
| FR-07 Cập nhật / xóa ngựa | `HorsesPage` (Sửa, Cho giải nghệ, Xóa) |
| FR-08 Giấy tờ ngựa | `HorsesPage` → **{n} giấy tờ** (modal) |
