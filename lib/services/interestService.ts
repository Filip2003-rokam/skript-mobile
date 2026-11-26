import type { InterestKind } from '../../types/database';
import { supabase } from '../supabase';
import { getSession } from './authService';
import { t } from '../i18n';

export const openInterestLimit = 5;

export type InterestPerson = {
  id: string;
  userId: string;
  name: string | null;
  role: string | null;
  company: string | null;
};

const limitMessage = () => t('interest.limit');

type InterestDb = { id: string; target_user_id: string; kind: InterestKind };
type Pair = { requester_id: string; receiver_id: string };

async function userId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  return session.user.id;
}

function savedError(error: { message?: string; details?: string; hint?: string; code?: string }): Error {
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  if (text.includes('5 otvorenih interesovanja')) return new Error(limitMessage());
  if (error.code === '23505') return new Error(t('interest.exists'));
  if (error.code === '42501' || text.toLowerCase().includes('row-level security')) {
    return new Error(t('interest.bothAttendees'));
  }
  return new Error(t('interest.notSaved'));
}

async function writeInterest(eventId: string, targetUserId: string, kind: InterestKind): Promise<void> {
  const id = await userId();
  const { error } = await supabase.from('interests').insert({
    event_id: eventId,
    user_id: id,
    target_user_id: targetUserId,
    kind,
  });
  if (error) throw savedError(error);
}

export async function expressInterest(eventId: string, targetUserId: string): Promise<void> {
  await writeInterest(eventId, targetUserId, 'interested');
}

export async function skipPerson(eventId: string, targetUserId: string): Promise<void> {
  await writeInterest(eventId, targetUserId, 'skipped');
}

export async function removeInterest(interestId: string): Promise<void> {
  const id = await userId();
  const { error } = await supabase.from('interests').delete().eq('id', interestId).eq('user_id', id);
  if (error) throw new Error(t('interest.notDeleted'));
}

export async function listMine(eventId: string): Promise<{ open: InterestPerson[]; skipped: InterestPerson[] }> {
  const id = await userId();
  const [{ data: interests, error: interestError }, { data: links, error: linkError }] = await Promise.all([
    supabase.from('interests').select('id, target_user_id, kind').eq('event_id', eventId).eq('user_id', id),
    supabase
      .from('connections')
      .select('requester_id, receiver_id')
      .eq('event_id', eventId)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${id},receiver_id.eq.${id}`),
  ]);
  if (interestError) throw interestError;
  if (linkError) throw linkError;

  const formed = new Set<string>();
  for (const link of (links ?? []) as Pair[]) {
    formed.add(link.requester_id === id ? link.receiver_id : link.requester_id);
  }

  const rows = (interests ?? []) as InterestDb[];
  const ids = rows.map((row) => row.target_user_id);
  const names = await loadNames(eventId, ids);
  const open: InterestPerson[] = [];
  const skipped: InterestPerson[] = [];
  for (const row of rows) {
    const person = names.get(row.target_user_id) ?? { name: null, role: null, company: null };
    const item = { id: row.id, userId: row.target_user_id, ...person };
    if (row.kind === 'skipped') skipped.push(item);
    else if (!formed.has(row.target_user_id)) open.push(item);
  }
  return { open, skipped };
}

async function loadNames(eventId: string, ids: string[]): Promise<Map<string, { name: string | null; role: string | null; company: string | null }>> {
  const map = new Map<string, { name: string | null; role: string | null; company: string | null }>();
  if (ids.length === 0) return map;
  const [{ data: profiles, error: profileError }, { data: attendees, error: attendeeError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', ids),
    supabase.from('event_attendees').select('user_id, role, company').eq('event_id', eventId).in('user_id', ids),
  ]);
  if (profileError) throw profileError;
  if (attendeeError) throw attendeeError;
  for (const personId of ids) map.set(personId, { name: null, role: null, company: null });
  for (const profile of (profiles ?? []) as { id: string; full_name: string | null }[]) {
    const bits = map.get(profile.id);
    if (bits) bits.name = profile.full_name;
  }
  for (const attendee of (attendees ?? []) as { user_id: string; role: string | null; company: string | null }[]) {
    const bits = map.get(attendee.user_id);
    if (!bits) continue;
    bits.role = attendee.role;
    bits.company = attendee.company;
  }
  return map;
}
