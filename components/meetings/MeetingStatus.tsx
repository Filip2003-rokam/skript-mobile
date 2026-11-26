import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, space } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Meeting } from '../../lib/services/meetingService';

/** Vreme i mesto sastanka: „Dan 1 · 11:30 · Hol“, bez dana kad event traje jedan dan. */
export function meetingWhen(meeting: Pick<Meeting, 'day' | 'time' | 'place'>, eventDays: number | null): string {
  if (!eventDays || eventDays < 2) return t('meetings.whenOneDay', { time: meeting.time, place: meeting.place });
  return t('meetings.when', { day: meeting.day, time: meeting.time, place: meeting.place });
}

/** Žuto dok čeka odgovor, zeleno kad je zakazan. Isto kao u web aplikaciji. */
export function MeetingStatus({ meeting, eventDays }: { meeting: Meeting; eventDays: number | null }) {
  const confirmed = meeting.view === 'accepted';
  const first = meeting.otherName?.trim().split(/\s+/)[0] || t('person.unknown');
  const label = confirmed ? t('meetings.confirmed') : meeting.view === 'needsMe' ? t('meetings.needsMe', { name: first }) : t('meetings.waiting');
  return (
    <View style={[styles.line, confirmed ? styles.ok : styles.pending]} accessibilityLabel={`${label}, ${meetingWhen(meeting, eventDays)}`}>
      {confirmed ? (
        <View style={styles.check}>
          <Feather name="check" size={fontSize.fs11} color={colors.surface} />
        </View>
      ) : (
        <View style={styles.dot} />
      )}
      <Text style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {` · ${meetingWhen(meeting, eventDays)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.tight * 2, paddingVertical: space.tight * 2, paddingHorizontal: space.gap, borderRadius: radius.control },
  pending: { backgroundColor: colors.skriptYellowSoft },
  ok: { backgroundColor: colors.okSoft },
  dot: { width: 10, height: 10, marginTop: 4, borderRadius: radius.pill, backgroundColor: colors.skriptYellow, borderWidth: 1, borderColor: 'rgba(17,17,20,0.2)' },
  check: { width: 16, height: 16, marginTop: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ok },
  text: { flex: 1, fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.ink },
  label: { fontFamily: fonts.semibold },
});
