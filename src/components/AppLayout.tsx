import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui';

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

interface NavGroup {
  title: string;
  items: NavEntry[];
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const isHorseOwner = user?.roles.includes('HorseOwner');
  const isJockey = user?.roles.includes('Jockey');
  const isSpectator = user?.roles.includes('Spectator');
  const isRefereeOrAdmin = isAdmin || user?.roles.includes('RaceReferee');
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      title: 'Chung',
      items: [
        { to: '/dashboard', label: 'Tổng quan', icon: '🏠', end: true },
        { to: '/horses', label: 'Ngựa của tôi', icon: '🐎' },
        { to: '/racing-results', label: 'Kết quả cuộc đua', icon: '🏆' },
        ...(isSpectator ? [{ to: '/predictions', label: 'Dự đoán', icon: '🔮' }] : []),
        { to: '/tournaments', label: 'Giải đấu', icon: '🏅' },
        ...(isHorseOwner ? [{ to: '/my-horses/schedule', label: 'Lịch ngựa', icon: '📅' }] : []),
      ],
    },
    // HorseOwner: FR-16 + FR-17 + FR-20
    ...(isHorseOwner
      ? [
          {
            title: 'Lời mời Jockey',
            items: [
              { to: '/jockey/send-invitation', label: 'Gửi lời mời', icon: '✉️' },
              { to: '/jockey/manage-invitations', label: 'Quản lý lời mời', icon: '📋' },
            ],
          },
        ]
      : []),
    // Jockey: FR-18 + FR-19 + FR-21
    ...(isJockey
      ? [
          {
            title: 'Jockey',
            items: [
              { to: '/jockey/my-invitations', label: 'Lời mời của tôi', icon: '📨' },
              { to: '/jockey/my-races', label: 'Cuộc đua của tôi', icon: '🏇' },
            ],
          },
        ]
      : []),
    {
      title: 'Đua',
      items: [
        { to: '/racing/monitor', label: 'Giám sát đua', icon: '📡' },
        ...(isRefereeOrAdmin
          ? [
              { to: '/racing/inspection', label: 'Kiểm tra ngựa', icon: '🩺' },
              { to: '/racing/violations', label: 'Vi phạm', icon: '⚠️' },
              { to: '/racing/confirm-result', label: 'Kết quả', icon: '✅' },
              { to: '/racing/report', label: 'Biên bản', icon: '📝' },
            ]
          : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Quản trị',
            items: [
              { to: '/racing/assign-referee', label: 'Phân công TT', icon: '🧑‍⚖️' },
              { to: '/admin/jockeys', label: 'Quản lý Jockey', icon: '🏇' },
              { to: '/admin/users', label: 'Quản lý tài khoản', icon: '👤' },
              { to: '/admin/entries', label: 'Duyệt đăng ký', icon: '📥' },
              { to: '/admin/predictions', label: 'Quản lý dự đoán', icon: '🔮' },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-full md:flex">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-parchment/60 bg-cream/85 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-[var(--radius-input)] border border-bone text-ink"
          aria-label="Mở menu"
        >
          ☰
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-flame">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-flame text-paper">🏇</span>
          HRM
        </Link>
      </div>

      {/* Overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-parchment/60 bg-paper transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-flame">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-flame text-paper">🏇</span>
            HRM
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-stone hover:text-ink md:hidden"
            aria-label="Đóng menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <SidebarGroup key={group.title} title={group.title}>
              {group.items.map((item) => (
                <SidebarLink key={item.to} to={item.to} icon={item.icon} end={item.end}>
                  {item.label}
                </SidebarLink>
              ))}
            </SidebarGroup>
          ))}
        </nav>

        <div className="border-t border-parchment/60 px-4 py-4">
          <div className="mb-3">
            <div className="truncate text-sm font-medium text-ink">{user?.fullName}</div>
            <div className="truncate text-xs text-ash">{user?.email}</div>
          </div>
          <Button variant="neutral" onClick={logout} className="w-full">
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1000px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ash">
        {title}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({ to, icon, end, children }: { to: string; icon: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-marigold text-ink' : 'text-stone hover:bg-cream hover:text-ink'
        }`
      }
    >
      <span className="text-base leading-none">{icon}</span>
      {children}
    </NavLink>
  );
}
