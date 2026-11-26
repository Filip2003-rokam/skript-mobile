import { StyleSheet, View } from 'react-native';
import { SkriptMark } from '../ui/SkriptMark';
import { colors, fontSize, opacity, radius, shadow, size } from '../../constants/theme';

function eventTint(color: string | null): string {
  const hex = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : colors.ink;
  const alpha = Math.round(opacity.aura * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alpha}`;
}

export function HomeMark({ color }: { color: string | null }) {
  return (
    <View style={styles.box}>
      <View style={[styles.aura, { backgroundColor: eventTint(color) }]} />
      <View style={styles.tile}>
        <SkriptMark size={fontSize.fs30} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: size.markBox,
    height: size.markBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: size.markAura,
    height: size.markAura,
    borderRadius: size.markAura,
  },
  tile: {
    width: size.markTile,
    height: size.markTile,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.mark,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    ...shadow.soft,
  },
});
