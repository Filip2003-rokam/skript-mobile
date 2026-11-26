import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, radius, shadow, size, space } from '../../constants/theme';

type Option = { id: string; label: string; count?: number };

type SegmentedProps = {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
};

export function Segmented({ value, options, onChange }: SegmentedProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track} style={styles.scroll}>
      {options.slice(0, 4).map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.option, active && styles.active, pressed && !active && styles.pressed]}
          >
            <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>
              {option.label}
            </Text>
            {option.count ? (
              <View style={styles.count}>
                <Text style={styles.countText}>{option.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  track: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: size.segmented,
    gap: space.tight,
    padding: space.tight,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.surfaceBorder,
    ...shadow.card,
  },
  option: {
    flexGrow: 1,
    flexShrink: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.tight + size.ring,
    paddingHorizontal: space.chip,
    borderRadius: radius.pill,
  },
  active: { backgroundColor: colors.skriptYellow },
  pressed: { backgroundColor: colors.fillSubtle },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs12,
    color: colors.text2,
  },
  activeLabel: { color: colors.onSignal },
  count: {
    minWidth: size.iconSm,
    height: size.iconSm,
    paddingHorizontal: space.tight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  countText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.surface },
});
