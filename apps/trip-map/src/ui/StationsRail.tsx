import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStationThumbnail } from '../data/photos';
import type { Place } from '../data/places';
import { C, F, em, gradient } from '../theme';
import { Photo } from './Photo';

export function StationsRail({ places, active, onOpen, bottomInset }: {
  places: Place[]; active: number; onOpen: (i: number) => void; bottomInset: number;
}) {
  return (
    <View style={[s.rail, { paddingBottom: Math.max(26, bottomInset + 10) }]}>
      <View style={s.head}>
        <Text style={s.headText}>LES ÉTAPES</Text>
        <Text style={s.headText}>{places.length} of {places.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {places.map((p, i) => (
          <Chip key={p.id} place={p} on={i === active} onPress={() => onOpen(i)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ place, on, onPress }: { place: Place; on: boolean; onPress: () => void }) {
  const [hover, setHover] = useState(false);
  const thumbnail = useStationThumbnail(place.id);
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lift, { toValue: hover ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [hover, lift]);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.stay}`}
      accessibilityState={{ selected: on }}
    >
      <Animated.View
        style={[
          s.chip,
          on && s.chipOn,
          hover && !on && s.chipHover,
          { transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] },
        ]}
      >
        <View style={s.thumb}>
          <Photo source={thumbnail} sepia={0} />
        </View>
        <Text style={s.name} numberOfLines={1}>{place.name}</Text>
        <Text style={s.stay}>{place.stay}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  rail: {
    zIndex: 40,
    paddingTop: 10,
    ...gradient('linear-gradient(rgba(240,225,197,0), #eedfc1 26%, #e6d3ad)'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(58,42,24,.18)',
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 8 },
  headText: { fontFamily: F.cinzelSemi, fontSize: 9.5, letterSpacing: em(9.5, 0.26), color: C.inkSoft },
  chips: { gap: 10, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 4 },
  chip: {
    width: 104,
    borderWidth: 1,
    borderColor: 'rgba(58,42,24,.35)',
    borderRadius: 3,
    ...gradient('linear-gradient(#f6ebd4, #e9d6b0)'),
    paddingHorizontal: 7,
    paddingTop: 7,
    paddingBottom: 8,
    boxShadow: '0 2px 5px rgba(40,28,14,.16)',
  },
  chipHover: { boxShadow: '0 6px 14px rgba(40,28,14,.24)' },
  chipOn: {
    ...gradient('linear-gradient(#f0dcae, #dcc190)'),
    boxShadow: '0 0 0 1px rgba(58,42,24,.5), 0 4px 10px rgba(40,28,14,.25)',
  },
  thumb: { height: 58, borderWidth: 1, borderColor: 'rgba(58,42,24,.4)', overflow: 'hidden', backgroundColor: '#d8c39b' },
  name: { fontFamily: F.cinzelSemi, fontSize: 11, lineHeight: 13.2, letterSpacing: em(11, 0.03), color: C.ink, marginTop: 6 },
  stay: { fontFamily: F.garamondItalic, fontSize: 10, lineHeight: 12, color: C.inkSoft, marginTop: 2 },
});
