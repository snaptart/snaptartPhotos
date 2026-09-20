import type { RefObject } from 'react';

import type { Transform } from './useZoom';

/** No wheel on touch platforms; pinch is handled by the gesture detector. */
export function useWheelZoom(
  _target: RefObject<unknown>,
  _current: RefObject<Transform>,
  _set: (t: Transform) => void,
  _cancel: () => void,
  _origin: 'top-left' | 'centre' = 'top-left',
  _kMin?: number,
) {}
