import { useEffect, useRef, useState } from 'react';

/**
 * Monta hijos solo cuando entran cerca del viewport.
 * Evita que 10+ carruseles del home disparen decenas de <img> a la vez.
 */
export default function LazyWhenVisible({
  children,
  rootMargin = '200px 0px',
  minHeight = 280,
  eager = false,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager || visible) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, visible, rootMargin]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
