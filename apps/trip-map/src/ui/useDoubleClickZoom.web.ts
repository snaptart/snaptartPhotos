import { useEffect, type RefObject } from 'react';

/**
 * Mouse double-click to zoom. react-native-gesture-handler's double-tap only
 * recognises touch, so the browser event is used directly.
 */
export function useDoubleClickZoom(target: RefObject<unknown>, toggle: (x: number, y: number) => void) {
  useEffect(() => {
    const el = target.current as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onDouble = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      toggle(e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('dblclick', onDouble);
    return () => el.removeEventListener('dblclick', onDouble);
  }, [target, toggle]);
}
