import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, mark } from '../../constants/theme';

type SkriptMarkProps = {
  size?: number;
};

export function SkriptMark({ size = fontSize.fs22 }: SkriptMarkProps) {
  const dot = size * mark.dot;
  return (
    <View accessibilityLabel="Skript" style={[styles.row, { paddingTop: dot * mark.lift }]}>
      <Text style={[styles.word, { fontSize: size }]}>Skr</Text>
      <View>
        <View style={[styles.dots, { gap: dot * mark.gap, top: -dot * mark.lift }]}>
          <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot }]} />
          <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot }]} />
          <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot }]} />
        </View>
        <Text style={[styles.word, { fontSize: size }]}>ı</Text>
      </View>
      <Text style={[styles.word, { fontSize: size }]}>pt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  word: {
    fontFamily: fonts.display,
    color: colors.ink,
  },
  dots: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
  },
  dot: {
    backgroundColor: colors.skriptYellow,
  },
});
