import { Link } from 'react-router-dom';
import { SECTION_THEME_VARS } from './theme';

const FOOTER_LINKS = [
  { label: 'Giải đấu', href: '#mua-giai' },
  { label: 'Kết quả', href: '/racing-results' },
  { label: 'Bảng xếp hạng', href: '#ket-qua' },
  { label: 'Đăng nhập', href: '/login' },
];

export default function SiteFooter() {
  return (
    <footer style={SECTION_THEME_VARS} className="border-t border-[var(--parchment)]/10 bg-[var(--obsidian)] px-5 py-12 md:px-8 lg:px-16">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
        <img src="/images/hr-logo-approved-exact.svg" alt="Horse Racing" className="h-12 w-auto" />

        <nav
          aria-label="Liên kết chân trang"
          className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dust)] md:justify-start"
        >
          {FOOTER_LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href} className="transition hover:text-[var(--parchment)]">
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={link.href} className="transition hover:text-[var(--parchment)]">
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dust)]/60">
          © HORSE RACING MANAGEMENT
        </p>
      </div>
    </footer>
  );
}
