import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getNavigationGroupsForRoles } from './navigation.config';
import RoleSidebar from './RoleSidebar';
import AppTopbar from './AppTopbar';
import MobileNavigationDrawer from './MobileNavigationDrawer';
import '../../styles/app-theme.css';

const SIDEBAR_COLLAPSED_KEY = 'hrm.shell.sidebarCollapsed';

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
}

export interface AuthenticatedAppShellProps {
  /** Optional explicit content; falls back to <Outlet /> when used as a route layout. */
  children?: ReactNode;
}

/**
 * Phase 1A foundation shell for the authenticated area — Cinematic
 * Equestrian Operations direction. Reads the current user from the existing
 * AuthContext, builds role-aware navigation via navigation.config, and
 * renders the dark sidebar / light canvas / topbar / mobile drawer shape.
 *
 * Not wired into App.tsx yet: this component only needs to compile and be
 * safely importable/renderable in isolation. It makes no new API calls and
 * does not touch AuthContext, Guards, or any existing route/page.
 */
export default function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps) {
  const { user } = useAuth();
  const roles = useMemo(() => user?.roles ?? [], [user]);
  const navigationGroups = useMemo(() => getNavigationGroupsForRoles(roles), [roles]);

  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <div className="authenticated-app min-h-dvh">
      <RoleSidebar
        groups={navigationGroups}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div className="authenticated-app__body">
        <AppTopbar
          groups={navigationGroups}
          menuButtonRef={menuButtonRef}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <main id="authenticated-app-main" className="authenticated-app__main" tabIndex={-1}>
          {children ?? <Outlet />}
        </main>
      </div>

      <MobileNavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={navigationGroups}
        returnFocusRef={menuButtonRef}
      />
    </div>
  );
}
