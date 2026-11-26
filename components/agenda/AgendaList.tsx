import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '../ui/EmptyState';
import { SessionCard } from '../ui/SessionCard';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import { sessionClock, sessionMark, type SessionRow } from '../../lib/services/sessionService';
import type { EventRow } from '../../lib/services/eventService';

type AgendaListProps = {
  event: EventRow;
  sessions: SessionRow[];
  day: number;
  room: string | null;
  now: Date;
  onOpen: (session: SessionRow) => void;
};

export function AgendaList({ event, sessions, day, room, now, onOpen }: AgendaListProps) {
  const visible = sessions.filter((session) => session.day === day && (room === null || session.room === room));
  const live = visible.filter((session) => sessionMark(event.starts_on, event.days, session, now) === 'live');
  const liveIds = new Set(live.map((session) => session.id));
  const groups = new Map<string, SessionRow[]>();
  for (const session of visible) {
    if (liveIds.has(session.id)) continue;
    const time = sessionClock(session.start_time);
    const list = groups.get(time);
    if (list) list.push(session);
    else groups.set(time, [session]);
  }

  return (
    <>
      {live.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.liveHeading}>
            <View style={styles.dot} />
            <Text style={styles.liveTitle}>Upravo traje</Text>
          </View>
          {live.map((session) => (
            <SessionCard key={session.id} session={session} mark="live" onPress={() => onOpen(session)} />
          ))}
        </View>
      ) : null}
      {[...groups.entries()].map(([time, list]) => (
        <View key={time || 'bez-vremena'} style={styles.section}>
          {time ? <Text style={styles.timeHeading}>{time}</Text> : null}
          {list.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              mark={sessionMark(event.starts_on, event.days, session, now)}
              onPress={() => onOpen(session)}
            />
          ))}
        </View>
      ))}
      {visible.length === 0 ? (
        <EmptyState icon={<Feather name="calendar" size={size.iconMd} color={colors.ink} />} text="Nema sesija za ove filtere." />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.gap },
  liveHeading: { flexDirection: 'row', alignItems: 'center', gap: space.tight * 2 },
  dot: { width: size.dot * 2, height: size.dot * 2, borderRadius: size.dot, backgroundColor: colors.live },
  liveTitle: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.ink },
  timeHeading: { fontFamily: fonts.semibold, fontSize: fontSize.fs12, color: colors.text2, fontVariant: ['tabular-nums'] },
});
