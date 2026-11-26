import { useCallback, useEffect, useState } from 'react';
import { listMeetings, meetingByPerson, type Meeting } from '../../lib/services/meetingService';

/** Sastanci na eventu, sa poslednjim po osobi za kartice u Ljudima. */
export function useMeetings(eventId: string | null) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!eventId) return;
    try {
      setMeetings(await listMeetings(eventId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { meetings, byPerson: meetingByPerson(meetings), error, reload };
}
