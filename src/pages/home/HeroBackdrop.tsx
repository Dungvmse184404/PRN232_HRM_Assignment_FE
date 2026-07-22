/**
 * The landing hero's photographic backdrop, extracted so the popup shell can
 * paint the exact same background behind its glass panel. Keeping one source
 * makes the launch transition read as a single continuous surface.
 */
export default function HeroBackdrop({ className = 'absolute inset-0 -z-30' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`isolate overflow-hidden bg-[#14100C] ${className}`}>
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: "url('/images/hero-racing.jpg')", backgroundPosition: '70% 32%' }}
      />
      {/* Horizontal dark wash: strong on the left (text zone), lighter over the jump on the right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(20,16,12,0.96) 0%, rgba(20,16,12,0.90) 26%, rgba(20,16,12,0.62) 50%, rgba(20,16,12,0.34) 72%, rgba(20,16,12,0.52) 100%)',
        }}
      />
      {/* Top vignette so the nav row stays legible over pale sky */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, rgba(20,16,12,0.7), transparent)' }}
      />
      {/* Bottom vignette blending the photo into the stat rail */}
      <div
        className="absolute inset-x-0 bottom-0 h-56"
        style={{ background: 'linear-gradient(to top, rgba(20,16,12,0.92), transparent)' }}
      />
    </div>
  );
}
