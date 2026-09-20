import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotosProvider } from './src/data/photos';
import { PLACES } from './src/data/places';
import { TripMap } from './src/map/TripMap';
import { C, FONT_ASSETS } from './src/theme';
import { Header } from './src/ui/Header';
import { LightboxProvider, useLightbox } from './src/ui/Lightbox';
import { Sidebar } from './src/ui/Sidebar';
import { StationSheet } from './src/ui/StationSheet';
import { StationsRail } from './src/ui/StationsRail';

/** full: phones and browsers under 960px, edge to edge · wide: desktop map + sidebar */
type Mode = 'full' | 'wide';

export default function App() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  return (
    <GestureHandlerRootView style={s.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {fontsLoaded && (
          <PhotosProvider>
            <LightboxProvider>
              <Journal />
            </LightboxProvider>
          </PhotosProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Journal() {
  const [active, setActive] = useState(-1);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const mode: Mode = Platform.OS === 'web' && width >= 960 ? 'wide' : 'full';

  const open = useCallback((i: number) => setActive(i), []);
  const close = useCallback(() => setActive(-1), []);

  // While the photograph viewer is open it owns the arrow and escape keys.
  useJournalKeys(setActive, useLightbox().isOpen);

  if (mode === 'wide') {
    return (
      <View style={s.wide}>
        <View style={s.wideMap}>
          <TripMap active={active} onOpen={open} />
        </View>
        <Sidebar
          places={PLACES}
          active={active}
          onOpen={open}
          onClose={close}
          width={Math.round(Math.min(480, Math.max(380, width * 0.3)))}
        />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <Header topInset={insets.top} />
      <TripMap active={active} onOpen={open} />
      <StationsRail places={PLACES} active={active} onOpen={open} bottomInset={insets.bottom} />
      <StationSheet places={PLACES} active={active} onOpen={open} onClose={close} bottomInset={insets.bottom} />
    </View>
  );
}

/** Web keyboard: Esc closes, ←/→ walk the itinerary (→ on the last station closes, like Next). */
function useJournalKeys(setActive: (f: (a: number) => number) => void, paused: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(() => -1);
      else if (e.key === 'ArrowRight') setActive((a) => (a < 0 ? a : a === PLACES.length - 1 ? -1 : a + 1));
      else if (e.key === 'ArrowLeft') setActive((a) => (a <= 0 ? a : a - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActive, paused]);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.parch },
  screen: { flex: 1, backgroundColor: C.parch, overflow: 'hidden' },
  wide: { flex: 1, flexDirection: 'row', backgroundColor: C.parch },
  wideMap: { flex: 1, minWidth: 0 },
});
