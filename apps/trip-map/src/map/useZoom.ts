import { useCallback, useEffect, useRef, useState } from 'react';

export type Transform = { k: number; x: number; y: number };
export const IDENTITY: Transform = { k: 1, x: 0, y: 0 };

const K_MIN = 1;
const K_MAX = 7;

const easeCubicInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Scale about a fixed screen point, as d3.zoom does. `kMin` lets the map zoom out below 1×. */
export function scaleAbout(t: Transform, factor: number, px: number, py: number, kMin = K_MIN): Transform {
  const k = Math.min(K_MAX, Math.max(kMin, t.k * factor));
  const r = k / t.k;
  return { k, x: px - (px - t.x) * r, y: py - (py - t.y) * r };
}

/**
 * Pan/zoom state with d3.zoom semantics: scaleExtent [kMin, 7], unbounded translate,
 * and eased programmatic transitions for the map controls.
 */
export function useZoom() {
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const ref = useRef(transform);
  const raf = useRef<number | null>(null);

  const set = useCallback((t: Transform) => {
    ref.current = t;
    setTransform(t);
  }, []);

  const cancel = useCallback(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const animateTo = useCallback((target: Transform, duration: number) => {
    cancel();
    const from = ref.current;
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const e = easeCubicInOut(t);
      set({
        k: from.k + (target.k - from.k) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      });
      raf.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  }, [cancel, set]);

  useEffect(() => cancel, [cancel]);

  return { transform, ref, set, cancel, animateTo };
}
