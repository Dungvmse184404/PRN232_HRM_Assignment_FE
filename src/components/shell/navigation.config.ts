import type { ComponentType, SVGProps } from 'react';
import type { RoleName } from '../../lib/api';
import {
  IconAlertTriangle,
  IconCalendar,
  IconClipboardCheck,
  IconClipboardList,
  IconEye,
  IconFileText,
  IconFlag,
  IconHorseshoe,
  IconInbox,
  IconOverview,
  IconSend,
  IconShieldCheck,
  IconTarget,
  IconTrophy,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from './icons';

export type ShellIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavigationItem {
  path: string;
  label: string;
  icon: ShellIcon;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

interface RoleNavigationGroup extends NavigationGroup {
  /** null = visible to every authenticated user, no role filter applied. */
  requiredRole: RoleName | null;
}

/**
 * Route groups, stable order. Source of truth for path -> label -> icon.
 * Paths mirror src/App.tsx exactly — no new routes, no guard changes.
 */
const GROUP_DEFINITIONS: RoleNavigationGroup[] = [
  {
    id: 'common',
    label: 'Tổng quan',
    requiredRole: null,
    items: [
      { path: '/dashboard', label: 'Tổng quan', icon: IconOverview },
      { path: '/tournaments', label: 'Giải đấu', icon: IconTrophy },
      { path: '/racing-results', label: 'Kết quả cuộc đua', icon: IconFlag },
    ],
  },
  {
    id: 'horse-owner',
    label: 'Chủ ngựa',
    requiredRole: 'HorseOwner',
    items: [
      { path: '/horses', label: 'Ngựa của tôi', icon: IconHorseshoe },
      { path: '/my-horses/schedule', label: 'Lịch ngựa', icon: IconCalendar },
      { path: '/jockey/send-invitation', label: 'Gửi lời mời', icon: IconSend },
      { path: '/jockey/manage-invitations', label: 'Quản lý lời mời', icon: IconInbox },
    ],
  },
  {
    id: 'jockey',
    label: 'Jockey',
    requiredRole: 'Jockey',
    items: [
      { path: '/jockey/my-invitations', label: 'Lời mời của tôi', icon: IconInbox },
      { path: '/jockey/my-races', label: 'Cuộc đua của tôi', icon: IconFlag },
    ],
  },
  {
    id: 'spectator',
    label: 'Khán giả',
    requiredRole: 'Spectator',
    items: [{ path: '/predictions', label: 'Dự đoán', icon: IconTarget }],
  },
  {
    id: 'race-referee',
    label: 'Vận hành đua',
    requiredRole: 'RaceReferee',
    items: [
      { path: '/racing/inspection', label: 'Kiểm tra ngựa', icon: IconShieldCheck },
      { path: '/racing/monitor', label: 'Giám sát đua', icon: IconEye },
      { path: '/racing/violations', label: 'Vi phạm', icon: IconAlertTriangle },
      { path: '/racing/confirm-result', label: 'Kết quả', icon: IconClipboardCheck },
      { path: '/racing/report', label: 'Biên bản', icon: IconFileText },
    ],
  },
  {
    id: 'admin',
    label: 'Quản trị',
    requiredRole: 'Admin',
    items: [
      { path: '/admin/users', label: 'Tài khoản', icon: IconUsers },
      { path: '/admin/jockeys', label: 'Jockey', icon: IconUserCheck },
      { path: '/admin/entries', label: 'Duyệt đăng ký', icon: IconClipboardList },
      { path: '/racing/assign-referee', label: 'Phân công trọng tài', icon: IconUserPlus },
      { path: '/admin/predictions', label: 'Quản lý dự đoán', icon: IconTarget },
    ],
  },
];

/**
 * Pure, unit-testable: builds the navigation groups visible to a user given
 * their role strings. Handles multi-role users by merging every group whose
 * requiredRole they hold (plus the always-on common group), then deduping
 * items by path so a route already shown in an earlier group never repeats.
 * Group order is always GROUP_DEFINITIONS order — never reshuffled by role count.
 */
export function getNavigationGroupsForRoles(roles: string[]): NavigationGroup[] {
  const roleSet = new Set(roles);
  const seenPaths = new Set<string>();
  const groups: NavigationGroup[] = [];

  for (const group of GROUP_DEFINITIONS) {
    if (group.requiredRole !== null && !roleSet.has(group.requiredRole)) continue;

    const items = group.items.filter((item) => {
      if (seenPaths.has(item.path)) return false;
      seenPaths.add(item.path);
      return true;
    });

    if (items.length > 0) {
      groups.push({ id: group.id, label: group.label, items });
    }
  }

  return groups;
}
