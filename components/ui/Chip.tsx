import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fonts, opacity, pressScale, radius, shadow, size, space } from '../../constants/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  small?: boolean;
  large?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, small = false, large = false, disabled = false, icon, trailing, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.plain,
        {
          height: large ? size.segmented : small ? size.chipSm : size.chip,
          paddingHorizontal: large ? space.buttonSm : small ? space.tight * 2 + size.ring : space.chip,
          opacity: disabled ? opacity.disabled : 1,
        },
        pressed && !disabled && { transform: [{ scale: pressScale }] },
      ]}
    >
      {icon}
      <Text style={[styles.label, selected && styles.selectedLabel, small && styles.smallLabel, large && styles.largeLabel]}>{label}</Text>
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
    gap: space.tight + size.ring,
    borderRadius: radius.pill,
    borderWidth: size.border,
  },
  plain: {
    backgroundColor: colors.glass,
    borderColor: colors.hairline,
    ...shadow.soft,
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
  smallLabel: { fontSize: fontSize.fs11 },
  largeLabel: { fontSize: fontSize.fs15 },
  selectedLabel: {
    color: colors.onSignal,
  },
});
