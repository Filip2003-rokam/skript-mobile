import { supabase } from '../supabase';
import { getSession } from './authService';
import { t } from '../i18n';

export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

/** Kako sastanak izgleda iz mog ugla: žuto dok čeka, zeleno kad je zakazan (kao na webu). */
export type MeetingView = 'mineWaiting' | 'needsMe' | 'accepted' | 'closed';

export type Meeting = {
  id: string;
  eventId: string;
  otherId: string;
  otherName: string | null;
  day: number;
  time: string;
  place: string;
  status: MeetingStatus;
  view: MeetingView;
};

type MeetingDb = {
  id: string;
  event_id: string;
  proposer_id: string;
  invitee_id: string;
  day: number;
  start_time: string;
  place: string;
  status: MeetingStatus;
};

async function myId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  return session.user.id;
}

export function meetingView(row: { proposer_id: string; status: MeetingStatus }, me: string): MeetingView {
  if (row.status === 'accepted') return 'accepted';
  if (row.status !== 'pending') return 'closed';
  return row.proposer_id === me ? 'mineWaiting' : 'needsMe';
}

/** „HH:MM“ iz baze („11:30:00“). */
export function meetingClock(value: string): string {
  const [hour = '00', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** Vreme koje korisnik upiše: „9:5“ ne, „09:05“ i „9:05“ da. */
export function parseMeetingTime(value: string): string | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export async function listMeetings(eventId: string): Promise<Meeting[]> {
  const me = await myId();
  const { data, error } = await supabase
    .from('meetings')
    .select('id, event_id, proposer_id, invitee_id, day, start_time, place, status')
    .eq('event_id', eventId)
    .order('day')
    .order('start_time');
  if (error) throw error;
  const rows = (data ?? []) as MeetingDb[];
  const others = [...new Set(rows.map((row) => (row.proposer_id === me ? row.invitee_id : row.proposer_id)))];
  const names = new Map<string, string | null>();
  if (others.length > 0) {
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name').in('id', others);
    if (profileError) throw profileError;
    for (const row of (profiles ?? []) as { id: string; full_name: string | null }[]) names.set(row.id, row.full_name);
  }
  return rows.map((row) => {
    const otherId = row.proposer_id === me ? row.invitee_id : row.proposer_id;
    return {
      id: row.id,
      eventId: row.event_id,
      otherId,
      otherName: names.get(otherId) ?? null,
      day: row.day,
      time: meetingClock(row.start_time),
      place: row.place,
      status: row.status,
      view: meetingView(row, me),
    };
  });
}

/** Poslednji otvoren ili zakazan sastanak sa svakom osobom, za karticu u Ljudima. */
export function meetingByPerson(meetings: Meeting[]): Map<string, Meeting> {
  const map = new Map<string, Meeting>();
  for (const meeting of meetings) {
    if (meeting.view === 'closed') continue;
    map.set(meeting.otherId, meeting);
  }
  return map;
}

export async function proposeMeeting(input: { eventId: string; inviteeId: string; day: number; time: string; place: string }): Promise<void> {
  const me = await myId();
  const time = parseMeetingTime(input.time);
  if (!time) throw new Error(t('meetings.timeInvalid'));
  const place = input.place.trim();
  if (!place) throw new Error(t('meetings.placeRequired'));
  const { error } = await supabase.from('meetings').insert({
    event_id: input.eventId,
    proposer_id: me,
    invitee_id: input.inviteeId,
    day: input.day,
    start_time: time,
    place,
  });
  if (error) throw new Error(meetingError(error));
}

export async function answerMeeting(id: string, status: 'accepted' | 'declined' | 'cancelled'): Promise<void> {
  const { error } = await supabase.from('meetings').update({ status }).eq('id', id).eq('status', 'pending');
  if (error) throw new Error(meetingError(error));
}

function meetingError(error: { message?: string; code?: string }): string {
  const text = `${error.code ?? ''} ${error.message ?? ''}`;
  if (text.includes('23505')) return t('meetings.alreadyOpen');
  if (text.includes('5 otvorenih')) return t('meetings.openLimit');
  if (text.includes('odbila')) return t('meetings.declinedBefore');
  if (text.includes('dan nije deo')) return t('meetings.dayInvalid');
  return t('meetings.failed');
}
