import { PlayIcon } from './icons';

export interface MediaFrameProps {
  src?: string;
  alt: string;
  label: string;
  assetPath: string;
  className?: string;
  imageClassName?: string;
  isVideo?: boolean;
  eager?: boolean;
}

/**
 * A media slot that renders a real photo once `src` is supplied, or an
 * intentional editorial placeholder otherwise — never a broken-image icon,
 * never a request to a file that doesn't exist yet.
 */
export default function MediaFrame({
  src,
  alt,
  label,
  assetPath,
  className = '',
  imageClassName = '',
  isVideo = false,
  eager = false,
}: MediaFrameProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          decoding="async"
          loading={eager ? 'eager' : 'lazy'}
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="relative flex h-full w-full flex-col justify-end border border-[#F3E9D8]/10"
          style={{ background: 'linear-gradient(160deg, #1F1811 0%, #14100C 60%, #1A130D 100%)' }}
        >
          {/* faint grid texture — editorial, not a skeleton shimmer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(243,233,216,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(243,233,216,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* timing-line accent, echoing the Hero's signature device */}
          <div aria-hidden="true" className="absolute left-5 top-5 h-px w-10 bg-[#B8863B]/50" />

          <div className="relative z-10 flex items-end justify-between gap-3 p-4">
            <span aria-hidden="true" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B9AC97]">
              {label}
            </span>
            <span aria-hidden="true" className="truncate font-mono text-[9px] text-[#B9AC97]/35">
              {assetPath}
            </span>
          </div>
        </div>
      )}

      {/* Video affordance — a visual cue only, on top of either the real photo or the placeholder. */}
      {isVideo && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
          <PlayIcon className={src ? 'h-12 w-12 text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]' : 'h-10 w-10 text-[#F3E9D8]/25'} />
        </span>
      )}
    </div>
  );
}
