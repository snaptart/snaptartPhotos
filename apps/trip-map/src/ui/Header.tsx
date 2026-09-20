import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { C, F, em, gradient } from '../theme';

export function Header({ topInset }: { topInset: number }) {
  return (
    <View style={[s.header, { paddingTop: topInset + 12 }]}>
      <View style={s.crest}>
        <View style={s.crestMark}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Circle cx={8} cy={8} r={2} fill={C.ink} />
            <Path d="M8 0.5v3M8 12.5v3M0.5 8h3M12.5 8h3" stroke={C.ink} strokeWidth={1.2} />
          </Svg>
        </View>
        <View>
          <Text style={s.eyebrow}>The Book of Journeys · MMXXVI</Text>
          <Text style={s.title} accessibilityRole="header">Cucuron to Lyon</Text>
        </View>
      </View>
      <View style={s.rule}>
        <View style={[s.ruleLine, s.ruleLineL]} />
        <Text style={s.ruleText}>France &amp; Italy in five étapes</Text>
        <View style={[s.ruleLine, s.ruleLineR]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    zIndex: 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
    ...gradient('linear-gradient(#f3e5c9, #ecdabb 70%, rgba(236,218,187,0))'),
  },
  crest: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  crestMark: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.ink,
    backgroundColor: C.parchHi, alignItems: 'center', justifyContent: 'center',
    boxShadow: 'inset 0 0 0 3px rgba(58,42,24,.12)',
  },
  eyebrow: { fontFamily: F.cinzelSemi, fontSize: 10, lineHeight: 10, letterSpacing: em(10, 0.3), color: C.inkSoft },
  title: { fontFamily: F.cinzelBold, fontSize: 21, lineHeight: 23, letterSpacing: em(21, 0.04), color: C.ink, marginTop: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  ruleLine: { flex: 1, height: 1 },
  ruleLineL: gradient('linear-gradient(90deg, rgba(58,42,24,0), rgba(58,42,24,.45))'),
  ruleLineR: gradient('linear-gradient(90deg, rgba(58,42,24,.45), rgba(58,42,24,0))'),
  ruleText: { fontFamily: F.garamondItalic, fontSize: 11, letterSpacing: em(11, 0.08), color: C.inkSoft },
});
