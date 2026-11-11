import { supabase } from '../supabase';
import { getSession } from './authService';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';
export type ConnectionSource = 'match' | 'qr';

export type ConnectionPerson = {
  id: string;
  userId: string;
  name: string | null;
  role: string | null;
  company: string | null;
  message: string | null;
  status: ConnectionStatus;
  email: string | null;
  phone: string | null;
};

type ConnectionDb = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  message: string | null;
};

type PersonBits = {
  name: string | null;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
};

async function userId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  return session.user.id;
}

async function loadBits(eventId: string, ids: string[], mine: string): Promise<Map<string, PersonBits>> {
  const map = new Map<string, PersonBits>();
  if (ids.length === 0) return map;
  const [{ data: profiles, error: profileError }, { data: attendees, error: attendeeError }, { data: contacts, error: contactError }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', ids),
      supabase.from('event_attendees').select('user_id, role, company').eq('event_id', eventId).in('user_id', ids),
      supabase.from('contacts').select('contact_user_id, email, phone').eq('owner_id', mine).in('contact_user_id', ids),
    ]);
  if (profileError) throw profileError;
  if (attendeeError) throw attendeeError;
  if (contactError) throw contactError;

  for (const id of ids) map.set(id, { name: null, role: null, company: null, email: null, phone: null });
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
  for (const contact of (contacts ?? []) as { contact_user_id: string | null; email: string | null; phone: string | null }[]) {
    if (!contact.contact_user_id) continue;
    const bits = map.get(contact.contact_user_id);
    if (!bits) continue;
    bits.email = contact.email;
    bits.phone = contact.phone;
  }
  return map;
}

function toPerson(row: ConnectionDb, otherId: string, bits: PersonBits | undefined): ConnectionPerson {
  return {
    id: row.id,
    userId: otherId,
    name: bits?.name ?? null,
    role: bits?.role ?? null,
    company: bits?.company ?? null,
    message: row.message,
    status: row.status,
    email: bits?.email ?? null,
    phone: bits?.phone ?? null,
  };
}

export async function sendRequest(eventId: string, receiverId: string, message: string, source: ConnectionSource) {
  const id = await userId();
  const text = message.trim();
  const { error } = await supabase.from('connections').insert({
    event_id: eventId,
    requester_id: id,
    receiver_id: receiverId,
    message: text ? text.slice(0, 280) : null,
    source,
    status: 'pending',
  });
  if (error?.code === '23505') throw new Error('Zahtev je već poslat.');
  if (error) throw error;
}

export async function getIncoming(eventId: string): Promise<ConnectionPerson[]> {
  const id = await userId();
  const { data, error } = await supabase
    .from('connections')
    .select('id, requester_id, receiver_id, status, message')
    .eq('event_id', eventId)
    .eq('receiver_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ConnectionDb[];
  const bits = await loadBits(eventId, rows.map((row) => row.requester_id), id);
  return rows.map((row) => toPerson(row, row.requester_id, bits.get(row.requester_id)));
}

export async function getOutgoing(eventId: string): Promise<ConnectionPerson[]> {
  const id = await userId();
  const { data, error } = await supabase
    .from('connections')
    .select('id, requester_id, receiver_id, status, message')
    .eq('event_id', eventId)
    .eq('requester_id', id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ConnectionDb[];
  const bits = await loadBits(eventId, rows.map((row) => row.receiver_id), id);
  return rows.map((row) => toPerson(row, row.receiver_id, bits.get(row.receiver_id)));
}

export async function getConnected(eventId: string): Promise<ConnectionPerson[]> {
  const id = await userId();
  const columns = 'id, requester_id, receiver_id, status, message';
  const [{ data: sent, error: sentError }, { data: received, error: receivedError }] = await Promise.all([
    supabase.from('connections').select(columns).eq('event_id', eventId).eq('status', 'accepted').eq('requester_id', id),
    supabase.from('connections').select(columns).eq('event_id', eventId).eq('status', 'accepted').eq('receiver_id', id),
  ]);
  if (sentError) throw sentError;
  if (receivedError) throw receivedError;

  const rows = [...((sent ?? []) as ConnectionDb[]), ...((received ?? []) as ConnectionDb[])];
  const seen = new Set<string>();
  const unique = rows.filter((row) => {
    const other = row.requester_id === id ? row.receiver_id : row.requester_id;
    if (seen.has(other)) return false;
    seen.add(other);
    return true;
  });
  const bits = await loadBits(eventId, [...seen], id);
  return unique.map((row) => {
    const other = row.requester_id === id ? row.receiver_id : row.requester_id;
    return toPerson(row, other, bits.get(other));
  });
}

export async function respond(connectionId: string, status: 'accepted' | 'declined') {
  const id = await userId();
  const { error } = await supabase.from('connections').update({ status }).eq('id', connectionId).eq('receiver_id', id).eq('status', 'pending');
  if (error) throw error;
}

export async function countIncoming(eventId: string): Promise<number> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  const { count, error } = await supabase
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('receiver_id', session.user.id)
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}
