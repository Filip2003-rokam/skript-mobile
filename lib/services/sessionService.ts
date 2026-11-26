import { supabase } from '../supabase';
import { eventPhase } from './eventService';

export type SessionRow = {
  id: string;
  title: string;
  room: string | null;
  day: number | null;
  start_time: string | null;
  duration_min: number | null;
  speakers: string[];
};

type SessionRecord = Omit<SessionRow, 'speakers'> & {
  speakers: string[] | null;
};

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function sessionClock(value: string | null): string {
  if (!value) return '';
  const [hour, minute] = value.split(':');
  if (!hour || !minute) return value;
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export function sessionEndClock(start: string | null, durationMin: number | null): string {
  if (!start || durationMin == null) return '';
  const [hour, minute] = start.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
  const total = hour * 60 + minute + durationMin;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export type SessionMark = 'live' | 'ended' | 'upcoming';

export function sessionMark(
  startsOn: string | null,
  days: number | null,
  session: Pick<SessionRow, 'day' | 'start_time' | 'duration_min'>,
  now = new Date(),
): SessionMark {
  if (sessionIsLive(startsOn, days, session, now)) return 'live';
  const timing = eventPhase(startsOn, days, now);
  if (timing.phase === 'before') return 'upcoming';
  if (timing.phase === 'after' || (session.day ?? 1) < timing.day) return 'ended';
  if ((session.day ?? 1) > timing.day || !session.start_time) return 'upcoming';
  const minute = now.getHours() * 60 + now.getMinutes();
  const start = clockMinutes(session.start_time);
  return minute >= start + (session.duration_min ?? 0) ? 'ended' : 'upcoming';
}

// U toku je samo na pravom danu eventa, između početka i kraja.
export function sessionIsLive(
  startsOn: string | null,
  days: number | null,
  session: Pick<SessionRow, 'day' | 'start_time' | 'duration_min'>,
  now = new Date(),
): boolean {
  const timing = eventPhase(startsOn, days, now);
  if (timing.phase !== 'during' || session.day !== timing.day || !session.start_time) return false;
  const minute = now.getHours() * 60 + now.getMinutes();
  const start = clockMinutes(session.start_time);
  return minute >= start && minute < start + (session.duration_min ?? 0);
}

export async function listSessions(eventId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('event_sessions')
    .select('id, title, room, day, start_time, duration_min, speakers')
    .eq('event_id', eventId)
    .order('day', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SessionRecord[]).map((row) => ({
    ...row,
    speakers: row.speakers ?? [],
  }));
}

// Sledeća predavanja za početnu: pre eventa prva sa prvog dana, tokom eventa ona koja danas tek počinju.
export function upcomingSessions(
  startsOn: string | null,
  days: number | null,
  sessions: SessionRow[],
  now = new Date(),
  limit = 3,
): SessionRow[] {
  const timing = eventPhase(startsOn, days, now);
  if (timing.phase === 'after') return [];
  const minute = now.getHours() * 60 + now.getMinutes();
  const day = timing.phase === 'during' ? timing.day : 1;
  return sessions
    .filter((session) => session.day === day && session.start_time)
    .filter((session) => timing.phase === 'before' || clockMinutes(session.start_time ?? '') > minute)
    .slice(0, limit);
}
