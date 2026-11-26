import { useCallback, useEffect, useState } from 'react';
import { withOfflineCache } from '../../lib/offlineCache';
import { meetingReminders } from '../../lib/reminders';
import { syncAgendaReminders } from '../../lib/services/agendaReminderService';
import { listMeetings, meetingByPerson, type Meeting } from '../../lib/services/meetingService';

type MeetingEvent = { id: string; slug: string; starts_on: string | null };

/** Sastanci na eventu, sa poslednjim po osobi za kartice u Ljudima. Usput usklađuje podsetnike za prihvaćene sastanke. */
export function useMeetings(event: MeetingEvent | null) {
  const eventId = event?.id ?? null;
  const slug = event?.slug ?? '';
  const startsOn = event?.starts_on ?? null;
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!eventId) return;
    try {
      const { value: list } = await withOfflineCache(`meetings:${eventId}`, () => listMeetings(eventId));
      setMeetings(list);
      setError(null);
      void syncAgendaReminders(eventId, 'meeting', meetingReminders({ slug, startsOn, meetings: list }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [eventId, slug, startsOn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { meetings, byPerson: meetingByPerson(meetings), error, reload };
}
