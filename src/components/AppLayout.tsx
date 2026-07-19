import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui';

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-parchment/60 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-flame">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-flame text-paper">🏇</span>
            HRM
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <TopLink to="/">Tổng quan</TopLink>
            <TopLink to="/horses">Ngựa của tôi</TopLink>
            <TopLink to="/racing/monitor">Giám sát đua</TopLink>
            {(isAdmin || user?.roles.includes('RaceReferee')) && (
              <>
                <TopLink to="/racing/inspection">Kiểm tra ngựa</TopLink>
                <TopLink to="/racing/violations">Vi phạm</TopLink>
                <TopLink to="/racing/confirm-result">Kết quả</TopLink>
                <TopLink to="/racing/report">Biên bản</TopLink>
              </>
            )}
            {isAdmin && <TopLink to="/racing/assign-referee">Phân công TT</TopLink>}
            {isAdmin && <TopLink to="/admin/users">Quản lý tài khoản</TopLink>}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-ink">{user?.fullName}</div>
              <div className="text-xs text-ash">{user?.email}</div>
            </div>
            <Button variant="neutral" onClick={logout}>Đăng xuất</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 font-medium transition ${
          isActive ? 'bg-marigold text-ink' : 'text-stone hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
