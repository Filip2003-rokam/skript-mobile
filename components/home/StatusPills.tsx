import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';

export function StatusPills({ live, linksToday }: { live: number; linksToday: number }) {
  if (live < 1 && linksToday < 1) return null;
  return (
    <View style={styles.row}>
      {live > 0 ? <Pill live label={`${live} uživo`} /> : null}
      {linksToday > 0 ? <Pill label={`${linksToday} novih veza danas`} /> : null}
    </View>
  );
}

function Pill({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <View style={styles.pill}>
      {live ? <View style={styles.dot} /> : null}
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.tight * 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    height: size.chipSm + space.tight,
    paddingHorizontal: space.gap,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
  },
  dot: {
    width: size.liveDot,
    height: size.liveDot,
    borderRadius: size.liveDot,
    backgroundColor: colors.live,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs12,
    color: colors.ink,
  },
});
