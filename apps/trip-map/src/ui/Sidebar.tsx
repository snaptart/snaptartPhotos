import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStationThumbnail } from '../data/photos';
import type { Place } from '../data/places';
import { C, F, em, gradient } from '../theme';
import { Header } from './Header';
import { Photo } from './Photo';
import { cardStyle, Ornaments, StationEntry } from './StationEntry';

/** Desktop side panel: title, the open station's journal page, and the full itinerary. */
export function Sidebar({ places, active, onOpen, onClose, width }: {
  places: Place[];
  active: number;
  onOpen: (i: number) => void;
  onClose: () => void;
  width: number;
}) {
  const reveal = useRef(new Animated.Value(1)).current;
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 320, easing: Easing.bezier(0.22, 0.9, 0.24, 1), useNativeDriver: false }).start();
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [active, reveal]);

  const revealStyle = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  return (
    <View style={[s.side, { width }]}>
      <Header topInset={16} />
      <ScrollView ref={scroller} contentContainerStyle={s.content}>
        <Animated.View style={revealStyle}>
          {active >= 0 ? (
            <View style={s.card} role="region" aria-label={`${places[active].name} journal entry`}>
              <Ornaments />
              <StationEntry places={places} index={active} onOpen={onOpen} onClose={onClose} roomy />
            </View>
          ) : (
            <Text style={s.hint}>
              Choose a castle on the chart, or an étape below, to open its page of the journal.
            </Text>
          )}
        </Animated.View>

        <View style={s.head}>
          <Text style={s.headText}>LES ÉTAPES</Text>
          <Text style={s.headText}>{places.length} of {places.length}</Text>
        </View>
        <View style={s.list}>
          {places.map((p, i) => (
            <StationRow key={p.id} place={p} on={i === active} onPress={() => (i === active ? onClose() : onOpen(i))} />
          ))}
        </View>
        <Text style={s.footer}>Keys: ← → to turn the pages · Esc to close</Text>
      </ScrollView>
    </View>
  );
}

function StationRow({ place, on, onPress }: { place: Place; on: boolean; onPress: () => void }) {
  const [hover, setHover] = useState(false);
  const thumbnail = useStationThumbnail(place.id);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.stay}`}
      accessibilityState={{ selected: on }}
      style={[s.row, hover && !on && s.rowHover, on && s.rowOn]}
    >
      <View style={s.thumb}>
        <Photo source={thumbnail} sepia={0} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowDay}>{place.day.toUpperCase()}</Text>
        <Text style={s.rowName} numberOfLines={1}>{place.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{place.sub}</Text>
      </View>
      <Text style={s.rowStay}>{place.stay}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  side: {
    zIndex: 40,
    backgroundColor: C.parch,
    ...gradient('linear-gradient(#f3e5c9, #eedfc1 30%, #e6d3ad)'),
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(58,42,24,.35)',
    boxShadow: '-12px 0 30px rgba(30,20,10,.28)',
  },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  card: { ...cardStyle, boxShadow: '0 6px 18px rgba(40,28,14,.22), inset 0 0 0 1px rgba(255,255,255,.35)' },
  hint: {
    fontFamily: F.garamondItalic, fontSize: 15, lineHeight: 22, color: C.inkSoft,
    paddingVertical: 14, paddingHorizontal: 4, textAlign: 'center',
  },
  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: 22, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(58,42,24,.18)',
  },
  headText: { fontFamily: F.cinzelSemi, fontSize: 9.5, letterSpacing: em(9.5, 0.26), color: C.inkSoft },
  list: { gap: 8, marginTop: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 7, borderRadius: 3,
    borderWidth: 1, borderColor: 'rgba(58,42,24,.35)',
    ...gradient('linear-gradient(#f6ebd4, #e9d6b0)'),
    boxShadow: '0 2px 5px rgba(40,28,14,.16)',
  },
  rowHover: { boxShadow: '0 6px 14px rgba(40,28,14,.24)', transform: [{ translateY: -1 }] },
  rowOn: {
    ...gradient('linear-gradient(#f0dcae, #dcc190)'),
    boxShadow: '0 0 0 1px rgba(58,42,24,.5), 0 4px 10px rgba(40,28,14,.25)',
  },
  thumb: { width: 76, height: 57, borderWidth: 1, borderColor: 'rgba(58,42,24,.4)', overflow: 'hidden', backgroundColor: '#d8c39b' },
  rowDay: { fontFamily: F.cinzelSemi, fontSize: 8, letterSpacing: em(8, 0.22), color: C.inkSoft },
  rowName: { fontFamily: F.cinzelSemi, fontSize: 14, lineHeight: 18, letterSpacing: em(14, 0.03), color: C.ink, marginTop: 2 },
  rowSub: { fontFamily: F.garamondItalic, fontSize: 12, lineHeight: 15, color: C.inkSoft },
  rowStay: { fontFamily: F.garamondItalic, fontSize: 11, color: C.inkSoft, alignSelf: 'flex-start', marginTop: 2 },
  footer: { fontFamily: F.garamondItalic, fontSize: 11, color: 'rgba(58,42,24,.55)', textAlign: 'center', marginTop: 18 },
});
