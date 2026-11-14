import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space } from '../../constants/theme';

// Kao u demou: sve kartice imaju isti miran izgled, a izabrana dobija tačku ispod.
const tabs = {
  index: { label: 'Početna', icon: 'home' as const },
  agenda: { label: 'Agenda', icon: 'calendar' as const },
  people: { label: 'Ljudi', icon: 'users' as const },
  profile: { label: 'Profil', icon: 'user' as const },
};

type TabKey = keyof typeof tabs;

export function TabBar({ activeKey, onPress, bottom = 0 }: { activeKey: string; onPress: (key: string) => void; bottom?: number }) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.bar}>
        {(Object.keys(tabs) as TabKey[]).map((key) => {
          const item = tabs[key];
          const active = key === activeKey;
          const color = active ? colors.ink : colors.text3;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => onPress(key)}
              style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: pressScale }] }]}
            >
              <Feather name={item.icon} size={size.iconMd} color={color} />
              <Text style={[styles.label, { color }, active && styles.labelOn]}>{item.label}</Text>
              <View style={[styles.dot, active && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.gap, paddingHorizontal: space.edge, backgroundColor: colors.appBg },
  bar: {
    height: size.nav, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.tight,
    borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.navigation,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.tight / 2 },
  label: { fontFamily: fonts.medium, fontSize: fontSize.fs11 },
  labelOn: { fontFamily: fonts.semibold },
  dot: { width: size.dot, height: size.dot, borderRadius: radius.pill },
  dotOn: { backgroundColor: colors.ink },
});
