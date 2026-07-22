import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import HeroBackdrop from './home/HeroBackdrop';
import { prefersReducedMotion, scrollToTop } from '../lib/motion';
import CommandCenterSection from './home/CommandCenterSection';
import TrackPulseSection from './home/TrackPulseSection';
import LiveSeasonSection from './home/LiveSeasonSection';
import StandingsSection from './home/StandingsSection';
import RolesSection from './home/RolesSection';
import ClosingCtaSection from './home/ClosingCtaSection';
import SiteFooter from './home/SiteFooter';
import HomeNavDrawer from './home/HomeNavDrawer';
import HomeSearchDialog from './home/HomeSearchDialog';
import { scrollToAnchor, type AnchorId } from './home/navigation';

/** Cinematic equestrian editorial hero — dark obsidian/crimson/gold theme, scoped to this file only. */
const THEME_VARS: CSSProperties = {
  ['--obsidian' as string]: '#14100C',
  ['--obsidian-2' as string]: '#1F1811',
  ['--crimson' as string]: '#9C3226',
  ['--crimson-bright' as string]: '#C1503F',
  ['--gold' as string]: '#B8863B',
  ['--parchment' as string]: '#F3E9D8',
  ['--dust' as string]: '#B9AC97',
  ['--glass' as string]: 'rgba(20,16,12,0.72)',
};

const DISPLAY_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";

const STATS = [
  { value: '48', label: 'Giải đấu / mùa' },
  { value: '1.200+', label: 'Ngựa đăng ký' },
  { value: '5', label: 'Vai trò · 1 nền tảng' },
  { value: 'Realtime', label: 'Kết quả & xếp hạng' },
];

const RANKINGS = [
  { name: 'Thunder Crown', points: 98 },
  { name: 'Royal Flame', points: 91 },
  { name: 'Silver Wind', points: 87 },
];

const FINAL_ROUND_MS = (2 * 3600 + 14 * 60 + 30) * 1000;

const VALID_MOUNT_ANCHORS: AnchorId[] = ['mua-giai', 'ket-qua'];

/** How long the hero clears out before the popup shell takes over. */
const LAUNCH_MS = 430;

/**
 * Staggered exit for the hero blocks the popup would otherwise overlap.
 * Applied to the wrappers, so their already-revealed children fade along with them.
 */
function heroExit(launching: boolean, delay: string, base: string) {
  if (!launching) return { className: base };
  return { className: `${base} home-exit`, style: { animationDelay: delay } as CSSProperties };
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const isSpectator = user?.roles.includes('Spectator') ?? false;
  const primaryHref = isAuthenticated ? '/dashboard' : '/login';
  const remaining = useCountdown(FINAL_ROUND_MS);
  const location = useLocation();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const launchTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(launchTimer.current), []);

  /**
   * Entering the system never leaves this page — the hero clears out and the
   * shell fades up as a glass popup over the very same backdrop. Any scroll
   * offset is unwound first so the popup does not open over a half-scrolled page.
   */
  const launchShell = useCallback(
    (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      if (launchTimer.current) return;

      if (prefersReducedMotion()) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        navigate(to);
        return;
      }

      scrollToTop(() => {
        setLaunching(true);
        launchTimer.current = window.setTimeout(() => navigate(to), LAUNCH_MS);
      });
    },
    [navigate],
  );

  const exitProps = (delay: string, base: string) => heroExit(launching, delay, base);

  // Deep-link support: /#mua-giai or /#ket-qua scrolls to that section once, on first mount only.
  useEffect(() => {
    const hash = location.hash.replace('#', '') as AnchorId;
    if (!VALID_MOUNT_ANCHORS.includes(hash)) return;
    const frame = requestAnimationFrame(() => scrollToAnchor(hash));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
    <div style={THEME_VARS} className="relative isolate min-h-screen overflow-hidden bg-[var(--obsidian)]">
      <style>{`
        @keyframes homeReveal {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        .home-reveal { animation: homeReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes timingSweep {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .timing-sweep { animation: timingSweep 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: left center; }

        @keyframes homeExit {
          from { opacity: 1; transform: none; }
          to { opacity: 0; transform: translateY(-18px) scale(0.985); }
        }
        .home-exit { animation: homeExit 360ms cubic-bezier(0.4, 0, 1, 1) both; pointer-events: none; }

        @media (prefers-reduced-motion: reduce) {
          .home-reveal { animation: none; opacity: 1; transform: none; }
          .timing-sweep { animation: none; transform: scaleX(1); }
          .home-exit { animation: none; opacity: 0; }
        }
        .font-display { font-family: ${DISPLAY_FONT}; }
      `}</style>

      {/* ---- Cinematic background photo + washes (shared with the popup shell) ---- */}
      <HeroBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader
          isAuthenticated={isAuthenticated}
          isSpectator={isSpectator}
          launching={launching}
          onLaunch={launchShell('/dashboard')}
        />

        <main className="flex flex-1 items-center px-6 py-8 sm:py-10">
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <div {...exitProps('40ms', 'max-w-xl')}>
              <h1
                className="home-reveal font-display text-4xl leading-[1.08] text-[var(--parchment)] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ animationDelay: '80ms' }}
              >
                <span className="block">Điều hành cả mùa giải</span>
                <span className="block">
                  trong <em className="text-[var(--crimson-bright)] italic">một nền tảng</em>
                </span>
              </h1>

              <TimingLine delay="260ms" />

              <p
                className="home-reveal mt-5 text-base leading-relaxed text-[var(--dust)] sm:text-lg"
                style={{ animationDelay: '340ms' }}
              >
                Quản lý lịch thi đấu, đăng ký ngựa và jockey, chấm kết quả và công bố bảng xếp hạng — tất
                cả theo thời gian thực, cho mọi vai trò từ ban tổ chức đến khán giả.
              </p>

              <div className="home-reveal mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: '420ms' }}>
                <Link
                  to={primaryHref}
                  onClick={launchShell(primaryHref)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--crimson)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_32px_-10px_rgba(0,0,0,0.65)] transition hover:-translate-y-0.5 hover:brightness-110 sm:text-base"
                >
                  Vào hệ thống
                </Link>
                <Link
                  to="/racing-results"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--parchment)]/35 px-7 py-3.5 text-sm font-semibold text-[var(--parchment)] transition hover:border-[var(--parchment)]/70 hover:bg-[var(--parchment)]/5 sm:text-base"
                >
                  Xem kết quả
                </Link>
              </div>

              <div className="home-reveal mt-8 flex items-center gap-2.5" style={{ animationDelay: '480ms' }}>
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--crimson-bright)] opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--crimson-bright)]" />
                </span>
                <p className="text-sm font-medium text-[var(--dust)]">
                  Đang diễn ra: <span className="font-semibold text-[var(--parchment)]">3 cuộc đua</span> · Cập nhật kết quả trực tiếp
                </p>
              </div>
            </div>

            <div
              {...exitProps('90ms', 'relative flex flex-col items-center gap-8 lg:items-end lg:gap-10 lg:pt-6')}
            >
              <RaceCard remainingMs={remaining} delay="220ms" />
              <div className="lg:mr-14 xl:mr-20">
                <RankingCard delay="380ms" />
              </div>
            </div>
          </div>
        </main>

        <StatRail exitProps={exitProps('140ms', 'relative z-10 border-t border-[var(--parchment)]/10 px-6 py-5')} />
      </div>
    </div>

    <CommandCenterSection />
    <TrackPulseSection />
    <LiveSeasonSection />
    <StandingsSection />
    <RolesSection />
    <ClosingCtaSection />
    <SiteFooter />
    </>
  );
}

function SiteHeader({
  isAuthenticated,
  isSpectator,
  launching,
  onLaunch,
}: {
  isAuthenticated: boolean;
  isSpectator: boolean;
  launching: boolean;
  onLaunch: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTriggerRef.current?.focus();
  }, []);

  const openDrawer = useCallback(() => {
    setSearchOpen(false);
    setDrawerOpen(true);
  }, []);

  const openSearch = useCallback(() => {
    setDrawerOpen(false);
    setSearchOpen(true);
  }, []);

  // Centralized body scroll lock — single source of truth for both overlays, so closing
  // one never clobbers a lock the other still needs.
  useEffect(() => {
    if (!drawerOpen && !searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen, searchOpen]);

  // Ctrl+K / Cmd+K — attached once at header scope (not inside the search-only component,
  // which only mounts while open) so the shortcut works from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isCombo) return;
      event.preventDefault();
      setDrawerOpen(false);
      setSearchOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header
      {...heroExit(
        launching,
        '0ms',
        'relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 px-6 py-6',
      )}
    >
      <div className="flex flex-1 items-center gap-4 text-[var(--parchment)]/75">
        <button
          ref={hamburgerRef}
          type="button"
          onClick={openDrawer}
          aria-label="Mở menu điều hướng"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls="home-nav-drawer"
          className="-m-1 flex items-center justify-center bg-transparent border-0 p-1 text-current transition hover:text-[var(--parchment)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <HamburgerIcon />
        </button>
        <button
          ref={searchTriggerRef}
          type="button"
          onClick={openSearch}
          aria-label="Tìm kiếm điều hướng, Ctrl K"
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-controls="home-search-dialog"
          className="-m-1 flex items-center justify-center bg-transparent border-0 p-1 text-current transition hover:text-[var(--parchment)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <SearchIcon />
        </button>
      </div>

      <Link to="/" className="shrink-0" aria-label="HRM — Trang chủ">
        <img
          src="/images/hr-logo-approved-exact.svg"
          alt="Horse Racing"
          className="h-12 w-auto sm:h-[54px]"
        />
      </Link>

      <div className="flex flex-1 items-center justify-end gap-4">
        <span className="flex items-center gap-1 text-sm font-medium text-[var(--parchment)]/70">
          VI <ChevronDownIcon />
        </span>

        {isAuthenticated ? (
          <Link
            to="/dashboard"
            onClick={onLaunch}
            className="inline-flex items-center justify-center rounded-full bg-[var(--crimson)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Bảng điều khiển
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="hidden items-center justify-center rounded-full border border-[var(--parchment)]/30 px-5 py-2 text-sm font-semibold text-[var(--parchment)] transition hover:border-[var(--parchment)]/60 sm:inline-flex"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-[var(--crimson)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Đăng ký
            </Link>
          </>
        )}
      </div>

      <HomeNavDrawer open={drawerOpen} onClose={closeDrawer} isAuthenticated={isAuthenticated} isSpectator={isSpectator} />
      <HomeSearchDialog open={searchOpen} onClose={closeSearch} isAuthenticated={isAuthenticated} isSpectator={isSpectator} />
    </header>
  );
}

/** Signature element: a thin sweep line evoking a stopwatch / photo-finish beam. */
function TimingLine({ delay }: { delay: string }) {
  return (
    <div className="home-reveal mt-5 flex items-center gap-3" style={{ animationDelay: delay }}>
      <span className="h-px w-full max-w-[220px] overflow-hidden bg-[var(--parchment)]/15">
        <span
          className="timing-sweep block h-full origin-left bg-gradient-to-r from-[var(--crimson-bright)] via-[var(--gold)] to-[var(--crimson-bright)]"
          style={{ animationDelay: delay }}
        />
      </span>
      <span className="font-display text-[11px] uppercase tracking-[0.25em] text-[var(--gold)]">Photo finish</span>
    </div>
  );
}

/** Primary floating editorial tag — compact photo card, not a dashboard panel. */
function RaceCard({ remainingMs, delay }: { remainingMs: number; delay: string }) {
  return (
    <div
      className="home-reveal w-[270px] max-w-[86vw] overflow-hidden rounded-[16px] border border-[var(--parchment)]/16 shadow-[0_20px_44px_-16px_rgba(0,0,0,0.6)] backdrop-blur-[14px] transition-transform duration-300 hover:-translate-y-1 sm:w-[290px] lg:w-[310px]"
      style={{ background: 'var(--glass)', animationDelay: delay }}
    >
      <div className="relative h-[100px] w-full">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: "url('/images/RaceCard.jpg')", backgroundSize: 'cover', backgroundPosition: '48% 22%' }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(20,16,12,0.65)] via-transparent to-transparent" />
      </div>

      <div className="p-4">
        <span className="inline-flex items-center rounded-full bg-[var(--gold)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--obsidian)]">
          Sắp diễn ra
        </span>
        <h2 className="font-display mt-2.5 line-clamp-2 text-lg leading-snug text-[var(--parchment)]">
          Vòng chung kết · Cúp Mùa Xuân
        </h2>
        <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-[var(--crimson-bright)] sm:text-[30px]">
          Còn {formatCountdown(remainingMs)}
        </p>
        <p className="mt-2.5 text-xs text-[var(--dust)]">12 ngựa tham gia · Trường đua Saigon</p>
        <Link
          to="/racing-results"
          className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--gold)] hover:underline"
        >
          Xem lịch đầy đủ →
        </Link>
      </div>
    </div>
  );
}

/** Secondary floating tag — visibly smaller, offset from RaceCard, never competes with it. */
function RankingCard({ delay }: { delay: string }) {
  return (
    <div
      className="home-reveal w-[240px] max-w-[78vw] overflow-hidden rounded-[14px] border border-[var(--parchment)]/16 shadow-[0_16px_36px_-18px_rgba(0,0,0,0.55)] backdrop-blur-[14px] sm:w-[260px] lg:w-[280px]"
      style={{ background: 'var(--glass)', animationDelay: delay }}
    >
      <div
        aria-hidden="true"
        className="h-[48px] w-full bg-cover"
        style={{ backgroundImage: "url('/images/RankingCard.jpg')", backgroundSize: 'cover', backgroundPosition: '58% 18%' }}
      />

      <div className="px-3.5 py-[15px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Xếp hạng</span>
          <Link to="/predictions" className="text-[10px] font-semibold text-[var(--dust)] hover:text-[var(--parchment)]">
            Xem đầy đủ →
          </Link>
        </div>

        <ol className="flex flex-col gap-[5px]">
          {RANKINGS.map((entry, index) => {
            const rank = index + 1;
            const isFirst = rank === 1;
            return (
              <li key={entry.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${isFirst ? 'bg-[var(--gold)] text-[var(--obsidian)]' : 'bg-[var(--parchment)]/10 text-[var(--dust)]'
                      }`}
                  >
                    {rank}
                  </span>
                  <span className={`text-[11px] font-medium sm:text-xs ${isFirst ? 'text-[var(--gold)]' : 'text-[var(--parchment)]/90'}`}>
                    {entry.name}
                  </span>
                </span>
                <span className="text-[11px] text-[var(--dust)]">{entry.points} điểm</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StatRail({ exitProps }: { exitProps: { className: string; style?: CSSProperties } }) {
  return (
    <div {...exitProps}>
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-[var(--parchment)]/10">
        {STATS.map((stat, index) => (
          <div key={stat.label} className={`flex flex-col gap-1 ${index > 0 ? 'sm:pl-6' : ''}`}>
            <span className="font-display text-2xl text-[var(--parchment)] sm:text-3xl">{stat.value}</span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--dust)] sm:text-xs">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useCountdown(durationMs: number) {
  const targetRef = useRef(Date.now() + durationMs);
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, targetRef.current - Date.now()));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
