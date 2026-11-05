import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fonts, pressScale, radius, size, space } from '../../constants/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  small?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, small = false, icon, trailing, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.plain,
        { height: small ? size.chipSm : size.chip },
        pressed && { transform: [{ scale: pressScale }] },
      ]}
    >
      {icon}
      <Text style={[styles.label, selected && styles.selectedLabel, small && styles.smallLabel]}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.tight,
    paddingHorizontal: space.chip,
    borderRadius: radius.pill,
    borderWidth: size.border,
  },
  plain: {
    backgroundColor: colors.glass,
    borderColor: colors.hairline,
  },
  selected: {
    backgroundColor: colors.skriptYellow,
    borderColor: colors.skriptYellow,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  smallLabel: {
    fontSize: fontSize.fs11,
  },
  selectedLabel: {
    color: colors.onSignal,
  },
});
