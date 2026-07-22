import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import type { NavigationGroup } from './navigation.config';
import { IconClose, IconHorseshoe } from './icons';

interface MobileNavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: NavigationGroup[];
  returnFocusRef: RefObject<HTMLButtonElement>;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * <768px navigation: full-height drawer with backdrop, focus trap, Escape /
 * backdrop-click to close, body scroll lock, and focus return to the
 * hamburger trigger on close. Portaled to document.body to sidestep any
 * ancestor stacking context; the portal root re-declares the
 * .authenticated-app class so every token/selector stays correctly scoped
 * even though it renders outside the shell's own DOM subtree.
 */
export default function MobileNavigationDrawer({
  open,
  onClose,
  groups,
  returnFocusRef,
}: MobileNavigationDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div className="authenticated-app">
      <div className="app-drawer-backdrop" onClick={onClose} />
      <div className="app-drawer" role="dialog" aria-modal="true" aria-label="Điều hướng" ref={panelRef}>
        <div className="app-drawer__header">
          <div className="app-drawer__brand">
            <span className="app-sidebar__brand-mark" aria-hidden="true">
              <IconHorseshoe />
            </span>
            <span className="app-sidebar__brand-text">HRM</span>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="app-drawer__close"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <IconClose aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Điều hướng chính" className="app-drawer__nav">
          {groups.map((group) => (
            <div className="app-sidebar__group" key={group.id}>
              <div className="app-sidebar__group-label" id={`drawer-group-${group.id}`}>
                {group.label}
              </div>
              <ul role="list" aria-labelledby={`drawer-group-${group.id}`}>
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink to={item.path} className="app-sidebar__item" onClick={onClose}>
                      <item.icon className="app-sidebar__icon" aria-hidden="true" />
                      <span className="app-sidebar__label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
