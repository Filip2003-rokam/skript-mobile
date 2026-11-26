import { supabase } from '../supabase';
import { getSession } from './authService';
import { t } from '../i18n';

// „Moj dan“: predavanja koja je korisnik sačuvao. Baza dozvoljava samo sopstvene redove.

async function myId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  return session.user.id;
}

export async function listSavedSessionIds(sessionIds: string[]): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const me = await myId();
  const { data, error } = await supabase.from('saved_sessions').select('session_id').eq('user_id', me).in('session_id', sessionIds);
  if (error) throw error;
  return new Set(((data ?? []) as { session_id: string }[]).map((row) => row.session_id));
}

export async function setSessionSaved(sessionId: string, saved: boolean): Promise<void> {
  const me = await myId();
  if (saved) {
    const { error } = await supabase.from('saved_sessions').upsert({ user_id: me, session_id: sessionId }, { onConflict: 'user_id,session_id' });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('saved_sessions').delete().eq('user_id', me).eq('session_id', sessionId);
  if (error) throw error;
}
