import type { RefObject } from 'react';

/** Touch platforms use the double-tap gesture instead. */
export function useDoubleClickZoom(_target: RefObject<unknown>, _toggle: (x: number, y: number) => void) {}
