import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';

import type { Photograph } from '../data/photos';
import { C, F, em, gradient } from '../theme';
import { useLightbox } from './Lightbox';
import { isNear, Photo } from './Photo';
import { useTouchFirst } from './useTouchFirst';

/**
 * The station's photographs in their mount: swipe or drag sideways, use the arrows,
 * or tap a diamond. Falls back to a plain plate for a single photograph.
 */
export function PhotoGallery({ photos, name, stationId, onIndexChange }: {
  photos: Photograph[];
  name: string;
  /** Resets to the first photograph when the journal turns to another station. */
  stationId: string;
  /** Which photograph is on the plate, so the page can show its title. */
  onIndexChange?: (i: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const touch = useTouchFirst();
  const scroller = useRef<ScrollView>(null);
  const lightbox = useLightbox();

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ x: 0, animated: false });
  }, [stationId]);

  useEffect(() => onIndexChange?.(index), [index, onIndexChange]);

  // Keep the same photograph when the plate changes width (rotating the phone): the
  // scroll offset stays in the old pixels, so ignore scrolling until re-aligned.
  const current = useRef(0);
  current.current = index;
  const aligning = useRef(false);
  useLayoutEffect(() => {
    if (!width) return;
    aligning.current = true;
    scroller.current?.scrollTo({ x: current.current * width, animated: false });
    const t = setTimeout(() => { aligning.current = false; }, 250);
    return () => clearTimeout(t);
  }, [width]);

  // The page an arrow or diamond is scrolling to. Until it arrives, the pages it slides
  // past must not become the index, or the counter flickers back and forth.
  const heading = useRef<number | null>(null);
  const headingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(headingTimer.current), []);

  const go = (i: number) => {
    const next = (i + photos.length) % photos.length;
    // Tapping the current diamond: no scroll would come to clear `heading`.
    if (next === index) return;
    setIndex(next);
    heading.current = next;
    // In case the scroll never lands exactly (a swipe interrupting it).
    clearTimeout(headingTimer.current);
    headingTimer.current = setTimeout(() => { heading.current = null; }, 1000);
    // Wrapping around jumps: sliding would run past every photograph in between.
    scroller.current?.scrollTo({ x: next * width, animated: i === next });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width || aligning.current) return;
    const x = e.nativeEvent.contentOffset.x;
    if (heading.current !== null) {
      if (Math.abs(x - heading.current * width) < 1) heading.current = null;
      return;
    }
    const i = Math.round(x / width);
    if (i !== index && i >= 0 && i < photos.length) setIndex(i);
  };

  const many = photos.length > 1;

  return (
    <>
      <View style={s.frame} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {many && width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            accessibilityLabel={`${name}: ${photos.length} photographs`}
          >
            {photos.map((photo, i) => (
              <Pressable
                key={i}
                style={{ width, height: '100%' }}
                onPress={() => lightbox.open(photos, i, name)}
                accessibilityRole="button"
                accessibilityLabel={`${photo.title ?? name}, photograph ${i + 1} of ${photos.length}. Opens full screen in colour.`}
              >
                {/* Only the pages beside this one load; the rest wait on the bare mount. */}
                {isNear(i, index, photos.length) && (
                  <Photo source={photo.display} sepia={0} fit="cover" alt={photo.title ?? `${name}, photograph ${i + 1} of ${photos.length}`} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => lightbox.open(photos, 0, name)}
            accessibilityRole="button"
            accessibilityLabel={`${name} photograph. Opens full screen in colour.`}
          >
            <Photo source={photos[0]?.display} sepia={0} fit="cover" alt={photos[0]?.title ?? `${name} travel photograph`} />
          </Pressable>
        )}

        <View pointerEvents="none" style={s.vignette} />

        {/* What the plate does when pressed, in the corner opposite the ⤢ button. Spoken
            aloud it would only repeat the plate's own label, so it is hidden from that. */}
        <View style={[s.hint, { pointerEvents: 'none' }]} aria-hidden accessibilityElementsHidden>
          <Text style={s.hintText}>{touch ? 'TAP' : 'CLICK'} TO ENLARGE</Text>
        </View>

        {many && (
          <>
            <Arrow side="left" onPress={() => go(index - 1)} label="Previous photograph" />
            <Arrow side="right" onPress={() => go(index + 1)} label="Next photograph" />
          </>
        )}

        <Pressable
          style={({ pressed }) => [s.expand, pressed && s.expandPressed]}
          onPress={() => lightbox.open(photos, index, name)}
          accessibilityRole="button"
          accessibilityLabel="View full screen in colour"
          hitSlop={6}
        >
          <Text style={s.expandGlyph}>⤢</Text>
        </Pressable>
      </View>

      {many && (
        <View style={s.markers}>
          {photos.length <= 8 ? (
            photos.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => go(i)}
                accessibilityRole="button"
                accessibilityLabel={`Photograph ${i + 1}`}
                accessibilityState={{ selected: i === index }}
                hitSlop={7}
              >
                <View style={[s.diamond, i === index && s.diamondOn]} />
              </Pressable>
            ))
          ) : (
            <Text style={s.count}>{index + 1} OF {photos.length}</Text>
          )}
        </View>
      )}
    </>
  );
}

function Arrow({ side, onPress, label }: { side: 'left' | 'right'; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [s.arrow, side === 'left' ? s.arrowL : s.arrowR, pressed && s.arrowPressed]}
    >
      <Text style={s.arrowGlyph}>{side === 'left' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Photographs fill the 4:3 plate, cropped as needed; the lightbox shows them whole.
  frame: { aspectRatio: 4 / 3, borderWidth: 1, borderColor: 'rgba(58,42,24,.5)', overflow: 'hidden', backgroundColor: '#d8c39b' },
  vignette: {
    ...StyleSheet.absoluteFill,
    ...gradient('radial-gradient(100% 100% at 50% 45%, rgba(0,0,0,0) 45%, rgba(70,45,18,.35) 100%)'),
  },
  arrow: {
    position: 'absolute', top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(246,236,215,.82)', borderWidth: 1, borderColor: 'rgba(58,42,24,.5)',
    boxShadow: '0 2px 6px rgba(30,20,10,.35)',
  },
  arrowL: { left: 8 },
  arrowR: { right: 8 },
  arrowPressed: { backgroundColor: C.parchHi, transform: [{ translateY: 1 }] },
  arrowGlyph: { fontFamily: F.cinzelSemi, fontSize: 19, lineHeight: 22, color: C.ink, marginTop: -2 },
  expand: {
    position: 'absolute', right: 8, bottom: 8, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(246,236,215,.82)', borderWidth: 1, borderColor: 'rgba(58,42,24,.5)',
    boxShadow: '0 2px 6px rgba(30,20,10,.35)',
  },
  expandPressed: { backgroundColor: C.parchHi, transform: [{ translateY: 1 }] },
  hint: {
    position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 11,
    backgroundColor: 'rgba(246,236,215,.82)', borderWidth: 1, borderColor: 'rgba(58,42,24,.5)',
    boxShadow: '0 2px 6px rgba(30,20,10,.35)',
  },
  hintText: { fontFamily: F.cinzelSemi, fontSize: 8.5, letterSpacing: em(8.5, 0.2), color: C.ink },
  expandGlyph: { fontFamily: F.cinzelSemi, fontSize: 13, lineHeight: 16, color: C.ink },
  markers: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingTop: 9 },
  diamond: { width: 5, height: 5, backgroundColor: C.ink, opacity: 0.28, transform: [{ rotate: '45deg' }] },
  diamondOn: { opacity: 0.85 },
  count: { fontFamily: F.cinzelSemi, fontSize: 8.5, letterSpacing: em(8.5, 0.2), color: 'rgba(58,42,24,.55)' },
});
