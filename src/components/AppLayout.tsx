import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import OverlayFrame, { useOverlayClose } from './OverlayFrame';
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  ClipboardIcon,
  CloseIcon,
  FileTextIcon,
  FlagIcon,
  HeartPulseIcon,
  HomeIcon,
  HorseshoeIcon,
  IdCardIcon,
  InboxIcon,
  MedalIcon,
  MenuIcon,
  PulseIcon,
  SendIcon,
  SparklesIcon,
  TrophyIcon,
  UserCheckIcon,
  UsersIcon,
  type IconComponent,
} from './icons';
import { Button } from './ui';

interface NavEntry {
  to: string;
  label: string;
  icon: IconComponent;
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
  const { closing, close } = useOverlayClose('/');

  const groups: NavGroup[] = [
    {
      title: 'Chung',
      items: [
        { to: '/dashboard', label: 'Tổng quan', icon: HomeIcon, end: true },
        { to: '/calendar', label: 'Lịch đua', icon: CalendarIcon },
        { to: '/horses', label: 'Ngựa của tôi', icon: HorseshoeIcon },
        { to: '/racing-results', label: 'Kết quả cuộc đua', icon: TrophyIcon },
        ...(isSpectator ? [{ to: '/predictions', label: 'Dự đoán', icon: SparklesIcon }] : []),
        { to: '/tournaments', label: 'Giải đấu', icon: MedalIcon },
        ...(isHorseOwner ? [{ to: '/my-horses/schedule', label: 'Lịch ngựa', icon: CalendarIcon }] : []),
      ],
    },
    // HorseOwner: FR-16 + FR-17 + FR-20
    ...(isHorseOwner
      ? [
          {
            title: 'Lời mời Jockey',
            items: [
              { to: '/jockey/send-invitation', label: 'Gửi lời mời', icon: SendIcon },
              { to: '/jockey/manage-invitations', label: 'Quản lý lời mời', icon: ClipboardIcon },
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
              { to: '/jockey/my-invitations', label: 'Lời mời của tôi', icon: InboxIcon },
              { to: '/jockey/my-races', label: 'Cuộc đua của tôi', icon: FlagIcon },
              { to: '/jockey/my-profile', label: 'Hồ sơ của tôi', icon: IdCardIcon },
            ],
          },
        ]
      : []),
    {
      title: 'Đua',
      items: [
        { to: '/racing/monitor', label: 'Giám sát đua', icon: PulseIcon },
        ...(isRefereeOrAdmin
          ? [
              { to: '/racing/inspection', label: 'Kiểm tra ngựa', icon: HeartPulseIcon },
              { to: '/racing/violations', label: 'Vi phạm', icon: AlertTriangleIcon },
              { to: '/racing/confirm-result', label: 'Kết quả', icon: CheckCircleIcon },
              { to: '/racing/report', label: 'Biên bản', icon: FileTextIcon },
            ]
          : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Quản trị',
            items: [
              { to: '/racing/assign-referee', label: 'Phân công TT', icon: UserCheckIcon },
              { to: '/admin/jockeys', label: 'Quản lý Jockey', icon: UsersIcon },
              { to: '/admin/users', label: 'Quản lý tài khoản', icon: IdCardIcon },
              { to: '/admin/entries', label: 'Duyệt đăng ký', icon: ClipboardCheckIcon },
              { to: '/admin/predictions', label: 'Quản lý dự đoán', icon: SparklesIcon },
            ],
          },
        ]
      : []),
  ];

  return (
    <OverlayFrame
      closing={closing}
      onClose={close}
      panelClassName="app-shell h-full max-w-[1440px] sm:h-[min(100%,940px)]"
    >
      {/* Overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`absolute inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-parchment/60 bg-paper backdrop-blur-2xl transition-transform md:relative md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-flame">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-flame text-white">
                <HorseshoeIcon className="h-4 w-4" />
              </span>
              HRM
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-stone hover:text-ink md:hidden"
              aria-label="Đóng menu"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-parchment px-3.5 py-1.5 text-xs font-semibold text-stone transition hover:border-flame hover:text-ink"
          >
            <span aria-hidden="true">←</span> Về trang chủ
            <kbd className="ml-1 rounded border border-parchment px-1 text-[10px] font-medium text-ash">Esc</kbd>
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

      {/* Main column - scrolls inside the panel, never the page behind it */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-parchment/60 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-input)] border border-bone text-ink"
            aria-label="Mở menu"
          >
            <MenuIcon className="h-[18px] w-[18px]" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-flame">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-flame text-white">
              <HorseshoeIcon className="h-4 w-4" />
            </span>
            HRM
          </Link>
          <button
            type="button"
            onClick={close}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-parchment px-3 py-1.5 text-xs font-semibold text-stone transition hover:border-flame hover:text-ink"
          >
            <span aria-hidden="true">←</span> Trang chủ
          </button>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-[1000px]">
            <Outlet />
          </div>
        </main>
      </div>
    </OverlayFrame>
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

function SidebarLink({
  to,
  icon: Icon,
  end,
  children,
}: {
  to: string;
  icon: IconComponent;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-marigold text-ink shadow-[inset_0_0_0_1px_rgba(184,134,59,0.35)]'
            : 'text-stone hover:bg-cream hover:text-ink'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {children}
    </NavLink>
  );
}
