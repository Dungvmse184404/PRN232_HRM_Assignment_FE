/** Shared motion helpers for the landing → popup shell transition. */

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Brings the window back to the top, then runs `done`.
 *
 * Smooth scrolling has no completion event, so we poll until the offset settles
 * (or bail out) — otherwise the launch animation would start mid-scroll and the
 * popup would fade in over a half-scrolled hero.
 */
export function scrollToTop(done: () => void) {
  if (window.scrollY < 4) {
    done();
    return;
  }

  if (prefersReducedMotion()) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    done();
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  const startedAt = performance.now();
  let previous = window.scrollY;
  let settledFor = 0;

  const tick = () => {
    const y = window.scrollY;
    const elapsed = performance.now() - startedAt;
    settledFor = y === previous ? settledFor + 1 : 0;
    previous = y;

    if (y < 4 || settledFor > 3 || elapsed > 800) {
      done();
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
