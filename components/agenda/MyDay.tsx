import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '../ui/EmptyState';
import { SessionCard } from '../ui/SessionCard';
import { colors, fontSize, fonts, size, space } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { EventRow } from '../../lib/services/eventService';
import type { Meeting } from '../../lib/services/meetingService';
import { sessionClock, sessionMark, type SessionRow } from '../../lib/services/sessionService';
import { MeetingBlock } from '../meetings/MeetingBlock';

type MyDayProps = {
  event: EventRow;
  sessions: SessionRow[];
  savedIds: Set<string>;
  meetings: Meeting[];
  day: number;
  now: Date;
  onOpen: (session: SessionRow) => void;
  onMeetingChanged: () => void;
};

type Item = { time: string; kind: 'session'; session: SessionRow } | { time: string; kind: 'meeting'; meeting: Meeting };

/** Moj dan, kao u demou: sačuvana predavanja i sastanci izabranog dana, po vremenu. */
export function MyDay({ event, sessions, savedIds, meetings, day, now, onOpen, onMeetingChanged }: MyDayProps) {
  const items: Item[] = [
    ...sessions
      .filter((session) => session.day === day && savedIds.has(session.id))
      .map((session) => ({ time: sessionClock(session.start_time), kind: 'session' as const, session })),
    ...meetings
      .filter((meeting) => meeting.day === day && meeting.view !== 'closed')
      .map((meeting) => ({ time: meeting.time, kind: 'meeting' as const, meeting })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (items.length === 0) {
    return <EmptyState icon={<Feather name="bookmark" size={size.iconMd} color={colors.ink} />} text={t('agenda.myDayEmpty')} />;
  }

  return (
    <View style={styles.list}>
      {items.map((item) =>
        item.kind === 'session' ? (
          <SessionCard
            key={`s-${item.session.id}`}
            session={item.session}
            mark={sessionMark(event.starts_on, event.days, item.session, now)}
            onPress={() => onOpen(item.session)}
          />
        ) : (
          <View key={`m-${item.meeting.id}`} style={styles.meeting}>
            <Text style={styles.with}>{t('meetings.with', { name: item.meeting.otherName?.trim() || t('person.unknown') })}</Text>
            <MeetingBlock meeting={item.meeting} eventDays={event.days} onChanged={onMeetingChanged} />
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.gap },
  meeting: { gap: space.tight * 2 },
  with: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
});
