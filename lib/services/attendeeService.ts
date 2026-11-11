import type { EventAttendeeProfile } from '../../types/database';
import { supabase } from '../supabase';
import { getSession } from './authService';

async function userId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  return session.user.id;
}

export async function getMyEventProfile(eventId: string): Promise<EventAttendeeProfile | null> {
  const id = await userId();
  const { data, error } = await supabase
    .from('event_attendees')
    .select('why, role, company, offers, needs')
    .eq('event_id', eventId)
    .eq('user_id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAttendeeName(eventId: string, attendeeId: string): Promise<string | null> {
  const { data: attendee, error } = await supabase
    .from('event_attendees')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', attendeeId)
    .maybeSingle();
  if (error) throw error;
  if (!attendee) return null;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name').eq('id', attendeeId).maybeSingle();
  if (profileError) throw profileError;
  const name = profile?.full_name?.trim();
  return name || 'Učesnik';
}

export async function saveMyEventProfile(eventId: string, profile: EventAttendeeProfile): Promise<void> {
  const id = await userId();
  const { error } = await supabase.from('event_attendees').upsert(
    {
      event_id: eventId,
      user_id: id,
      why: profile.why,
      role: profile.role,
      company: profile.company,
      offers: profile.offers,
      needs: profile.needs,
    },
    { onConflict: 'event_id,user_id' },
  );
  if (error) throw error;
}
