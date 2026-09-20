import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * True where touch is the main input (phones, tablets): no hover means no mouse. Used to
 * word the hints ("tap" or "click") and to leave out chrome that a finger doesn't need.
 */
export function useTouchFirst() {
  const query = '(hover: none)';
  const [touch, setTouch] = useState(() =>
    Platform.OS !== 'web' || (typeof window !== 'undefined' && window.matchMedia(query).matches));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const mq = window.matchMedia(query);
    const update = () => setTouch(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return touch;
}
