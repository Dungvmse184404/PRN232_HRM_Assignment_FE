# HRM Assignment — Frontend

UI cho toàn bộ hệ thống quản lý đua ngựa: đăng ký/đăng nhập, quản lý ngựa (Identity + Horse,
FR-01..08), giải đấu/cuộc đua/jockey/trọng tài/kết quả (Racing, FR-09..32), dự đoán kết quả
(Prediction, FR-33..36), và các trang admin (quản lý tài khoản, duyệt đăng ký, phân công...).

**Stack:** React 18 + Vite + TypeScript + Tailwind v4 + React Router + axios.

**Giao diện:** token nền tảng lấy từ `DESIGN.md` (hệ "Harvest" — nền kem, điểm nhấn cam), nhưng
khu vực sau đăng nhập **re-skin sang tông tối** obsidian/crimson/gold cho khớp trang chủ:
`.app-shell` trong `src/index.css` trỏ lại chính các token đó (`ink`, `paper`, `cream`, `flame`…)
sang giá trị tối, nên mọi trang con đổi màu theo mà không phải sửa markup từng trang.
Trang chủ (`pages/HomePage.tsx` + `pages/home/`) tự quản màu riêng bằng biến `--obsidian`/`--crimson`.

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
npm run dev          # http://localhost:5174 (server.port trong vite.config.ts)
```
Nếu 5174 bận, Vite tự nhảy sang cổng trống kế tiếp — xem dòng `Local:` nó in ra.

### ⚠️ Proxy: hiện mọi request đều đi qua API Gateway
`vite.config.ts` khai báo `'/api'` **đầu tiên**, trước các prefix cụ thể. Vite duyệt proxy theo
đúng thứ tự khai báo và dừng ở entry khớp đầu tiên (`url.startsWith(context)`), nên `/api` nuốt
toàn bộ — **mọi `/api/*` đều tới `http://localhost:5000`**, kể cả `/api/horse/*` hay
`/api/racing/*`. Các entry per-service bên dưới hiện là code chết, dù comment trong file ghi
"More specific prefixes must come first".

Vậy nên khi chạy FE, **API Gateway (:5000) bắt buộc phải bật** — chỉ mở Horse/Racing/Prediction
là không đủ.

Muốn thật sự gọi thẳng từng service thì chuyển entry `'/api'` xuống **cuối** object `proxy`.
Ba lỗi khác trong file, nên dọn cùng lúc:
- `/api/racing`, `/api/officiating`, `/api/results` mỗi cái khai báo **2 lần** (Vite in warning
  `Duplicate key` mỗi lần khởi động).
- Comment `// Horse Service - port 5003` đang nằm trên nhóm entry của Racing (:5002).
- `/api/owners` chỉ có ở nhóm thứ hai, dễ bị bỏ sót khi dọn.

Nếu backend chạy cổng khác, sửa `target` tương ứng trong `vite.config.ts`.

## Tài khoản mặc định (seed sẵn ở backend)
- Admin: `admin@hrm.local` / `Admin@123`

## Cấu trúc
```
src/
├─ lib/
│  ├─ api.ts             # axios client(s), kiểu dữ liệu, tự refresh token khi 401
│  │                     #   3 client: `api` (/api), `racingApiClient` (/api/racing),
│  │                     #   `predictionClient` (/api/predictions). `api`+`racingApi` và
│  │                     #   `racingApiClient`+`entriesApi`/`tournamentsApi`/`racesApi` cùng
│  │                     #   gọi backend Racing, chưa gộp lại — xem ADR-0006
│  └─ motion.ts          # scrollToTop (chờ smooth-scroll dừng) + prefersReducedMotion
├─ auth/AuthContext.tsx  # trạng thái đăng nhập, lưu token (localStorage)
├─ routes/Guards.tsx     # ProtectedRoute + AdminRoute + HorseOwnerRoute + JockeyRoute
├─ components/
│  ├─ OverlayFrame.tsx   # khung popup kính: backdrop hero + scrim blur + panel bay,
│  │                     #   khoá scroll trang nền, Esc để đóng, hook useOverlayClose
│  ├─ AppLayout.tsx      # layout sau đăng nhập, render BÊN TRONG OverlayFrame:
│  │                     #   sidebar trái (nhóm theo role) + main cuộn nội bộ
│  ├─ icons.tsx          # bộ icon nét mảnh dùng cho sidebar (stroke 1.6, grid 24)
│  └─ ui.tsx             # UI primitives (Button, Input, Card, Badge…)
└─ pages/
   ├─ AuthLayout.tsx      # login/register, cũng render trong OverlayFrame
   ├─ LoginPage / RegisterPage / DashboardPage / HorsesPage / RacingResultsPage / PredictionsPage
   ├─ home/               # trang chủ công khai + HeroBackdrop (nền dùng chung với popup)
   ├─ jockey/             # lời mời, cuộc đua của Jockey (FR-16..22)
   ├─ racing/             # giải đấu, cuộc đua, lịch ngựa, giám sát, trọng tài, kết quả (FR-09..32)
   └─ admin/              # UsersPage (FR-04/05), JockeysPage, AdminEntriesPage (duyệt đăng ký),
                          #   AdminPredictionsPage
```

## Điều hướng: dashboard là popup, không phải trang riêng
Routes trong `App.tsx` không đổi (`/dashboard`, `/login`… vẫn là URL thật), nhưng `AppLayout` và
`AuthLayout` render vào `OverlayFrame` — một panel kính nổi trên đúng ảnh nền của trang chủ.

Bấm "Vào hệ thống" / "Bảng điều khiển" ở trang chủ chạy `launchShell()` trong `HomePage.tsx`:
cuộn về đầu trang → các khối hero (header, tiêu đề, 2 thẻ nổi, StatRail) chạy animation thoát
so le → mới `navigate()`. Đóng bằng nút "Về trang chủ" hoặc **Esc**. Cả hai chiều đều bỏ qua
animation khi người dùng bật `prefers-reduced-motion`.

Vào thẳng `/dashboard` bằng URL vẫn đúng giao diện vì `OverlayFrame` tự render `HeroBackdrop`.

## Bản đồ FR → màn hình
> Bảng dưới mới chỉ phủ FR-01..08 (Identity + Horse), từ giai đoạn FE mới có 2 backend. FE hiện
> đã có đầy đủ trang cho Racing (FR-09..32, trong `pages/racing/` + `pages/jockey/`) và Prediction
> (FR-33..36, `PredictionsPage` + `admin/AdminPredictionsPage`) nhưng bảng chưa được cập nhật theo —
> cần bạn xác nhận từng FR khớp trang nào trước khi mình điền tiếp, để tránh ghi sai.

| FR | Màn hình |
|----|----------|
| FR-01 Đăng ký | `RegisterPage` (chọn Horse Owner / Jockey / Spectator) |
| FR-02 Đăng nhập | `LoginPage` (JWT + refresh token) |
| ~~FR-03 Admin duyệt đăng ký tài khoản~~ | **Đã bỏ** — xem `../HRM_Assignment_BE/docs/adr/0003-no-account-approval.md`. Cái cần duyệt là đăng ký **tham gia cuộc đua** (`admin/AdminEntriesPage`) |
| FR-04 Quản lý tài khoản | `admin/UsersPage` (xem/tìm, khóa/mở, xóa) |
| FR-05 Phân quyền | `admin/UsersPage` → nút **Vai trò** |
| FR-06 Đăng ký ngựa | `HorsesPage` → **+ Thêm ngựa** |
| FR-07 Cập nhật / xóa ngựa | `HorsesPage` (Sửa, Cho giải nghệ, Xóa) |
| FR-08 Giấy tờ ngựa | `HorsesPage` → **{n} giấy tờ** (modal) |
