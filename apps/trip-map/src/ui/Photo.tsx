import { Image, Platform, StyleSheet, View, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Trip photograph with the sepia treatment. Web and Android apply a real CSS-style
 * filter; iOS only supports brightness/opacity filters, so it gets a warm tint wash.
 * With no photograph yet, the bare parchment mount shows through.
 */
export function Photo({ source, sepia, style, alt, fit = 'cover' }: {
  source?: ImageSourcePropType;
  sepia: number;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  /** 'contain' shows the whole photograph, letterboxed on the mount; 'cover' crops to fill. */
  fit?: 'cover' | 'contain';
}) {
  if (!source) return null;

  // sepia 0 means the photograph is shown as it was taken (the lightbox).
  const filter = Platform.OS === 'ios' || sepia <= 0
    ? undefined
    : `sepia(${sepia}) saturate(${sepia > 0.52 ? 0.8 : 0.85}) contrast(${sepia > 0.52 ? 1.02 : 1.03})`;
  return (
    <>
      <Image
        source={source}
        // Inset-only sizing leaves the image at its natural size on web, which showed a
        // zoomed-in crop, so size it explicitly. Scaling comes from resizeMode (which
        // react-native-web turns into background-size) with objectFit for native.
        resizeMode={fit}
        style={[fill, { objectFit: fit }, style, filter ? ({ filter } as ImageStyle) : null]}
        accessibilityLabel={alt}
      />
      {Platform.OS === 'ios' && sepia > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(140,100,50,${sepia * 0.36})` }]} />
      )}
    </>
  );
}

/**
 * Whether page `i` is within `reach` of the one on screen, counting around the ends (the
 * arrows wrap). Pagers load only these, rather than every photograph of a station at once.
 */
export const isNear = (i: number, current: number, count: number, reach = 1) => {
  const d = Math.abs(i - current);
  return Math.min(d, count - d) <= reach;
};

const fill: ImageStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };
