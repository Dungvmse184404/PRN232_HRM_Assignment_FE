import type { ReactNode } from 'react';

/**
 * Single-stroke line icons for the app shell navigation.
 *
 * All of them share one 24px grid, a 1.6 stroke and rounded joins, and inherit
 * `currentColor` — so a nav item's hover/active colour carries the icon with it.
 */
export type IconComponent = (props: { className?: string }) => ReactNode;

function Icon({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Mở menu (mobile) */
export const MenuIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

/** Đóng menu */
export const CloseIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />
  </Icon>
);

/** Tổng quan */
export const HomeIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M3.5 10.2 12 3.3l8.5 6.9v8.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    <path d="M9.6 20.5v-6.2h4.8v6.2" />
  </Icon>
);

/** Ngựa của tôi — móng ngựa */
export const HorseshoeIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M6.6 20.3C5 18.4 4 15.9 4 13.2 4 8.4 7.6 4.6 12 4.6s8 3.8 8 8.6c0 2.7-1 5.2-2.6 7.1" />
    <path d="M6.6 20.3h2.5" />
    <path d="M14.9 20.3h2.5" />
  </Icon>
);

/** Kết quả cuộc đua */
export const TrophyIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M7 4h10v4.6a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.4v1.1A3.6 3.6 0 0 0 8 10.7" />
    <path d="M17 6h2.6v1.1a3.6 3.6 0 0 1-3.6 3.6" />
    <path d="M12 13.6V17" />
    <path d="m10.3 20 .4-3M13.7 20l-.4-3" />
    <path d="M8.6 20h6.8" />
  </Icon>
);

/** Dự đoán */
export const SparklesIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M11 3.5 12.6 8 17 9.6 12.6 11.2 11 15.6 9.4 11.2 5 9.6 9.4 8z" />
    <path d="m18.4 14.6.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Icon>
);

/** Giải đấu */
export const MedalIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M7.6 3.2h8.8" />
    <path d="m8.2 3.4 3 5.4" />
    <path d="m15.8 3.4-3 5.4" />
    <circle cx="12" cy="15" r="5.4" />
    <path d="M12 12.8v4.4" />
  </Icon>
);

/** Lịch ngựa */
export const CalendarIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2.4" />
    <path d="M3.4 10h17.2" />
    <path d="M8.2 3.4v3.4M15.8 3.4v3.4" />
  </Icon>
);

/** Gửi lời mời */
export const SendIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M20.8 3.2 10.4 13.6" />
    <path d="m20.8 3.2-6.5 17.6-3.9-8.3-8.2-3.9z" />
  </Icon>
);

/** Quản lý lời mời */
export const ClipboardIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M8.6 4.6H6.4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2h-2.2" />
    <rect x="8.6" y="2.6" width="6.8" height="4" rx="1.4" />
    <path d="M8.4 11.6h7.2M8.4 15.4h4.6" />
  </Icon>
);

/** Duyệt đăng ký */
export const ClipboardCheckIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M8.6 4.6H6.4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2h-2.2" />
    <rect x="8.6" y="2.6" width="6.8" height="4" rx="1.4" />
    <path d="m8.8 13.6 2.2 2.2 4.2-4.2" />
  </Icon>
);

/** Lời mời của tôi */
export const InboxIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M3.4 13.6h4.2l1.5 2.6h5.8l1.5-2.6h4.2" />
    <path d="M6 5.4 3.4 13.6v3.4a2 2 0 0 0 2 2h13.2a2 2 0 0 0 2-2v-3.4L18 5.4a2 2 0 0 0-1.9-1.4H7.9A2 2 0 0 0 6 5.4z" />
  </Icon>
);

/** Cuộc đua của tôi */
export const FlagIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M5.2 21V3.4" />
    <path d="M5.2 4.4c4.2-2 7.4 2 11.6 0v8.6c-4.2 2-7.4-2-11.6 0z" />
  </Icon>
);

/** Giám sát đua */
export const PulseIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M3 12.4h3.6l2.4-7 4 14.2 2.4-7.2H21" />
  </Icon>
);

/** Kiểm tra ngựa */
export const HeartPulseIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M12 20.4 4.9 13.3a4.5 4.5 0 0 1 6.4-6.3l.7.7.7-.7a4.5 4.5 0 0 1 6.4 6.3z" />
    <path d="M7.8 12.2h1.8l1-2 1.6 3.8 1-1.8h2" />
  </Icon>
);

/** Vi phạm */
export const AlertTriangleIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M10.3 4 2.7 17.3a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.6v4.2" />
    <path d="M12 17.2h.01" />
  </Icon>
);

/** Kết quả (xác nhận) */
export const CheckCircleIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="m8.2 12.3 2.6 2.6 5-5.2" />
  </Icon>
);

/** Biên bản */
export const FileTextIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <path d="M13.8 3.2H7.6a2.4 2.4 0 0 0-2.4 2.4v12.8a2.4 2.4 0 0 0 2.4 2.4h8.8a2.4 2.4 0 0 0 2.4-2.4V8.2z" />
    <path d="M13.8 3.2v5h5" />
    <path d="M8.6 13.2h6.8M8.6 16.6h4.4" />
  </Icon>
);

/** Phân công trọng tài */
export const UserCheckIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <circle cx="9.4" cy="7.8" r="3.6" />
    <path d="M2.8 20.2a6.6 6.6 0 0 1 13.2 0" />
    <path d="m16.6 11.6 1.8 1.8 3.4-3.6" />
  </Icon>
);

/** Quản lý Jockey */
export const UsersIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <circle cx="9" cy="7.8" r="3.6" />
    <path d="M2.6 20.2a6.4 6.4 0 0 1 12.8 0" />
    <path d="M16.6 5a3.6 3.6 0 0 1 0 5.6" />
    <path d="M17.8 14.4a6.4 6.4 0 0 1 3.6 5.8" />
  </Icon>
);

/** Quản lý tài khoản */
export const IdCardIcon: IconComponent = ({ className }) => (
  <Icon className={className}>
    <rect x="2.6" y="5" width="18.8" height="14" rx="2.4" />
    <circle cx="8.4" cy="10.8" r="2.2" />
    <path d="M5.2 16.4a3.6 3.6 0 0 1 6.4 0" />
    <path d="M14.6 10h4.4M14.6 13.4h3" />
  </Icon>
);
