import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroBackdrop from '../pages/home/HeroBackdrop';
import { prefersReducedMotion } from '../lib/motion';

/** Keep in sync with the overlayPanelOut duration in index.css. */
const EXIT_MS = 240;

/**
 * Plays the closing animation, then routes back to `to`. The landing page picks
 * the transition up from there with its own reveal animation.
 */
export function useOverlayClose(to: string) {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const close = useCallback(() => {
    if (timer.current) return; // already closing
    if (prefersReducedMotion()) {
      navigate(to);
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(() => navigate(to), EXIT_MS);
  }, [navigate, to]);

  return { closing, close };
}

/**
 * A glass panel floating over the landing hero - the shell every signed-in
 * surface renders into, so entering the system never leaves the home page
 * behind visually.
 */
export default function OverlayFrame({
  closing,
  onClose,
  panelClassName = '',
  children,
}: {
  closing: boolean;
  onClose: () => void;
  panelClassName?: string;
  children: ReactNode;
}) {
  // The panel scrolls internally; the page behind it must not.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center sm:p-6 lg:p-8 ${closing ? 'overlay-closing' : ''}`}
    >
      <HeroBackdrop className="absolute inset-0" />
      <div
        aria-hidden="true"
        className="overlay-scrim absolute inset-0 bg-[rgba(12,9,7,0.5)] backdrop-blur-[18px]"
      />

      {/* Sizing lives with the caller - two competing max-w/h utilities on one
          element would resolve by stylesheet order, not by intent. */}
      <div
        className={`overlay-panel relative flex w-full overflow-hidden border border-[rgba(243,233,216,0.13)] sm:rounded-[28px] ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
