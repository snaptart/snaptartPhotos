import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { Place } from '../data/places';
import { cardStyle, Ornaments, StationEntry } from './StationEntry';

const SHEET_EASE = Easing.bezier(0.22, 0.9, 0.24, 1);
/** Scrim presses this soon after opening are the opening tap's own ghost click. */
const GHOST_CLICK_MS = 500;

/** Mobile bottom sheet hosting the station's journal page. */
export function StationSheet({ places, active, onOpen, onClose, bottomInset }: {
  places: Place[];
  active: number;
  onOpen: (i: number) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const open = active >= 0;
  // Keep the last station's content mounted while the sheet slides away.
  const [shown, setShown] = useState(Math.max(0, active));
  const [height, setHeight] = useState(700);
  const slide = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (open) setShown(active); }, [open, active]);

  // A touch tap on a castle opens the sheet on touch-up; the browser's follow-up click then
  // lands on the scrim that has just appeared and would close the sheet straight away.
  const openedAt = useRef(0);
  useLayoutEffect(() => { if (open) openedAt.current = Date.now(); }, [open]);
  const closeFromScrim = () => { if (Date.now() - openedAt.current > GHOST_CLICK_MS) onClose(); };

  useEffect(() => {
    Animated.timing(slide, { toValue: open ? 1 : 0, duration: 420, easing: SHEET_EASE, useNativeDriver: false }).start();
    Animated.timing(scrim, { toValue: open ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [open, slide, scrim]);

  return (
    <View style={[StyleSheet.absoluteFill, s.root]} pointerEvents={open ? 'auto' : 'box-none'}>
      <Animated.View style={[StyleSheet.absoluteFill, s.scrim, { opacity: scrim }]} pointerEvents={open ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFromScrim} accessibilityLabel="Close the journal" />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal={open}
        aria-modal={open}
        role="dialog"
        pointerEvents={open ? 'auto' : 'none'}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        style={[
          s.sheet,
          { bottom: 10 + bottomInset },
          { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [height * 1.15 + bottomInset, 0] }) }] },
        ]}
      >
        <Ornaments />
        <StationEntry places={places} index={shown} onOpen={onOpen} onClose={onClose} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  // The wrapper is positioned, and react-native-web gives Views z-index 0, so it forms
  // its own stacking context: without a z-index here the header and rail (z 40) paint
  // over the sheet inside it.
  root: { zIndex: 100 },
  scrim: { backgroundColor: 'rgba(26,18,10,.55)', zIndex: 80 },
  sheet: {
    ...cardStyle,
    position: 'absolute',
    zIndex: 90,
    left: 10,
    right: 10,
    maxHeight: '86%',
    boxShadow: '0 -10px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.35)',
  },
});
