import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { IconLogout } from './icons';

function getInitials(fullName: string | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar/initial trigger + dropdown (name, email, roles, logout).
 * Reuses the existing logout() from AuthContext as-is — no new API calls.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [open]);

  if (!user) return null;

  return (
    <div className="app-user-menu">
      <button
        type="button"
        ref={triggerRef}
        className="app-user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="app-user-menu-panel"
      >
        <span className="app-user-menu__avatar" aria-hidden="true">
          {getInitials(user.fullName)}
        </span>
        <span className="app-user-menu__name">{user.fullName}</span>
      </button>

      {open && (
        <div
          id="app-user-menu-panel"
          role="menu"
          aria-label="Tài khoản"
          ref={panelRef}
          className="app-user-menu__panel"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
          }}
        >
          <div className="app-user-menu__info">
            <div className="app-user-menu__info-name">{user.fullName}</div>
            <div className="app-user-menu__info-email">{user.email}</div>
            <div className="app-user-menu__info-roles">
              {user.roles.map((role) => (
                <span key={role} className="app-user-menu__role-chip">
                  {role}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            data-autofocus
            className="app-user-menu__logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <IconLogout aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
