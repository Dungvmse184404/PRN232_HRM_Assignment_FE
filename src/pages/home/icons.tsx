export function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 8.3v7.4l6.2-3.7z" fill="currentColor" />
    </svg>
  );
}
