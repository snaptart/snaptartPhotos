// Native: react-native-svg implements only a handful of filter primitives (no
// feTurbulence / feDisplacementMap). The ink wobble is baked into the projected
// geometry and the paper grain is a pre-rendered noise tile laid over the map.
import { ImageBackground, StyleSheet, View } from 'react-native';

export const LAND_FILTER: string | undefined = undefined;
export const BAKE_WOBBLE = true;

export function EffectDefs() {
  return null;
}

export function PaperGrainSvg(_: { W: number; H: number }) {
  return null;
}

export function PaperGrainOverlay() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}>
      <ImageBackground
        source={require('../../assets/textures/paper-grain.png')}
        resizeMode="repeat"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
