import { useMemo, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavigationGroup } from './navigation.config';
import { IconMenu } from './icons';
import UserMenu from './UserMenu';

interface AppTopbarProps {
  groups: NavigationGroup[];
  onOpenMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

/** Turns a raw path segment into a readable fallback breadcrumb label. */
function humanizeSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  const looksLikeId = /^[0-9a-fA-F-]{6,}$/.test(decoded);
  if (looksLikeId) return 'Chi tiết';
  return decoded
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Compact topbar: mobile menu trigger, single-level breadcrumb (placeholder —
 * a full Breadcrumbs component is a later phase), spacer, UserMenu.
 * No email or logout rendered directly here — both live inside UserMenu.
 */
export default function AppTopbar({ groups, onOpenMenu, menuButtonRef }: AppTopbarProps) {
  const location = useLocation();

  const currentLabel = useMemo(() => {
    for (const group of groups) {
      const match = group.items.find((item) => item.path === location.pathname);
      if (match) return match.label;
    }
    const segments = location.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? humanizeSegment(last) : 'Tổng quan';
  }, [groups, location.pathname]);

  return (
    <header className="app-topbar">
      <button
        type="button"
        ref={menuButtonRef}
        className="app-topbar__menu-btn"
        onClick={onOpenMenu}
        aria-label="Mở menu điều hướng"
        aria-haspopup="dialog"
      >
        <IconMenu aria-hidden="true" />
      </button>

      <nav aria-label="breadcrumb" className="app-topbar__breadcrumb">
        <ol>
          <li aria-current="page">{currentLabel}</li>
        </ol>
      </nav>

      <div className="app-topbar__spacer" />

      <UserMenu />
    </header>
  );
}
