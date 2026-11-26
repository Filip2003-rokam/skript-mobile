import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../ui/Button';
import { InlineError } from '../ui/State';
import { space } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { answerMeeting, type Meeting } from '../../lib/services/meetingService';
import { meetingCalendarDraft } from '../../lib/reminders';
import { CalendarButton } from '../device/CalendarButton';
import { MeetingStatus } from './MeetingStatus';

/** Status sastanka sa odgovorom: Prihvati i Odbij kad čeka mene, Otkaži kad čekam ja. */
type MeetingBlockProps = {
  meeting: Meeting;
  eventDays: number | null;
  onChanged: () => void;
  /** Kad je dat, prihvaćen sastanak dobija „Dodaj u kalendar“. */
  event?: { name: string; starts_on: string | null } | null;
};

export function MeetingBlock({ meeting, eventDays, onChanged, event = null }: MeetingBlockProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(status: 'accepted' | 'declined' | 'cancelled') {
    setBusy(true);
    setError(null);
    try {
      await answerMeeting(meeting.id, status);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('meetings.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.block}>
      <MeetingStatus meeting={meeting} eventDays={eventDays} />
      {meeting.view === 'needsMe' ? (
        <View style={styles.row}>
          <Button size="sm" label={t('meetings.accept')} disabled={busy} onPress={() => void answer('accepted')} />
          <Button size="sm" variant="secondary" label={t('meetings.decline')} disabled={busy} onPress={() => void answer('declined')} />
        </View>
      ) : null}
      {meeting.view === 'mineWaiting' ? (
        <Button size="sm" variant="ghost" label={t('meetings.cancel')} disabled={busy} onPress={() => void answer('cancelled')} />
      ) : null}
      {event && meeting.status === 'accepted' ? <CalendarButton item={meetingCalendarDraft(event, meeting)} /> : null}
      {error ? <InlineError text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.tight * 2 },
  row: { flexDirection: 'row', gap: space.tight * 2 },
});
