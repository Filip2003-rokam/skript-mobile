import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EventLogo } from '../ui/EventLogo';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space } from '../../constants/theme';
import { eventInitials, eventPlaceLine } from '../../lib/services/eventService';
import type { EventStat } from '../../lib/services/profileService';

export function EventCards({ events, current, onOpen }: { events: EventStat[]; current: string | null; onOpen: (slug: string) => void }) {
  const ordered = [...events].sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  if (ordered.length === 0) return <Text style={styles.empty}>Još nema eventa.</Text>;
  return (
    <View style={styles.list}>
      {ordered.map((event) => (
        <Pressable
          key={event.id}
          accessibilityRole="button"
          accessibilityLabel={event.name}
          onPress={() => onOpen(event.slug)}
          style={({ pressed }) => [styles.card, event.slug === current && styles.current, pressed && { transform: [{ scale: pressScale }] }]}
        >
          {event.cover_url ? <Image source={{ uri: event.cover_url }} style={styles.cover} /> : null}
          <View style={styles.body}>
            <View style={styles.heading}>
              <EventLogo initials={eventInitials(event.name)} source={event.logo_url ? { uri: event.logo_url } : undefined} small />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={styles.name}>{event.name}</Text>
                <Text numberOfLines={1} style={styles.place}>{eventPlaceLine(event)}</Text>
              </View>
              <Feather name="arrow-right" size={size.iconSm} color={colors.text2} />
            </View>
            <View style={styles.stats}>
              <Stat value={event.contacts} label="Kontakti" />
              <Stat value={event.connections} label="Veze" />
              <Stat value={event.saved} label="Sačuvani" />
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  empty: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  card: { overflow: 'hidden', borderRadius: radius.card, borderWidth: size.border, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, ...shadow.card },
  current: { borderColor: colors.skriptYellow },
  cover: { width: '100%', height: 48 },
  body: { gap: 10, padding: space.gap },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.gap },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs13, color: colors.ink },
  place: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.text2 },
  stats: { flexDirection: 'row', gap: space.gap },
  stat: { flex: 1 },
  value: { fontFamily: fonts.display, fontSize: fontSize.fs17, color: colors.ink },
  label: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.text2 },
});
