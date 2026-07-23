import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  AUTH_NAV_ITEM,
  GUEST_NAV_ITEMS,
  getNavItems,
  scrollToAnchor,
  scrollToTop,
  type AnchorId,
  type NavItem,
} from './navigation';

const DISPLAY_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";

interface HomeNavDrawerProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isSpectator: boolean;
}

/** Hamburger navigation drawer - portalled to document.body so it never nests inside the Hero's isolated stacking context. */
export default function HomeNavDrawer({ open, onClose, isAuthenticated, isSpectator }: HomeNavDrawerProps) {
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const items = getNavItems(isSpectator);
  const activeHash = location.pathname === '/' ? location.hash.replace('#', '') : '';

  // Focus the close button synchronously on open - deliberately not gated behind
  // requestAnimationFrame, which browsers can throttle/skip on background tabs and would
  // otherwise leave the drawer focus-trapped but never actually focused.
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleItemClick(item: NavItem) {
    onClose();
    if (item.href === '/') {
      requestAnimationFrame(() => scrollToTop());
    } else if (item.isAnchor) {
      const id = item.href.replace('/#', '') as AnchorId;
      requestAnimationFrame(() => scrollToAnchor(id));
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <style>{`
        @keyframes homeDrawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes homeDrawerSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .home-drawer-backdrop { animation: homeDrawerFadeIn 250ms ease both; }
        .home-drawer-panel { animation: homeDrawerSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .home-drawer-backdrop, .home-drawer-panel { animation: none; }
        }
      `}</style>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="home-drawer-backdrop absolute inset-0 bg-[#14100C]/80 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-nav-drawer-title"
        id="home-nav-drawer"
        className="home-drawer-panel absolute inset-y-0 left-0 flex w-full flex-col overflow-y-auto border-r border-[#F3E9D8]/12 bg-[#14100C] sm:w-[440px] sm:max-w-[85vw]"
      >
        <div className="flex items-center justify-between px-6 py-6">
          <span id="home-nav-drawer-title" className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B8863B]">
            Điều hướng
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
            className="-m-1 flex h-11 w-11 items-center justify-center bg-transparent p-0 text-[#F3E9D8]/80 transition hover:text-[#F3E9D8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8863B]"
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Điều hướng chính" className="flex flex-col px-6 pt-4">
          {items.map((item) => {
            const isAnchorActive = item.isAnchor && activeHash === item.href.replace('/#', '');
            const isHomeActive = item.href === '/' && !activeHash;
            const active = isAnchorActive || isHomeActive;
            return (
              <Link
                key={item.order}
                to={item.href}
                onClick={() => handleItemClick(item)}
                className={`group flex min-h-[44px] items-center gap-4 border-b py-4 text-left transition-colors ${
                  active ? 'border-[#B8863B]/50 text-[#B8863B]' : 'border-[#F3E9D8]/10 text-[#F3E9D8]/85 hover:text-[#F3E9D8]'
                }`}
              >
                <span className={`text-xs tabular-nums ${active ? 'text-[#B8863B]' : 'text-[#B9AC97]'}`}>{item.order}</span>
                <span className="text-xl" style={{ fontFamily: DISPLAY_FONT }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-6 py-8">
          {isAuthenticated ? (
            <Link
              to={AUTH_NAV_ITEM.href}
              onClick={onClose}
              className="flex min-h-[44px] items-center justify-center rounded-full bg-[#9C3226] px-6 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {AUTH_NAV_ITEM.label}
            </Link>
          ) : (
            GUEST_NAV_ITEMS.map((guestItem) => (
              <Link
                key={guestItem.href}
                to={guestItem.href}
                onClick={onClose}
                className="flex min-h-[44px] items-center justify-center rounded-full border border-[#F3E9D8]/30 px-6 text-sm font-semibold text-[#F3E9D8] transition hover:border-[#F3E9D8]/60"
              >
                {guestItem.label}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
