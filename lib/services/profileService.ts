import { supabase } from '../supabase';
import type { EventRow } from '../../types/database';
import { getSession } from './authService';
import { t } from '../i18n';

export type MyProfile = {
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
};

export type ProfileUpdate = {
  fullName: string;
  phone: string;
  linkedinUrl: string;
};

export type EventStat = EventRow & {
  contacts: number;
  connections: number;
  saved: number;
};

export async function getMyProfile(): Promise<MyProfile> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  const [{ data: profile, error: profileError }, { data: priv, error: privateError }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', session.user.id).maybeSingle(),
    supabase.from('profile_private').select('email, phone, linkedin_url').eq('user_id', session.user.id).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (privateError) throw privateError;
  return {
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    email: priv?.email ?? null,
    phone: priv?.phone ?? null,
    linkedinUrl: priv?.linkedin_url ?? null,
  };
}

export async function updateMyProfile(data: ProfileUpdate): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  const name = data.fullName.trim();
  const phone = data.phone.trim() || null;
  const linkedin = data.linkedinUrl.trim() || null;
  const [{ error: profileError }, { error: privateError }] = await Promise.all([
    supabase.from('profiles').update({ full_name: name || null }).eq('id', session.user.id),
    supabase.from('profile_private').update({ phone, linkedin_url: linkedin }).eq('user_id', session.user.id),
  ]);
  if (profileError) throw profileError;
  if (privateError) throw privateError;
}

function tally(rows: { event_id: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.event_id) continue;
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }
  return counts;
}

export async function listMyEventStats(): Promise<EventStat[]> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  const id = session.user.id;
  const eventColumns = 'id, slug, name, city, starts_on, days, rooms, cover_url, logo_url';
  const [attended, contacts, connections, saved] = await Promise.all([
    supabase.from('event_attendees').select(`events(${eventColumns})`).eq('user_id', id),
    supabase.from('contacts').select('event_id').eq('owner_id', id),
    supabase.from('connections').select('event_id').eq('status', 'accepted').or(`requester_id.eq.${id},receiver_id.eq.${id}`),
    supabase.from('saved_people').select('event_id').eq('user_id', id),
  ]);
  if (attended.error) throw attended.error;
  if (contacts.error) throw contacts.error;
  if (connections.error) throw connections.error;
  if (saved.error) throw saved.error;

  const contactCount = tally((contacts.data ?? []) as { event_id: string | null }[]);
  const connectionCount = tally((connections.data ?? []) as { event_id: string | null }[]);
  const savedCount = tally((saved.data ?? []) as { event_id: string | null }[]);
  return ((attended.data ?? []) as { events: EventRow | EventRow[] | null }[]).flatMap((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event) return [];
    return [{ ...event, contacts: contactCount.get(event.id) ?? 0, connections: connectionCount.get(event.id) ?? 0, saved: savedCount.get(event.id) ?? 0 }];
  });
}

/** Jezik naloga, da push obaveštenja stižu na izabranom jeziku. */
export async function saveMyLanguage(language: 'sr' | 'en'): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const { error } = await supabase.from('profiles').update({ language }).eq('id', session.user.id);
  if (error) throw error;
}
