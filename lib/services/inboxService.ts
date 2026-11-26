import { supabase } from '../supabase';
import { getSession } from './authService';
import { t } from '../i18n';

// Zvonce: obaveštenja koja upisuje baza (zahtevi, veze, sastanci). Korisnik ih samo čita.

export type InboxKind = 'connection_request' | 'connection_accepted' | 'meeting_proposed' | 'meeting_accepted' | 'meeting_declined';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  actorName: string | null;
  createdAt: string;
  read: boolean;
};

type InboxDb = { id: string; kind: InboxKind; actor_id: string | null; created_at: string; read_at: string | null };

export async function listInbox(eventId: string): Promise<InboxItem[]> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, actor_id, created_at, read_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as InboxDb[];
  const actors = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string | null>();
  if (actors.length > 0) {
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name').in('id', actors);
    if (profileError) throw profileError;
    for (const row of (profiles ?? []) as { id: string; full_name: string | null }[]) names.set(row.id, row.full_name);
  }
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    actorName: row.actor_id ? names.get(row.actor_id) ?? null : null,
    createdAt: row.created_at,
    read: row.read_at != null,
  }));
}

export async function markInboxRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null);
  if (error) throw error;
}

/** Rečenica za jedno obaveštenje, na izabranom jeziku. */
export function inboxText(item: InboxItem): string {
  const name = item.actorName?.trim() || t('person.unknown');
  return t(`inbox.${item.kind}`, { name });
}

/** Kuda vodi dodir na obaveštenje. */
export function inboxTarget(kind: InboxKind): 'requests' | 'connected' | 'myDay' {
  if (kind === 'connection_request') return 'requests';
  if (kind === 'connection_accepted') return 'connected';
  return 'myDay';
}
