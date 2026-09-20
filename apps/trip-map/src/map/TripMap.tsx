import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, Rect, Stop, Text as SvgText,
} from 'react-native-svg';

import {
  COMPASS_BETWEEN, DIVISION_LABELS, EUROPE_LANDS, EUROPE_SEAS, LANDMARKS, PLACES, RIVER_LABELS, SEAS, type MapLabel,
} from '../data/places';
import { C, F, em, gradient } from '../theme';
import { BAKE_WOBBLE, EffectDefs, LAND_FILTER, PaperGrainOverlay, PaperGrainSvg } from './effects';
import { buildChart, inkWobble, legPath, legPoint, type Chart } from './geo';
import { textWidth } from './textWidth';
import { useWheelZoom } from './useWheelZoom';
import { IDENTITY, scaleAbout, useZoom, type Transform } from './useZoom';

const HIT_RADIUS = 22;
/** Finger movement (px) that still counts as a tap; beyond it the touch becomes a pan. */
const TAP_SLOP = 10;
const EDGE = 5;

/**
 * Below 1× the zoomed geometry would thin to hairlines, so strokes are divided by k.
 * Quantised to thirds of an octave so the heavy country layer re-renders only now and then.
 */
const inkFor = (k: number) => (k >= 1 ? 1 : 2 ** (Math.round(-Math.log2(k) * 3) / 3));

/** 0 → 1 as k goes from `from` to `to`. */
const fade = (k: number, from: number, to: number) => Math.min(1, Math.max(0, (k - from) / (to - from)));

/** 1 at journey scale, fading to 0 by the Europe overview (k ≤ 0.4). */
const detailFor = (k: number) => fade(k, 0.4, 0.6);
/** Région / regione borders and names: in by the journey view. */
const regionsFor = (k: number) => fade(k, 0.6, 0.9);
/** Département / provincia borders and names: in once zoomed to about 2×. */
const localsFor = (k: number) => fade(k, 1.5, 2.2);

/** k rounded to thirds of an octave, so screen-px strokes re-render only now and then. */
const quantK = (k: number) => 2 ** (Math.round(Math.log2(k) * 3) / 3);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** Where along a leg (0–1) its numeral may sit, best first. */
const NUMERAL_TS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74];
const DRAW_MS = 2200;

/** How much of leg `i` is drawn (0–1) when `drawn` (0–1) of the whole route is. */
const legProgress = (chart: Chart, i: number, drawn: number) => {
  const leg = chart.legs[i];
  return Math.min(1, Math.max(0, (drawn * chart.routeLength - leg.start) / leg.length));
};

/**
 * With a station open, the route shows only the journey so far: the legs leading to it.
 * Leg i runs from PLACES[i] to PLACES[i + 1], so the first station shows no legs at all.
 */
const legShown = (i: number, active: number) => active < 0 || i < active;

export function TripMap({ active, onOpen }: { active: number; onOpen: (i: number) => void }) {
  const [size, setSize] = useState({ W: 0, H: 0 });
  const { W, H } = size;
  const zoom = useZoom();
  const { transform } = zoom;
  const surface = useRef<View>(null);

  const chart = useMemo(
    () => (W && H ? buildChart(W, H, BAKE_WOBBLE ? inkWobble(1.2) : undefined) : null),
    [W, H],
  );
  const kMin = chart?.kMin ?? 1;
  const ink = inkFor(transform.k);
  const drawn = useDrawIn(chart);

  useWheelZoom(surface, zoom.ref, zoom.set, zoom.cancel, 'top-left', kMin);

  const gesture = useMemo(() => {
    let lastScale = 1;
    let lastX = 0;
    let lastY = 0;

    // A fingertip always drifts a pixel or two; without a threshold the pan activates at
    // once and wins the race against the tap, so castles never open on a phone.
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(TAP_SLOP)
      .onStart(() => { zoom.cancel(); lastX = 0; lastY = 0; })
      .onUpdate((e) => {
        const t = zoom.ref.current;
        zoom.set({ ...t, x: t.x + e.translationX - lastX, y: t.y + e.translationY - lastY });
        lastX = e.translationX;
        lastY = e.translationY;
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => { zoom.cancel(); lastScale = 1; })
      .onUpdate((e) => {
        zoom.set(scaleAbout(zoom.ref.current, e.scale / lastScale, e.focalX, e.focalY, kMin));
        lastScale = e.scale;
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(TAP_SLOP)
      .onEnd((e, success) => {
        if (!success || !chart) return;
        const hit = hitTest(chart, zoom.ref.current, e.x, e.y);
        if (hit >= 0) onOpen(hit);
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [chart, kMin, onOpen, zoom.cancel, zoom.ref, zoom.set]);

  const zoomBy = (factor: number) =>
    zoom.animateTo(scaleAbout(zoom.ref.current, factor, W / 2, H / 2, kMin), 300);

  return (
    <View style={s.wrap}>
      <GestureDetector gesture={gesture}>
        <View
          ref={surface}
          style={s.surface}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setSize({ W: Math.round(width), H: Math.round(height) });
          }}
          accessibilityLabel="Medieval-style interactive map from Cucuron to Lyon"
        >
          {chart ? (
            <>
              <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <Defs>
                  <LinearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={C.seaTop} />
                    <Stop offset="1" stopColor={C.seaBottom} />
                  </LinearGradient>
                  <Pattern id="hatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <Path d="M0 0.5H7" stroke={C.seaHatch} strokeOpacity={0.28} strokeWidth={1} />
                  </Pattern>
                  <EffectDefs />
                </Defs>

                <Rect width={W} height={H} fill="url(#seaGrad)" />
                <Rect width={W} height={H} fill="url(#hatch)" />

                <G transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                  <World chart={chart} ink={ink} />
                  <Rivers chart={chart} kq={quantK(transform.k)} opacity={detailFor(transform.k)} />
                  <Divisions
                    chart={chart}
                    kq={quantK(transform.k)}
                    region={regionsFor(transform.k)}
                    local={localsFor(transform.k)}
                  />
                  <Route chart={chart} kq={quantK(transform.k)} drawn={drawn} active={active} />
                </G>

                <Overlay chart={chart} transform={transform} active={active} drawn={drawn} W={W} H={H} />
                <Paper W={W} H={H} />
              </Svg>
              <PaperGrainOverlay />
            </>
          ) : (
            <View style={s.loading}>
              <Text style={s.loadingText}>unrolling the chart…</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      <View style={s.controls}>
        <MapButton label="+" title="Zoom in" onPress={() => zoomBy(1.6)} />
        <MapButton label="−" title="Zoom out" onPress={() => zoomBy(1 / 1.6)} />
        <MapButton label="☉" title="Fit the journey" small onPress={() => zoom.animateTo(IDENTITY, 500)} />
      </View>
    </View>
  );
}

function hitTest(chart: Chart, t: Transform, x: number, y: number) {
  let best = -1;
  let bestD = HIT_RADIUS;
  PLACES.forEach((p, i) => {
    const [px, py] = chart.projection([p.lon, p.lat])!;
    const d = Math.hypot(px * t.k + t.x - x, py * t.k + t.y - y);
    if (d <= bestD) { best = i; bestD = d; }
  });
  return best;
}

/* ---------- zoomable geometry ---------- */

const COAST_STROKES: [number, number][] = [[13, 0.1], [9, 0.13], [5.5, 0.18], [2.6, 0.3]];

const World = memo(function World({ chart, ink }: { chart: Chart; ink: number }) {
  // The shore hatching only partly keeps its width, or it swamps a continent-sized view.
  const hatch = Math.sqrt(ink);
  const landPath = (c: Chart['land'][number]) => (
    <Path
      key={c.name}
      d={c.d}
      fill={c.hero ? C.land : C.landNeighbour}
      stroke={C.inkMap}
      strokeWidth={0.9 * ink}
      strokeOpacity={0.75}
    />
  );
  return (
    <G>
      {/* coastal hachure: thick strokes under the land fill read as engraved shore hatching */}
      {COAST_STROKES.map(([w, o]) => (
        <G key={w}>
          {chart.land.map((c) => (
            <Path key={c.name} d={c.d} fill="none" stroke={C.coast} strokeOpacity={o} strokeWidth={w * hatch} />
          ))}
        </G>
      ))}
      {/* the web ink-blot filter only on the countries around the route: its region would
          otherwise span the whole continent at 7× */}
      {chart.land.filter((c) => !c.near).map(landPath)}
      <G filter={LAND_FILTER}>{chart.land.filter((c) => c.near).map(landPath)}</G>
      {chart.land.filter((c) => c.hero).map((c) => (
        <Path key={c.name} d={c.d} fill="none" stroke={C.landGlow} strokeOpacity={0.5} strokeWidth={3 * ink} />
      ))}
    </G>
  );
});

/** The Rhône and the Saône in the sea's ink, a constant screen width; gone at the Europe overview. */
const Rivers = memo(function Rivers({ chart, kq, opacity }: { chart: Chart; kq: number; opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <Path
      d={chart.rivers}
      fill="none"
      stroke={C.coast}
      strokeOpacity={0.7 * opacity}
      strokeWidth={1.6 / kq}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});

/**
 * France's and Italy's internal borders in the chart's faint ink: régions dash-dot,
 * départements / province dotted. Widths are screen px (divided by the quantised zoom),
 * and everything is clipped to the two countries so no line runs out past the coast.
 */
const Divisions = memo(function Divisions({ chart, kq, region, local }: {
  chart: Chart; kq: number; region: number; local: number;
}) {
  if (region <= 0 && local <= 0) return null;
  const px = (n: number) => n / kq;
  return (
    <>
      <Defs>
        <ClipPath id="heroClip">
          <Path d={chart.divisions.clip} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#heroClip)">
        {local > 0 && (
          <Path
            d={chart.divisions.local}
            fill="none"
            stroke={C.inkMap}
            strokeOpacity={0.5 * local}
            strokeWidth={px(1.3)}
            strokeDasharray={[px(0.1), px(3.2)]}
            strokeLinecap="round"
          />
        )}
        {region > 0 && (
          <Path
            d={chart.divisions.region}
            fill="none"
            stroke={C.inkMap}
            strokeOpacity={0.55 * region}
            strokeWidth={px(1.1)}
            strokeDasharray={[px(6), px(2.5), px(1), px(2.5)]}
            strokeLinecap="round"
          />
        )}
      </G>
    </>
  );
});

const easeCubicOut = (t: number) => 1 - (1 - t) ** 3;

/** 0 → 1 over DRAW_MS, eased, each time the chart is (re)built. */
function useDrawIn(chart: Chart | null) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    if (!chart) return;
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / DRAW_MS);
      setDrawn(easeCubicOut(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [chart]);
  return drawn;
}

/**
 * The journey as gently bowed legs: a fine dashed wine line on a pale halo, at a constant
 * screen width. Legs draw in one after another; with a station open, only the legs up to it
 * are drawn, the one arriving there a little heavier.
 */
const Route = memo(function Route({ chart, kq, drawn, active }: {
  chart: Chart; kq: number; drawn: number; active: number;
}) {
  const px = (n: number) => n / kq;
  return (
    <>
      {chart.legs.map((leg, i) => {
        const t = legProgress(chart, i, drawn);
        if (t <= 0 || !legShown(i, active)) return null;
        const d = legPath(leg, t);
        const focused = i === active - 1;
        return (
          <G key={i}>
            <Path d={d} fill="none" stroke={C.labelHalo} strokeOpacity={0.6} strokeWidth={px(focused ? 5 : 4)} strokeLinecap="round" />
            <Path
              d={d}
              fill="none"
              stroke={C.wine}
              strokeWidth={px(focused ? 2 : 1.5)}
              strokeDasharray={[px(5), px(3.5)]}
              strokeLinecap="round"
            />
          </G>
        );
      })}
    </>
  );
});

/* ---------- non-scaling overlay ---------- */

type Anchor = 'start' | 'middle' | 'end';

type Box = { l: number; t: number; r: number; b: number };
const overlaps = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

/** Horizontal nudge that keeps a label's box inside the frame (5 px margin). */
function nudge(x: number, width: number, anchor: Anchor, W: number) {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  if (left < EDGE) return EDGE - left;
  if (left + width > W - EDGE) return W - EDGE - (left + width);
  return 0;
}

function Overlay({ chart, transform: t, active, drawn, W, H }: {
  chart: Chart; transform: Transform; active: number; drawn: number; W: number; H: number;
}) {
  const P = (lon: number, lat: number) => {
    const [x, y] = chart.projection([lon, lat])!;
    return [x * t.k + t.x, y * t.k + t.y] as const;
  };

  const detail = detailFor(t.k);

  /** `avoid`: leave the label out while it would sit on a station's castle or name. */
  const areaLabel = (m: MapLabel, sea: boolean, opacity: number, avoid = false) => {
    if (opacity <= 0) return null;
    const [x, y] = P(m.lon, m.lat);
    // off-frame labels stay off: the edge nudge would otherwise drag them into view
    if (x < 0 || x > W || y < 0 || y > H) return null;
    const family = sea || m.it ? F.garamondItalic : F.cinzelSemi;
    const spacing = em(m.size, sea ? 0.14 : m.ls ?? 0);
    const width = textWidth(m.t, family, m.size, spacing);
    const dx = nudge(x, width, 'middle', W);
    if (avoid) {
      const box = { l: x + dx - width / 2, r: x + dx + width / 2, t: y - m.size * 0.8, b: y + 2 };
      if (obstacles.some((b) => overlaps(box, b))) return null;
    }
    return (
      <SvgText
        key={m.t}
        x={x + dx}
        y={y}
        textAnchor="middle"
        fontFamily={family}
        fontSize={m.size}
        letterSpacing={spacing}
        fill={sea ? C.seaLabel : C.landLabel}
        fillOpacity={(sea ? 0.8 : 0.85) * opacity}
      >
        {m.t}
      </SvgText>
    );
  };

  // compass rose attached to two sea labels (COMPASS_BETWEEN in places.ts): centred between
  // them, its N just clear of the lower one. It pans and zooms with the map but, like the
  // labels, keeps its size, so the gap is set in screen pixels rather than degrees.
  const R = Math.min(34, W * 0.1);
  const [cx, cy] = (() => {
    const anchors = COMPASS_BETWEEN.map((name) => SEAS.find((l) => l.t === name))
      .filter((l): l is MapLabel => !!l)
      .map((l) => P(l.lon, l.lat));
    if (!anchors.length) return P(5.3, 42.5);
    const x = anchors.reduce((sum, [ax]) => sum + ax, 0) / anchors.length;
    const lowest = Math.max(...anchors.map(([, ay]) => ay));
    return [x, lowest + R + 28] as const;
  })();
  // the longest round distance that still fits a modest bar (100 km at 1×, as designed)
  const maxBar = Math.max(150, chart.kmPer100 * 1.01);
  const scaleKm = [1000, 500, 250, 100, 50, 25, 10].find((km) => (chart.kmPer100 * t.k * km) / 100 <= maxBar) ?? 10;
  const scaleLen = (chart.kmPer100 * t.k * scaleKm) / 100;
  // markers shrink towards the overview so the five stations don't pile into one blot
  const m = Math.max(0.45, Math.min(1, t.k * 1.6));

  const spacing = em(13, 0.04);
  const stations = PLACES.map((pl) => {
    const [x, y] = P(pl.lon, pl.lat);
    const ta: Anchor = pl.anchor === 'w' ? 'end' : pl.anchor === 'e' ? 'start' : 'middle';
    const width = textWidth(pl.name, F.cinzelSemi, 13, spacing);
    const lx0 = (pl.anchor === 'w' ? -16 : pl.anchor === 'e' ? 16 : 0) * m;
    const lx = lx0 + nudge(x + lx0, width, ta, W);
    const ly = (pl.anchor === 's' ? 24 : -21) * m;
    const left = x + lx - (ta === 'end' ? width : ta === 'middle' ? width / 2 : 0);
    // the castle, plus its name while names are shown
    const boxes: Box[] = [{ l: x - 11 * m, r: x + 11 * m, t: y - 24 * m, b: y + 4 * m }];
    if (detail > 0) boxes.push({ l: left - 2, r: left + width + 2, t: y + ly - 12, b: y + ly + 3 });
    return { pl, x, y, lx, ly, ta, boxes };
  });

  // a numeral on each leg once the drawing has passed its middle, slid along the curve
  // (NUMERAL_TS) until it's off every castle and station name; a leg too short to have
  // such a spot at this zoom goes without until zoomed in
  const numeralBox = (x: number, y: number): Box => ({ l: x - 9, r: x + 9, t: y - 9, b: y + 9 });
  const stationBoxes = stations.flatMap((st) => st.boxes);
  const numerals = chart.legs.flatMap((leg, i) => {
    const drawnTo = legProgress(chart, i, drawn);
    if (detail <= 0 || drawnTo < 0.5 || !legShown(i, active)) return [];
    const at = (s: number) => {
      const [mx, my] = legPoint(leg, s);
      return { x: mx * t.k + t.x, y: my * t.k + t.y };
    };
    const clear = NUMERAL_TS.filter((s) => s <= drawnTo).map(at)
      .find(({ x, y }) => !stationBoxes.some((b) => overlaps(numeralBox(x, y), b)));
    return clear ? [{ i, ...clear }] : [];
  });
  const obstacles: Box[] = [...stationBoxes, ...numerals.map(({ x, y }) => numeralBox(x, y))];

  return (
    <G>
      {LANDMARKS.map((l) => areaLabel(l, false, detail))}
      {SEAS.map((l) => areaLabel(l, true, detail))}
      {RIVER_LABELS.map((l) => areaLabel(l, true, detail, true))}
      {DIVISION_LABELS.map((l) => areaLabel(l, false, l.level === 'region' ? regionsFor(t.k) : localsFor(t.k), true))}
      {EUROPE_LANDS.map((l) => areaLabel(l, false, 1 - detail))}
      {EUROPE_SEAS.map((l) => areaLabel(l, true, 1 - detail))}

      {numerals.map(({ i, x, y }) => (
        <G key={`leg${i}`} transform={`translate(${x},${y})`} opacity={detail}>
          <Circle r={8} fill={C.plate} stroke={C.wine} strokeWidth={0.9} />
          <SvgText y={3} textAnchor="middle" fontFamily={F.cinzelBold} fontSize={8} fill={C.wine}>{ROMAN[i]}</SvgText>
        </G>
      ))}

      {stations.map(({ pl, x, y, lx, ly, ta }, i) => {
        const on = i === active;
        const label = { x: lx, y: ly, textAnchor: ta, fontFamily: F.cinzelSemi, fontSize: 13, letterSpacing: spacing };
        return (
          <G key={pl.id} transform={`translate(${x},${y})`}>
            <Circle r={HIT_RADIUS * m} fill="transparent" />
            {on && <Circle r={17 * m} fill="none" stroke={C.wine} strokeWidth={1} strokeDasharray={[2, 4]} opacity={0.9} />}
            <G transform={`scale(${on ? 1.18 * m : m}) translate(0,${on ? -1 : 0})`}>
              <Castle />
            </G>
            {detail > 0 && (
              <G opacity={detail}>
                <SvgText {...label} stroke={C.labelHalo} strokeWidth={3.2} strokeLinejoin="round" fill="none">{pl.name}</SvgText>
                <SvgText {...label} fill={C.ink}>{pl.name}</SvgText>
              </G>
            )}
          </G>
        );
      })}

      {/* compass rose */}
      <G transform={`translate(${cx},${cy})`} opacity={0.78}>
        <Circle r={R} fill={C.labelHalo} fillOpacity={0.35} stroke={C.inkMap} strokeWidth={1} />
        <Circle r={R * 0.74} fill="none" stroke={C.inkMap} strokeWidth={0.6} />
        {[0, 1, 2, 3].map((i) => (
          <Path
            key={`c${i}`}
            d={`M0 ${-R} L${R * 0.16} 0 L0 ${R * 0.16} L${-R * 0.16} 0 Z`}
            transform={`rotate(${i * 90})`}
            fill={i % 2 ? C.plate : C.inkMap}
            stroke={C.inkMap}
            strokeWidth={0.7}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Path
            key={`d${i}`}
            d={`M0 ${-R * 0.62} L${R * 0.1} 0 L0 ${R * 0.1} L${-R * 0.1} 0 Z`}
            transform={`rotate(${45 + i * 90})`}
            fill={C.inkMap}
            fillOpacity={0.55}
          />
        ))}
        <Circle r={2.6} fill={C.inkMap} />
        <SvgText y={-R - 6} textAnchor="middle" fontFamily={F.cinzelBold} fontSize={10} fill={C.inkMap}>N</SvgText>
      </G>

      {/* scale bar, right-aligned just left of the zoom controls */}
      <G transform={`translate(${W - 64 - Math.max(scaleLen, 96)},${H - 26})`} opacity={0.8}>
        <Rect width={scaleLen} height={4} fill={C.inkMap} fillOpacity={0.75} />
        <Rect width={scaleLen / 2} height={4} fill={C.plate} stroke={C.inkMap} strokeWidth={0.6} />
        <SvgText y={-5} fontFamily={F.garamondItalic} fontSize={10} fill={C.inkMap}>
          {`${scaleKm} leagues & more`}
        </SvgText>
      </G>
    </G>
  );
}

/** Crenellated keep + gate + pennant, drawn around the geographic point. */
const Castle = memo(function Castle() {
  return (
    <>
      <Ellipse cy={3} rx={11} ry={3.4} fill="#2e1f0e" opacity={0.28} />
      <Path
        d="M-10 0 L-10 -11 L-7.5 -11 L-7.5 -14 L-4.6 -14 L-4.6 -11 L-1.6 -11 L-1.6 -14 L1.3 -14 L1.3 -11 L4.3 -11 L4.3 -14 L7.2 -14 L7.2 -11 L10 -11 L10 0 Z"
        fill={C.plate}
        stroke={C.ink}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <Rect x={-2.4} y={-7} width={4.8} height={7} fill={C.ink} opacity={0.8} />
      <Path d="M0 -14 L0 -23" stroke={C.ink} strokeWidth={1.2} />
      <Path d="M0 -23 L8 -20.6 L0 -18.2 Z" fill={C.wine} stroke={C.ink} strokeWidth={0.9} />
    </>
  );
});

/* ---------- paper ---------- */

const Paper = memo(function Paper({ W, H }: { W: number; H: number }) {
  return (
    <G pointerEvents="none">
      <PaperGrainSvg W={W} H={H} />
    </G>
  );
});

function MapButton({ label, title, onPress, small }: { label: string; title: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.btn, pressed && { transform: [{ translateY: 1 }] }]}
      {...(Platform.OS === 'web' ? { title } : null)}
    >
      <Text style={[s.btnText, small && { fontSize: 12 }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, overflow: 'hidden' },
  surface: { flex: 1, ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object) : null) },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: F.garamondItalic, fontSize: 14, letterSpacing: em(14, 0.06), color: C.inkSoft },
  controls: { position: 'absolute', right: 12, bottom: 14, zIndex: 30, gap: 7 },
  btn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(58,42,24,.55)',
    alignItems: 'center', justifyContent: 'center',
    ...gradient('radial-gradient(circle at 35% 30%, #f7ecd6, #e2c99d)'),
    boxShadow: '0 3px 8px rgba(30,20,10,.3), inset 0 1px 0 rgba(255,255,255,.6)',
  },
  btnText: { fontFamily: F.cinzelSemi, fontSize: 17, lineHeight: 19, color: C.ink },
});
