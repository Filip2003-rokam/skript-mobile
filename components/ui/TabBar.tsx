import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space } from '../../constants/theme';
import { t } from '../../lib/i18n';

// Kao u demou: sve kartice imaju isti miran izgled, a izabrana dobija tačku ispod.
const tabs = {
  index: { get label() { return t('tabs.home'); }, icon: 'home' as const },
  agenda: { get label() { return t('tabs.agenda'); }, icon: 'calendar' as const },
  people: { get label() { return t('tabs.people'); }, icon: 'users' as const },
  profile: { get label() { return t('tabs.me'); }, icon: 'user' as const },
};

type TabKey = keyof typeof tabs;

// Mikrofon u sredini je kao u demou: odmah otvara novu glasovnu belešku posle razgovora.
export function TabBar({ activeKey, onPress, onMic, bottom = 0 }: { activeKey: string; onPress: (key: string) => void; onMic?: () => void; bottom?: number }) {
  const keys = Object.keys(tabs) as TabKey[];
  const left = keys.slice(0, 2);
  const right = keys.slice(2);
  const renderTab = (key: TabKey) => {
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
  };
  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.bar}>
        {left.map(renderTab)}
        {onMic ? (
          <View style={styles.micSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('voice.record')}
              onPress={onMic}
              style={({ pressed }) => [styles.mic, pressed && { transform: [{ scale: pressScale }] }]}
            >
              <Feather name="mic" size={size.iconMd} color={colors.nightInk} />
            </Pressable>
          </View>
        ) : null}
        {right.map(renderTab)}
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
  micSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mic: {
    width: size.nav - space.tight * 2,
    height: size.nav - space.tight * 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.night,
  },
});
