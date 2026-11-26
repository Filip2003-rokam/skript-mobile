import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, space, trackingWide } from '../../constants/theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.gap },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    color: colors.text2,
    letterSpacing: trackingWide,
    textTransform: 'uppercase',
  },
});
