import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fonts, opacity, pressScale, radius, shadow, size, space } from '../../constants/theme';

const tabs = {
  index: { label: 'Početna', icon: 'message-circle' as const, home: true },
  agenda: { label: 'Agenda', icon: 'calendar' as const, home: false },
  people: { label: 'Ljudi', icon: 'users' as const, home: false },
  profile: { label: 'Profil', icon: 'user' as const, home: false },
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
              accessibilityState={{ selected: active }}
              onPress={() => onPress(key)}
              style={({ pressed }) => [
                item.home ? styles.homeTab : styles.tab,
                pressed && { transform: [{ scale: pressScale }] },
              ]}
            >
              {item.home ? (
                <View style={[styles.home, !active && styles.homeIdle]}>
                  <Feather name={item.icon} size={size.iconMd} color={colors.ink} />
                  <Text style={styles.homeLabel}>{item.label}</Text>
                </View>
              ) : (
                <>
                  <Feather name={item.icon} size={size.iconMd} color={color} />
                  <Text style={[styles.label, { color }]}>{item.label}</Text>
                  <View style={[styles.dot, active && styles.dotOn]} />
                </>
              )}
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
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.tight },
  homeTab: { alignItems: 'center', justifyContent: 'center' },
  home: {
    height: size.chip, flexDirection: 'row', alignItems: 'center', gap: space.tight,
    paddingHorizontal: space.chip, borderRadius: radius.pill, backgroundColor: colors.skriptYellow,
  },
  homeIdle: { opacity: opacity.homeIdle },
  homeLabel: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: fontSize.fs11 },
  dot: { width: size.dot, height: size.dot, borderRadius: radius.pill },
  dotOn: { backgroundColor: colors.ink },
});
