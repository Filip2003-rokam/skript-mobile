import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, pressScale, radius, size, space } from '../../constants/theme';

type Option = { id: string; label: string };

type SegmentedProps = {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
};

export function Segmented({ value, options, onChange }: SegmentedProps) {
  return (
    <View style={styles.track}>
      {options.slice(0, 4).map((option) => {
        const active = option.id === value;
        const compact = options.length > 3;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.option,
              compact && styles.compact,
              active && styles.active,
              pressed && { transform: [{ scale: pressScale }] },
            ]}
          >
            <Text numberOfLines={1} style={[styles.label, compact && styles.compactLabel, active && styles.activeLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.segmented,
    gap: space.tight,
    padding: space.tight,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
  },
  option: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.chip,
    borderRadius: radius.pill,
  },
  active: {
    backgroundColor: colors.skriptYellow,
  },
  compact: {
    paddingHorizontal: 6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
  compactLabel: {
    fontSize: fontSize.fs11,
  },
  activeLabel: {
    color: colors.onSignal,
  },
});
