import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import {
  Animated, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { Photograph } from '../data/photos';
import { useWheelZoom } from '../map/useWheelZoom';
import { IDENTITY, scaleAbout, useZoom, type Transform } from '../map/useZoom';
import { C, F, em, gradient } from '../theme';
import { isNear, Photo } from './Photo';
import { useDoubleClickZoom } from './useDoubleClickZoom';
import { useTouchFirst } from './useTouchFirst';

type Shown = { photos: Photograph[]; index: number; name: string };

const LightboxContext = createContext<{
  open: (photos: Photograph[], index: number, name: string) => void;
  isOpen: boolean;
}>({ open: () => {}, isOpen: false });

export const useLightbox = () => useContext(LightboxContext);

/**
 * Full-screen photograph viewer, in true colour: the sepia treatment belongs to the
 * journal, not to the pictures themselves. Pinch or double-tap to zoom, drag to pan,
 * swipe or use the arrows to move between a station's photographs.
 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);

  const open = useCallback((photos: Photograph[], index: number, name: string) => {
    if (photos.length) setShown({ photos, index, name });
  }, []);
  const close = useCallback(() => setShown(null), []);

  const value = useMemo(() => ({ open, isOpen: shown !== null }), [open, shown]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {shown && <LightboxView {...shown} onClose={close} />}
    </LightboxContext.Provider>
  );
}

/** Whether the lettering shows over a sideways photograph; remembered until reload. */
let sidewaysChrome = true;

function LightboxView({ photos, index: initial, name, onClose }: Shown & { onClose: () => void }) {
  const touch = useTouchFirst();
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Heights of the lettering above and below, so the photograph can sit between them
  // instead of underneath them. Measured, because both grow with their text.
  const [chrome, setChrome] = useState({ top: 0, bottom: 0 });
  const [index, setIndex] = useState(initial);
  const [zoomed, setZoomed] = useState(false);
  // The contact sheet of all the station's photographs, over the pager. The pager stays
  // mounted underneath so its scroll position is still good on the way back.
  const [grid, setGrid] = useState(false);
  const scroller = useRef<ScrollView>(null);
  // Opening by double-clicking the journal photograph lands a second click in here:
  // that one must not also zoom, or the view jumps to wherever the journal photo sat.
  const openedAt = useRef(Date.now());

  // The page an arrow or key is scrolling to. Until it arrives, the pages it slides past
  // must not become the index, or the counter and captions flicker back and forth.
  const heading = useRef<number | null>(null);
  const headingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = useCallback((i: number) => {
    const next = (i + photos.length) % photos.length;
    setIndex(next);
    heading.current = next;
    // In case the scroll never lands exactly (a swipe interrupting it).
    clearTimeout(headingTimer.current);
    headingTimer.current = setTimeout(() => { heading.current = null; }, 1000);
    // Wrapping around jumps: sliding would run past every photograph in between.
    const wraps = i !== next;
    scroller.current?.scrollTo({ x: next * size.w, animated: !wraps });
  }, [photos.length, size.w]);
  useEffect(() => () => clearTimeout(headingTimer.current), []);

  // The photograph on screen, read by the resize effect without re-running it.
  const current = useRef(initial);
  current.current = index;
  // Rotating the phone resizes the pages while the scroll offset stays in the old
  // pixels, which reads as some other photograph. Ignore scrolling until re-aligned.
  const aligning = useRef(false);

  // Open on the photograph that was tapped, and stay on the one being viewed when the
  // screen changes width.
  useLayoutEffect(() => {
    if (!size.w) return;
    aligning.current = true;
    scroller.current?.scrollTo({ x: current.current * size.w, animated: false });
    const t = setTimeout(() => { aligning.current = false; }, 250);
    return () => clearTimeout(t);
  }, [size.w]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (!['Escape', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      // The journal listens for the same keys; while the viewer is up, it owns them.
      e.stopPropagation();
      e.preventDefault();
      // From the grid, Esc goes back to the photograph rather than out of the viewer.
      if (e.key === 'Escape') { if (grid) setGrid(false); else onClose(); }
      else if (grid) return;
      else if (e.key === 'ArrowRight') go(index + 1);
      else go(index - 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [go, grid, index, onClose]);

  /** Leave the grid for the photograph that was tapped. */
  const pick = (i: number) => {
    setIndex(i);
    setGrid(false);
    scroller.current?.scrollTo({ x: i * size.w, animated: false });
    // A quick double-tap on a tile would otherwise land its second tap in the photograph
    // and zoom it, just like the click that opens the viewer.
    openedAt.current = Date.now();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size.w || aligning.current) return;
    const x = e.nativeEvent.contentOffset.x;
    if (heading.current !== null) {
      if (Math.abs(x - heading.current * size.w) < 1) heading.current = null;
      return;
    }
    const i = Math.round(x / size.w);
    if (i !== index && i >= 0 && i < photos.length) setIndex(i);
  };

  const many = photos.length > 1;
  const photo = photos[index];

  // A phone held sideways has too little height to spare for the lettering: the
  // photograph takes the whole screen and the lettering lies over it. A tap hides or
  // shows it.
  // Touch only: the tap that brings the lettering back is a touch gesture.
  const immersive = touch && size.w > size.h && size.h > 0 && size.h < 500 && !grid;
  // Zoomed in, the lettering is out of the way too.
  const overlay = immersive || zoomed;
  const stageH = Math.max(160, size.h - (overlay ? 0 : chrome.top + chrome.bottom));

  // A long caption opens on a tap; each photograph starts collapsed again.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [index]);

  // Shown until tapped away, then kept as left, across photographs, rotations and
  // re-openings of the viewer.
  const [chromeOn, setChromeOn] = useState(sidewaysChrome);
  const visible = !immersive || chromeOn;
  const onTap = useCallback(() => {
    if (!immersive) return;
    sidewaysChrome = !sidewaysChrome;
    setChromeOn(sidewaysChrome);
  }, [immersive]);

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [fade, visible]);
  // Hidden lettering must not catch the taps meant for the photograph beneath it. The web
  // only understands 'box-none' in a StyleSheet: inline, as here, it becomes invalid CSS
  // that the browser drops, leaving the earlier 'none' in place and the buttons dead.
  const shownEvents = Platform.OS === 'web' ? 'auto' : 'box-none';
  const chromeStyle = { opacity: fade, pointerEvents: visible ? shownEvents : 'none' } as const;

  return (
    <View
      style={s.root}
      onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
      role="dialog"
      aria-modal
      accessibilityViewIsModal
    >
      {size.w > 0 && (
        <View style={[s.stage, !overlay && { top: chrome.top, bottom: chrome.bottom }]}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed && !grid}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {photos.map((photo, i) => (
            <Page
              key={i}
              // Only the pages beside this one load; the rest stay dark until approached.
              photo={isNear(i, index, photos.length) ? photo : undefined}
              w={size.w}
              h={stageH}
              active={i === index}
              alt={photo.title ?? `${name}, photograph ${i + 1} of ${photos.length}`}
              onZoom={(k) => i === index && setZoomed(k > 1.02)}
              onTap={onTap}
              openedAt={openedAt}
            />
          ))}
        </ScrollView>
        </View>
      )}

      {grid && size.w > 0 && (
        <Grid
          photos={photos}
          name={name}
          current={index}
          w={size.w}
          style={{ top: chrome.top, bottom: chrome.bottom }}
          onPick={pick}
        />
      )}

      <Animated.View
        style={[s.top, immersive && s.topOver, chromeStyle]}
        onLayout={(e) => setChrome((c) => ({ ...c, top: Math.round(e.nativeEvent.layout.height) }))}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.caption} numberOfLines={1}>
            {name.toUpperCase()}
            {grid ? `  ·  ${photos.length} PHOTOGRAPHS` : many ? `  ·  ${index + 1} / ${photos.length}` : ''}
          </Text>
          {/* the photographer's own title, from the file; photographs without one show none */}
          {!grid && !!photo?.title && <Text style={s.photoTitle} numberOfLines={2}>{photo.title}</Text>}
        </View>
        {many && !zoomed && (
          <Pressable
            style={({ pressed }) => [s.close, pressed && s.arrowPressed]}
            onPress={() => setGrid((g) => !g)}
            accessibilityRole="button"
            accessibilityLabel={grid ? 'Back to the photograph' : 'Show all the photographs'}
          >
            <GridGlyph single={grid} />
          </Pressable>
        )}
        <Pressable style={s.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the photograph">
          <Text style={s.closeGlyph}>✕</Text>
        </Pressable>
      </Animated.View>

      {/* On touch screens the arrows cover too much of the photograph; swipe instead. */}
      {many && !zoomed && !grid && !touch && (
        <>
          <Arrow side="left" onPress={() => go(index - 1)} label="Previous photograph" />
          <Arrow side="right" onPress={() => go(index + 1)} label="Next photograph" />
        </>
      )}

      {/* caption and hint on the black below the photograph, never over it, except held
          sideways, where they lie over its foot on a shadow */}
      <Animated.View
        style={[s.bottom, immersive && s.bottomOver, chromeStyle]}
        onLayout={(e) => setChrome((c) => ({ ...c, bottom: Math.round(e.nativeEvent.layout.height) }))}
      >
        {!!photo?.caption && !zoomed && !grid && (
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show less of the caption' : 'Show the whole caption'}
          >
            <Text style={s.cap} numberOfLines={expanded ? 12 : 2}>{photo.caption}</Text>
          </Pressable>
        )}

        <Text style={s.hint}>
        {grid
          ? `${touch ? 'Tap' : 'Click'} a photograph to view it`
          : zoomed
          ? touch ? 'Double-tap to fit again' : 'Double-click to fit again'
          : touch
            ? `${immersive ? 'Tap to hide  ·  ' : ''}${many ? 'Swipe for more  ‹ ›  ·  ' : ''}Pinch or double-tap to zoom`
            : 'Double-click to zoom · Esc to close'}
        </Text>
      </Animated.View>
    </View>
  );
}

/** One photograph, zoomable and pannable within its page. */
function Page({ photo, w, h, active, alt, onZoom, onTap, openedAt }: {
  /** Absent for pages far from the one on screen, which load nothing. */
  photo?: Photograph;
  w: number;
  h: number;
  active: boolean;
  alt: string;
  onZoom: (k: number) => void;
  /** A single tap, once it is clear it is not the start of a double-tap. */
  onTap: () => void;
  openedAt: { current: number };
}) {
  const zoom = useZoom();
  const surface = useRef<View>(null);
  const { transform } = zoom;

  // Panning must not drag the picture off the screen.
  const clamp = useCallback((t: Transform): Transform => {
    const limitX = (Math.max(1, t.k) - 1) * w / 2;
    const limitY = (Math.max(1, t.k) - 1) * h / 2;
    return {
      k: t.k,
      x: Math.min(limitX, Math.max(-limitX, t.x)),
      y: Math.min(limitY, Math.max(-limitY, t.y)),
    };
  }, [w, h]);

  const set = useCallback((t: Transform) => {
    const c = clamp(t);
    zoom.set(c);
    onZoom(c.k);
  }, [clamp, onZoom, zoom]);

  // Wheel zoom goes through `set` so it stays within the page, and about the centre,
  // because that is what a transformed View scales about.
  useWheelZoom(surface, zoom.ref, set, zoom.cancel, 'centre');

  // A new screen width (rotating the phone) invalidates the zoom and its pan limits.
  const lastW = useRef(w);
  useEffect(() => {
    if (lastW.current === w) return;
    lastW.current = w;
    if (zoom.ref.current.k !== 1) {
      zoom.set(IDENTITY);
      onZoom(1);
    }
  }, [w, onZoom, zoom]);

  useEffect(() => {
    if (!active && zoom.ref.current.k !== 1) {
      zoom.set(IDENTITY);
      onZoom(1);
    }
  }, [active, onZoom, zoom]);

  /** Zoom in about the given point, or back to fit if already zoomed. */
  const toggleZoom = useCallback((x: number, y: number) => {
    if (Date.now() - openedAt.current < 450) return; // the click that opened the viewer
    if (zoom.ref.current.k > 1.02) {
      zoom.animateTo(IDENTITY, 220);
      onZoom(1);
    } else {
      const target = clamp(scaleAbout(IDENTITY, 2.5, x - w / 2, y - h / 2));
      zoom.animateTo(target, 220);
      onZoom(target.k);
    }
  }, [clamp, h, onZoom, openedAt, w, zoom]);

  useDoubleClickZoom(surface, toggleZoom);

  // Every drag update re-renders, which rebuilds the gesture. Holding the handlers and
  // the running totals in refs keeps a drag continuous across those rebuilds: otherwise
  // the start point resets to zero while the gesture's distance keeps growing, and the
  // next move applies that whole distance at once.
  const handlers = useRef({ set, toggleZoom, onZoom, onTap });
  handlers.current = { set, toggleZoom, onZoom, onTap };
  const last = useRef({ scale: 1, x: 0, y: 0 });

  const { ref: transformRef, cancel, animateTo } = zoom;
  const canPan = transform.k > 1.02;

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => { cancel(); last.current.scale = 1; })
      .onUpdate((e) => {
        handlers.current.set(
          scaleAbout(transformRef.current, e.scale / last.current.scale, e.focalX - w / 2, e.focalY - h / 2),
        );
        last.current.scale = e.scale;
      })
      .onEnd(() => {
        if (transformRef.current.k <= 1.02) { animateTo(IDENTITY, 200); handlers.current.onZoom(1); }
      });

    // Only while zoomed in, so an un-zoomed drag still pages the viewer.
    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(canPan)
      .onStart(() => { cancel(); last.current.x = 0; last.current.y = 0; })
      .onUpdate((e) => {
        const t = transformRef.current;
        handlers.current.set({
          ...t,
          x: t.x + e.translationX - last.current.x,
          y: t.y + e.translationY - last.current.y,
        });
        last.current.x = e.translationX;
        last.current.y = e.translationY;
      });

    // A short window between the taps, because the single tap has to wait it out.
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(280)
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((e) => handlers.current.toggleZoom(e.x, e.y));

    // Shows or hides the lettering (the parent decides whether that applies). Exclusive
    // makes it wait for the double-tap to fail, so a zoom never toggles it as well.
    const singleTap = Gesture.Tap()
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((_e, ok) => { if (ok) handlers.current.onTap(); });

    // No tap-to-close: it would fire on the first tap of a double-tap zoom.
    return Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, singleTap));
    // Only these change the gesture itself; the handlers come from the ref above.
  }, [animateTo, cancel, canPan, h, transformRef, w]);

  return (
    // On web the detector otherwise sets touch-action: none, which stops the browser from
    // scrolling the pages sideways, so a swipe did nothing. Zoomed in, our own pan drags
    // the picture instead.
    <GestureDetector gesture={gesture} touchAction={canPan ? 'none' : 'pan-x'}>
      <View style={{ width: w, height: h, overflow: 'hidden' }}>
        {/* GestureDetector claims its child's ref, and this layer is untransformed,
            so browser events measured against it are in page coordinates. */}
        <View ref={surface} style={StyleSheet.absoluteFill}>
          <View
            style={{
              flex: 1,
              transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.k }],
            }}
          >
            {/* The plate's copy is usually loaded already, so it shows at once while the
                original, for zooming in, arrives over it. Both fit the same box. */}
            <Photo source={photo?.display} sepia={0} fit="contain" />
            <Photo source={photo?.src} sepia={0} fit="contain" alt={alt} />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const GAP = 3;
const MAX_TILE = 180;

/**
 * Every photograph of the station as square tiles, edge to edge: three across on a phone,
 * more as the screen widens, none larger than MAX_TILE. Opens scrolled to the photograph
 * that was being viewed. A virtualised list, so only the rows near the screen are built
 * and load their (small) copies.
 */
function Grid({ photos, name, current, w, style, onPick }: {
  photos: Photograph[];
  name: string;
  current: number;
  w: number;
  style: { top: number; bottom: number };
  onPick: (i: number) => void;
}) {
  const cols = Math.max(3, Math.ceil((w + GAP) / (MAX_TILE + GAP)));
  const tile = Math.floor((w - GAP * (cols - 1)) / cols);
  const rowH = tile + GAP;
  const row = Math.floor(current / cols);
  const list = useRef<FlatList<Photograph>>(null);

  return (
    <FlatList
      // The column count can't change on a live list, so turning the phone makes a new one.
      key={cols}
      ref={list}
      style={[s.grid, style]}
      data={photos}
      keyExtractor={(_, i) => String(i)}
      numColumns={cols}
      columnWrapperStyle={s.gridRow}
      // The tiles are sized to the full width; a desktop scrollbar would cut off the last column.
      showsVerticalScrollIndicator={false}
      // Rows two screens above and below, rather than the default ten, which is every row
      // of even the largest station.
      windowSize={5}
      // Per row: every row is a tile high plus the gap below it, so the list can jump
      // straight to any row without building the ones above.
      getItemLayout={(_, r) => ({ length: rowH, offset: rowH * r, index: r })}
      initialScrollIndex={row}
      // Then centre that row, once the list knows its own height.
      onLayout={(e) => {
        const y = Math.max(0, row * rowH - (e.nativeEvent.layout.height - tile) / 2);
        list.current?.scrollToOffset({ offset: y, animated: false });
      }}
      renderItem={({ item: photo, index: i }) => (
        <Pressable
          onPress={() => onPick(i)}
          style={({ pressed }) => [{ width: tile, height: tile, overflow: 'hidden' }, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel={`${photo.title ?? name}, photograph ${i + 1} of ${photos.length}`}
          accessibilityState={{ selected: i === current }}
        >
          <Photo source={photo.thumb} sepia={0} fit="cover" alt={photo.title ?? `${name}, photograph ${i + 1}`} />
          {i === current && <View style={[s.tileOn, { pointerEvents: 'none' }]} />}
        </Pressable>
      )}
    />
  );
}

/** Four small squares for "show the grid", one frame for "back to the photograph". */
function GridGlyph({ single }: { single: boolean }) {
  if (single) return <View style={s.glyphFrame} />;
  return (
    <View style={s.glyphGrid}>
      {[0, 1, 2, 3].map((i) => <View key={i} style={s.glyphCell} />)}
    </View>
  );
}

function Arrow({ side, onPress, label }: { side: 'left' | 'right'; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [s.arrow, side === 'left' ? s.arrowL : s.arrowR, pressed && s.arrowPressed]}
    >
      <Text style={s.arrowGlyph}>{side === 'left' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const CHROME = 'rgba(240,226,196,.82)';

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 200, backgroundColor: '#110d09' },
  stage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  top: {
    // paddingBottom is the gap between the title and the top of the photograph
    position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 7,
  },
  caption: { fontFamily: F.cinzelSemi, fontSize: 10, letterSpacing: em(10, 0.24), color: CHROME },
  photoTitle: { fontFamily: F.garamondSemi, fontSize: 15, lineHeight: 19, color: CHROME, marginTop: 4 },
  cap: { fontFamily: F.garamond, fontSize: 13, lineHeight: 18.5, textAlign: 'center', color: 'rgba(240,226,196,.92)' },
  close: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(240,226,196,.45)', backgroundColor: 'rgba(28,22,16,.75)',
  },
  closeGlyph: { fontFamily: F.cinzel, fontSize: 15, lineHeight: 18, color: CHROME },
  arrow: {
    position: 'absolute', top: '50%', marginTop: -19, width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(240,226,196,.45)', backgroundColor: 'rgba(28,22,16,.75)',
  },
  arrowL: { left: 12 },
  arrowR: { right: 12 },
  arrowPressed: { backgroundColor: 'rgba(48,38,26,.9)' },
  arrowGlyph: { fontFamily: F.cinzelSemi, fontSize: 20, lineHeight: 24, color: CHROME, marginTop: -2 },
  grid: { position: 'absolute', left: 0, right: 0, backgroundColor: '#110d09' },
  gridRow: { gap: GAP, marginBottom: GAP },
  tileOn: { ...StyleSheet.absoluteFill, borderWidth: 2, borderColor: 'rgba(240,226,196,.9)' },
  glyphGrid: { width: 14, height: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  glyphCell: { width: 6, height: 6, backgroundColor: CHROME },
  glyphFrame: { width: 14, height: 11, borderWidth: 1.5, borderColor: CHROME },
  // Held sideways the lettering lies over the photograph, on a shadow that keeps it legible.
  topOver: { ...gradient('linear-gradient(to bottom, rgba(17,13,9,.8), rgba(17,13,9,0))') },
  bottomOver: { ...gradient('linear-gradient(to top, rgba(17,13,9,.85), rgba(17,13,9,0))'), paddingTop: 28 },
  hint: { textAlign: 'center', fontFamily: F.garamondItalic, fontSize: 11, color: 'rgba(240,226,196,.5)' },
});
