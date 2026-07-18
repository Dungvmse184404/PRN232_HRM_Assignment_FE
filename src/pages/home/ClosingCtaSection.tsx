import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

export default function ClosingCtaSection() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? '/dashboard' : '/login';

  return (
    <section
      style={SECTION_THEME_VARS}
      aria-labelledby="closing-cta-heading"
      className="relative overflow-hidden bg-[var(--obsidian)]"
    >
      <div className="absolute inset-0">
        <MediaFrame
          src="/images/home/closing-finish.jpg"
          className="h-full w-full"
          imageClassName="object-[50%_55%]"
          label="Khoảnh khắc về đích"
          assetPath="/images/home/closing-finish.jpg"
          alt="Khoảnh khắc về đích của mùa giải"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/70 to-[var(--obsidian)]/30"
        />
      </div>

      <div className="relative mx-auto flex max-w-[1600px] flex-col items-center px-5 py-24 text-center md:px-8 lg:px-16 lg:py-40">
        <h2
          id="closing-cta-heading"
          className="text-[40px] leading-[1.15] text-[var(--parchment)] lg:text-[64px]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          <span className="block">Theo dõi cả mùa giải</span>
          <span className="block">Vận hành từng cuộc đua</span>
        </h2>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-4 lg:mt-12 lg:w-auto lg:max-w-none lg:flex-row lg:gap-6">
          <Link
            to={primaryHref}
            className="inline-flex items-center justify-center rounded-full bg-[var(--crimson)] px-8 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-110"
          >
            Vào hệ thống
          </Link>
          <Link
            to="/racing-results"
            className="inline-flex items-center justify-center rounded-full border border-[var(--parchment)]/35 px-8 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parchment)] transition hover:border-[var(--parchment)]/70"
          >
            Xem kết quả
          </Link>
        </div>
      </div>
    </section>
  );
}
