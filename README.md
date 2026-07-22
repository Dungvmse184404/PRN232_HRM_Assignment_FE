# HRM Assignment — Frontend

UI cho toàn bộ hệ thống quản lý đua ngựa: đăng ký/đăng nhập, quản lý ngựa (Identity + Horse,
FR-01..08), giải đấu/cuộc đua/jockey/trọng tài/kết quả (Racing, FR-09..32), dự đoán kết quả
(Prediction, FR-33..36), và các trang admin (quản lý tài khoản, duyệt đăng ký, phân công...).

**Stack:** React 18 + Vite + TypeScript + Tailwind v4 + React Router + axios.
Thiết kế theo `DESIGN.md` (hệ "Harvest" — nền kem, điểm nhấn cam).

## Yêu cầu
- Node.js 18+ (đã test trên Node 24)
- Các backend đang chạy (xem `../HRM_Assignment_BE`):
  - Identity ở `http://localhost:5001`
  - Horse ở `http://localhost:5003`
  - Racing ở `http://localhost:5002` (đăng ký/duyệt cuộc đua, giải đấu, jockey, trọng tài...)
  - Prediction ở `http://localhost:5004` (dự đoán kết quả)

## Chạy
```bash
npm install
npm run dev          # http://localhost:5173
```
Vite proxy định tuyến theo prefix (khai báo trong `vite.config.ts`), nên không cần cấu hình CORS:
- `/api/horse/*` → `http://localhost:5003` (thẳng tới Horse, không qua gateway)
- `/api/racing/*`, `/api/officiating/*`, `/api/results/*`, `/api/owners/*` → `http://localhost:5002` (thẳng tới Racing)
- `/api/predictions/*` → `http://localhost:5004` (thẳng tới Prediction)
- `/api/*` còn lại (vd `/api/identity/*`) → `http://localhost:5000` (qua API Gateway)

Nếu backend chạy cổng khác, sửa `target` tương ứng trong `vite.config.ts`. Lưu ý:
`vite.config.ts` hiện khai báo trùng `/api/racing` và `/api/officiating` 2 lần (vô hại vì cùng
target, nhưng nên dọn khi refactor FE) và comment phía trên các entry Racing bị ghi nhầm là
"Horse Service".

## Tài khoản mặc định (seed sẵn ở backend)
- Admin: `admin@hrm.local` / `Admin@123`

## Cấu trúc
```
src/
├─ lib/api.ts            # axios client(s), kiểu dữ liệu, tự refresh token khi 401
│                         #   (lưu ý: có 2 client trùng lặp — `api`+`racingApi` và
│                         #   `racingApiClient`+`entriesApi`/`tournamentsApi`/`racesApi` —
│                         #   cùng gọi backend Racing, chưa gộp lại, xem ADR-0006)
├─ auth/AuthContext.tsx  # trạng thái đăng nhập, lưu token (localStorage)
├─ routes/Guards.tsx     # ProtectedRoute (cần đăng nhập) + AdminRoute (cần role Admin)
├─ components/
│  ├─ AppLayout.tsx      # layout sau đăng nhập: SIDEBAR trái (nhóm theo role) + main content,
│  │                     #   không còn là top-nav ngang như bản cũ
│  └─ ui.tsx             # UI primitives (Button, Input, Card, Badge…)
└─ pages/
   ├─ LoginPage / RegisterPage / DashboardPage / HorsesPage / RacingResultsPage / PredictionsPage
   ├─ home/               # trang chủ công khai (chưa đăng nhập)
   ├─ jockey/              # lời mời, cuộc đua của Jockey (FR-16..22)
   ├─ racing/              # giải đấu, cuộc đua, lịch ngựa, giám sát, trọng tài, kết quả (FR-09..32)
   └─ admin/               # UsersPage (FR-04/05), JockeysPage, AdminEntriesPage (duyệt đăng ký),
                            #   AdminPredictionsPage
```

## Bản đồ FR → màn hình
> Bảng dưới mới chỉ phủ FR-01..08 (Identity + Horse), từ giai đoạn FE mới có 2 backend. FE hiện
> đã có đầy đủ trang cho Racing (FR-09..32, trong `pages/racing/` + `pages/jockey/`) và Prediction
> (FR-33..36, `PredictionsPage` + `admin/AdminPredictionsPage`) nhưng bảng chưa được cập nhật theo —
> cần bạn xác nhận từng FR khớp trang nào trước khi mình điền tiếp, để tránh ghi sai.

| FR | Màn hình |
|----|----------|
| FR-01 Đăng ký | `RegisterPage` (chọn Horse Owner / Jockey / Spectator) |
| FR-02 Đăng nhập | `LoginPage` (JWT + refresh token) |
| FR-04 Quản lý tài khoản | `admin/UsersPage` (xem/tìm, khóa/mở, xóa) |
| FR-05 Phân quyền | `admin/UsersPage` → nút **Vai trò** |
| FR-06 Đăng ký ngựa | `HorsesPage` → **+ Thêm ngựa** |
| FR-07 Cập nhật / xóa ngựa | `HorsesPage` (Sửa, Cho giải nghệ, Xóa) |
| FR-08 Giấy tờ ngựa | `HorsesPage` → **{n} giấy tờ** (modal) |
