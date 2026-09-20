import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePhotos } from '../data/photos';
import type { Place } from '../data/places';
import { C, F, em, gradient } from '../theme';
import { PhotoGallery } from './PhotoGallery';

/** Journal page for one station: title, photo plate, meta and prev/next. Shared by the sheet and the sidebar. */
export function StationEntry({ places, index, onOpen, onClose, roomy }: {
  places: Place[];
  index: number;
  onOpen: (i: number) => void;
  onClose: () => void;
  /** Slightly larger type for the desktop sidebar. */
  roomy?: boolean;
}) {
  const p = places[index];
  const last = index === places.length - 1;
  const photos = usePhotos(p.id);

  // The photograph on the plate, so its own title can sit above the station's caption.
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => setPhotoIndex(0), [index]);
  const photoTitle = photos[photoIndex]?.title;
  // Keep the line in place for the whole station, so pictures without a title don't
  // shorten the card either.
  const anyTitle = photos.some((ph) => !!ph.title);

  return (
    <>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{p.day.toUpperCase()} · {p.country.toUpperCase()}</Text>
          <Text style={[s.title, roomy && s.titleRoomy]}>{p.name}</Text>
          <Text style={[s.sub, roomy && s.subRoomy]}>{p.sub}</Text>
        </View>
        <Pressable style={s.x} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={s.xGlyph}>✕</Text>
        </Pressable>
      </View>

      {/* The station's own words open the page; the plate below holds only the photograph. */}
      <Text style={[s.cap, roomy && s.capRoomy]}>
        <Text style={s.capLead}>{p.capLead}</Text> {p.cap}
      </Text>

      <View style={s.plate}>
        <PhotoGallery photos={photos} name={p.name} stationId={p.id} onIndexChange={setPhotoIndex} />
        {anyTitle && <PhotoTitle title={photoTitle} roomy={roomy} />}
      </View>

      <View style={s.meta}>
        <Meta label="Latitude" value={`${Math.abs(p.lat).toFixed(3)}° N`} />
        <Meta label="Longitude" value={`${Math.abs(p.lon).toFixed(3)}° E`} />
        <Meta label="Sojourn" value={p.stay} />
        <Meta label="Leg" value={`${index + 1} of ${places.length}`} />
      </View>

      <View style={s.nav}>
        <Pressable
          style={[s.btn, index === 0 && s.btnDisabled]}
          disabled={index === 0}
          onPress={() => onOpen(Math.max(0, index - 1))}
          accessibilityRole="button"
        >
          <Text style={s.btnText}>← PREVIOUS</Text>
        </Pressable>
        <Pressable
          style={[s.btn, s.btnPri]}
          onPress={() => (last ? onClose() : onOpen(index + 1))}
          accessibilityRole="button"
        >
          <Text style={[s.btnText, s.btnPriText]}>{last ? 'CLOSE THE JOURNAL' : 'NEXT ÉTAPE →'}</Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * The photograph's own title under the plate. It fades from one to the next rather than
 * snapping while the picture is still sliding, and always stands two lines tall so that a
 * longer title never resizes the card.
 */
function PhotoTitle({ title, roomy }: { title?: string; roomy?: boolean }) {
  const fade = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(title);

  useEffect(() => {
    if (title === shown) return;
    Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setShown(title);
      Animated.timing(fade, { toValue: 1, duration: 170, useNativeDriver: true }).start();
    });
  }, [fade, shown, title]);

  return (
    <Animated.Text
      style={[s.photoTitle, roomy && s.photoTitleRoomy, { opacity: fade }]}
      numberOfLines={2}
    >
      {(shown ?? '').toUpperCase()}
    </Animated.Text>
  );
}

/** Inner hairline frame and corner diamonds of a parchment card. */
export function Ornaments() {
  return (
    <>
      <View pointerEvents="none" style={s.frame} />
      {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
        <View key={k} pointerEvents="none" style={[s.orn, s[k]]} />
      ))}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={s.metaLabel}>{label.toUpperCase()}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

export const cardStyle = {
  borderRadius: 6,
  borderWidth: 1,
  borderColor: 'rgba(58,42,24,.55)',
  backgroundColor: '#eeddb8',
  ...gradient('radial-gradient(120% 90% at 15% 0%, #f8eed9 0%, #eeddb8 45%, #e3cfa6 100%)'),
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 18,
  overflow: 'hidden' as const,
};

const s = StyleSheet.create({
  frame: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(58,42,24,.3)', borderRadius: 3 },
  orn: { position: 'absolute', width: 7, height: 7, backgroundColor: C.ink, opacity: 0.5, transform: [{ rotate: '45deg' }] },
  tl: { top: 10, left: 10 },
  tr: { top: 10, right: 10 },
  bl: { bottom: 10, left: 10 },
  br: { bottom: 10, right: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingHorizontal: 8, paddingTop: 2 },
  kicker: { fontFamily: F.cinzelSemi, fontSize: 9, letterSpacing: em(9, 0.3), color: C.inkSoft },
  title: { fontFamily: F.cinzelBold, fontSize: 22, lineHeight: 23.1, letterSpacing: em(22, 0.02), color: C.ink, marginTop: 4 },
  titleRoomy: { fontSize: 26, lineHeight: 28 },
  sub: { fontFamily: F.garamondItalic, fontSize: 13, lineHeight: 17.5, color: C.inkSoft, marginTop: 5 },
  subRoomy: { fontSize: 15, lineHeight: 20 },
  x: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(58,42,24,.5)',
    backgroundColor: '#f6ecd7', alignItems: 'center', justifyContent: 'center',
  },
  xGlyph: { fontFamily: F.cinzel, fontSize: 15, lineHeight: 17, color: C.ink },
  plate: {
    marginHorizontal: 8, marginTop: 12, paddingHorizontal: 9, paddingTop: 9,
    backgroundColor: C.plate, borderWidth: 1, borderColor: 'rgba(58,42,24,.45)',
    boxShadow: 'inset 0 0 22px rgba(120,90,45,.28)',
  },
  photoTitle: {
    fontFamily: F.cinzelSemi, fontSize: 10, lineHeight: 14, letterSpacing: em(10, 0.16),
    color: C.ink, paddingHorizontal: 3, paddingTop: 9, paddingBottom: 10,
    // two lines plus the padding, whatever this photograph's title happens to be
    minHeight: 14 * 2 + 19,
  },
  photoTitleRoomy: { fontSize: 11.5, lineHeight: 16, minHeight: 16 * 2 + 19 },
  // Above the plate now, so it carries its own margins rather than the plate's padding.
  cap: { fontFamily: F.garamondItalic, fontSize: 12.5, lineHeight: 18.1, color: C.ink, marginHorizontal: 8, marginTop: 10 },
  capRoomy: { fontSize: 14.5, lineHeight: 21 },
  capLead: { fontFamily: F.garamondSemi },
  meta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginHorizontal: 8, marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(58,42,24,.25)',
  },
  metaLabel: { fontFamily: F.cinzelSemi, fontSize: 8.5, letterSpacing: em(8.5, 0.2), color: 'rgba(58,42,24,.55)', marginBottom: 3 },
  metaValue: { fontFamily: F.garamond, fontSize: 11, lineHeight: 14.3, color: C.inkSoft },
  nav: { flexDirection: 'row', gap: 9, marginHorizontal: 8, marginTop: 14 },
  btn: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(58,42,24,.5)', borderRadius: 3,
    ...gradient('linear-gradient(#f4e8cf, #e4d0a6)'), alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnPri: { ...gradient('linear-gradient(#8a5a2c, #6d4320)'), borderColor: '#4e2f14' },
  btnText: { fontFamily: F.cinzelSemi, fontSize: 10, letterSpacing: em(10, 0.16), color: C.ink },
  btnPriText: { color: C.parchHi },
});
