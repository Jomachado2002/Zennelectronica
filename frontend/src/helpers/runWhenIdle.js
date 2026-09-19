/** Corre trabajo no crítico después del primer paint (móvil). */
export function runWhenIdle(fn, timeout = 2500) {
  if (typeof window === 'undefined') return () => {};

  const run = () => {
    try {
      fn();
    } catch (_) {
      /* ignore */
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout });
    return () => window.cancelIdleCallback(id);
  }

  const t = window.setTimeout(run, Math.min(timeout, 1800));
  return () => window.clearTimeout(t);
}
