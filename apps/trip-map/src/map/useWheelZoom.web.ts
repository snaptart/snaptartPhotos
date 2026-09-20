import { useEffect, type RefObject } from 'react';

import { scaleAbout, type Transform } from './useZoom';

/**
 * Mouse-wheel / trackpad zoom about the cursor, using d3.zoom's wheel delta curve.
 *
 * `origin` must match what the transform scales about: SVG content scales about its
 * top-left, while a transformed View scales about its centre.
 */
export function useWheelZoom(
  target: RefObject<unknown>,
  current: RefObject<Transform>,
  set: (t: Transform) => void,
  cancel: () => void,
  origin: 'top-left' | 'centre' = 'top-left',
  kMin?: number,
) {
  useEffect(() => {
    const el = target.current as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancel();
      const r = el.getBoundingClientRect();
      const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * (e.ctrlKey ? 10 : 1);
      const px = e.clientX - r.left - (origin === 'centre' ? r.width / 2 : 0);
      const py = e.clientY - r.top - (origin === 'centre' ? r.height / 2 : 0);
      set(scaleAbout(current.current, 2 ** delta, px, py, kMin));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [target, current, set, cancel, origin, kMin]);
}
