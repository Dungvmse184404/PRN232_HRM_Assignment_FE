import { NavLink } from 'react-router-dom';
import type { NavigationGroup } from './navigation.config';
import { IconChevronLeft, IconHorseshoe } from './icons';

interface RoleSidebarProps {
  groups: NavigationGroup[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Desktop (>=1024px) collapsible sidebar / tablet (768-1023px) compact rail.
 * Hidden below 768px — MobileNavigationDrawer takes over navigation there.
 */
export default function RoleSidebar({ groups, collapsed, onToggleCollapse }: RoleSidebarProps) {
  return (
    <aside className="app-sidebar" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="app-sidebar__brand">
        <span className="app-sidebar__brand-mark" aria-hidden="true">
          <IconHorseshoe />
        </span>
        <span className="app-sidebar__brand-text">HRM</span>
      </div>

      <nav aria-label="Điều hướng chính" className="app-sidebar__nav">
        {groups.map((group) => (
          <div className="app-sidebar__group" key={group.id}>
            <div className="app-sidebar__group-label" id={`sidebar-group-${group.id}`}>
              {group.label}
            </div>
            <ul role="list" aria-labelledby={`sidebar-group-${group.id}`}>
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} className="app-sidebar__item">
                    <item.icon className="app-sidebar__icon" aria-hidden="true" />
                    <span className="app-sidebar__label">{item.label}</span>
                    <span className="app-sidebar__tooltip" aria-hidden="true">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <button
          type="button"
          className="app-sidebar__collapse-btn"
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        >
          <IconChevronLeft className="app-sidebar__collapse-icon" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
