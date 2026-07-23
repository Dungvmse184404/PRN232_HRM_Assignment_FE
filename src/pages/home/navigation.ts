export interface NavItem {
  order: string;
  label: string;
  href: string;
  isAnchor: boolean;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { order: '01', label: 'Trang chủ', href: '/', isAnchor: false },
  { order: '02', label: 'Mùa giải', href: '/#mua-giai', isAnchor: true },
  { order: '03', label: 'Kết quả', href: '/racing-results', isAnchor: false },
  { order: '04', label: 'Bảng xếp hạng', href: '/#ket-qua', isAnchor: true },
];

/** Only appended for authenticated Spectator users - see getNavItems. */
export const PREDICTIONS_NAV_ITEM: NavItem = {
  order: '05',
  label: 'Dự đoán',
  href: '/predictions',
  isAnchor: false,
};

export const GUEST_NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'Đăng nhập', href: '/login' },
  { label: 'Đăng ký', href: '/register' },
];

export const AUTH_NAV_ITEM = { label: 'Vào hệ thống', href: '/dashboard' };

export type AnchorId = 'mua-giai' | 'ket-qua';

export function getNavItems(isSpectator: boolean): NavItem[] {
  return isSpectator ? [...PRIMARY_NAV_ITEMS, PREDICTIONS_NAV_ITEM] : PRIMARY_NAV_ITEMS;
}

export interface SearchItem {
  id: string;
  label: string;
  href: string;
  isAnchor: boolean;
}

export function getSearchItems(isSpectator: boolean, isAuthenticated: boolean): SearchItem[] {
  const nav: SearchItem[] = getNavItems(isSpectator).map((item) => ({
    id: `nav-${item.order}`,
    label: item.label,
    href: item.href,
    isAnchor: item.isAnchor,
  }));
  const authItems: SearchItem[] = isAuthenticated
    ? [{ id: 'auth-dashboard', label: AUTH_NAV_ITEM.label, href: AUTH_NAV_ITEM.href, isAnchor: false }]
    : GUEST_NAV_ITEMS.map((g, index) => ({ id: `guest-${index}`, label: g.label, href: g.href, isAnchor: false }));
  return [...nav, ...authItems];
}

/** Strips Vietnamese diacritics so typing "ket qua" (no dấu) still matches "Kết quả". */
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd');
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToAnchor(anchorId: AnchorId) {
  document.getElementById(anchorId)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
