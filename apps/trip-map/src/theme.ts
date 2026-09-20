import { Platform, type ViewStyle } from 'react-native';
// Per-weight subpaths: the package index requires every weight, bloating the bundle.
import { Cinzel_400Regular } from '@expo-google-fonts/cinzel/400Regular';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel/600SemiBold';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold';
import { EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond/400Regular';
import { EBGaramond_400Regular_Italic } from '@expo-google-fonts/eb-garamond/400Regular_Italic';
import { EBGaramond_500Medium } from '@expo-google-fonts/eb-garamond/500Medium';
import { EBGaramond_500Medium_Italic } from '@expo-google-fonts/eb-garamond/500Medium_Italic';
import { EBGaramond_600SemiBold } from '@expo-google-fonts/eb-garamond/600SemiBold';

export const FONT_ASSETS = {
  Cinzel_400Regular,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_500Medium_Italic,
  EBGaramond_600SemiBold,
};

/** One family name per weight/style, so native never synthesises bold or italic. */
export const F = {
  cinzel: 'Cinzel_400Regular',
  cinzelSemi: 'Cinzel_600SemiBold',
  cinzelBold: 'Cinzel_700Bold',
  garamond: 'EBGaramond_400Regular',
  garamondItalic: 'EBGaramond_400Regular_Italic',
  garamondMedium: 'EBGaramond_500Medium',
  garamondSemi: 'EBGaramond_600SemiBold',
} as const;

export const C = {
  ink: '#3a2a18',
  inkSoft: '#6b5335',
  inkMap: '#4b3418',
  inkRhumb: '#5b4526',
  statusInk: '#4a3a24',
  parch: '#efdfc0',
  parchHi: '#f7ecd6',
  land: '#d9b986',
  landNeighbour: '#e3d3b3',
  landGlow: '#b8934f',
  seaTop: '#82aaa6',
  seaBottom: '#5d8a89',
  seaHatch: '#3f6b6b',
  coast: '#2f5a5a',
  seaLabel: '#25494a',
  landLabel: '#5d451f',
  gold: '#a9803f',
  wine: '#7c3a2c',
  labelHalo: '#f0e2c4',
  plate: '#efe0c0',
};

/**
 * CSS gradient background. Native RN parses the CSS syntax under
 * `experimental_backgroundImage`; react-native-web forwards plain `backgroundImage`.
 */
export const gradient = (css: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;

/** Letter-spacing is specified in em in the design; RN wants px. */
export const em = (size: number, e: number) => size * e;
