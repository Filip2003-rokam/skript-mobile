import { supabase } from '../supabase';
import { getSession } from './authService';

export type SavedPerson = {
  userId: string;
  name: string | null;
  role: string | null;
  company: string | null;
};

async function userId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  return session.user.id;
}

export async function list(eventId: string): Promise<SavedPerson[]> {
  const id = await userId();
  const { data, error } = await supabase
    .from('saved_people')
    .select('saved_user_id')
    .eq('user_id', id)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const ids = ((data ?? []) as { saved_user_id: string }[]).map((row) => row.saved_user_id);
  if (ids.length === 0) return [];

  const [{ data: profiles, error: profileError }, { data: attendees, error: attendeeError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', ids),
    supabase.from('event_attendees').select('user_id, role, company').eq('event_id', eventId).in('user_id', ids),
  ]);
  if (profileError) throw profileError;
  if (attendeeError) throw attendeeError;

  const names = new Map(((profiles ?? []) as { id: string; full_name: string | null }[]).map((row) => [row.id, row.full_name]));
  const presence = new Map(
    ((attendees ?? []) as { user_id: string; role: string | null; company: string | null }[]).map((row) => [row.user_id, row]),
  );
  return ids.map((savedUserId) => {
    const attendee = presence.get(savedUserId);
    return {
      userId: savedUserId,
      name: names.get(savedUserId) ?? null,
      role: attendee?.role ?? null,
      company: attendee?.company ?? null,
    };
  });
}

export async function save(eventId: string, userIdToSave: string) {
  const id = await userId();
  const { error } = await supabase.from('saved_people').insert({
    user_id: id,
    event_id: eventId,
    saved_user_id: userIdToSave,
  });
  if (error?.code === '23505') return;
  if (error) throw error;
}

export async function unsave(eventId: string, userIdToRemove: string) {
  const id = await userId();
  const { error } = await supabase
    .from('saved_people')
    .delete()
    .eq('user_id', id)
    .eq('event_id', eventId)
    .eq('saved_user_id', userIdToRemove);
  if (error) throw error;
}
