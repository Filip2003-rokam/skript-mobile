import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { clearOfflineCache } from '../offlineCache';
import { clearAgendaReminders } from './agendaReminderService';
import { unregisterPush } from './notificationService';
import { cancelAllFollowUps } from './reminderService';
import { t } from '../i18n';

// Triger na novom nalogu čita full_name iz metapodataka i upisuje ga u profiles.
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) throw error;
  return data.session;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  try {
    await unregisterPush();
  } catch {
    // Token ostaje upisan. Odjava ide dalje.
  }
  // Podsetnici su vezani za nalog. Sledeći korisnik na ovom telefonu ne sme da ih dobije.
  await clearAgendaReminders();
  await cancelAllFollowUps().catch(() => undefined);
  await clearOfflineCache();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

function ownSentence(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const message = error.message.trim();
  if (!message || message.length > 180) return null;
  if (/[{}<>]|postgres|pgrst|typeerror|syntaxerror|jwt|stack|sql|fetch|network|timeout/i.test(message)) return null;
  return message;
}

export function authErrorMessage(error: unknown): string {
  const value = typeof error === 'object' && error !== null ? (error as { message?: string; code?: string; name?: string }) : {};
  const text = `${value.code ?? ''} ${value.name ?? ''} ${value.message ?? ''}`.toLowerCase();

  if (text.includes('invalid_credentials') || text.includes('invalid login')) {
    return t('errors.wrongPassword');
  }
  if (text.includes('already registered') || text.includes('already been registered') || text.includes('user_already_exists')) {
    return t('errors.accountExists');
  }
  if (text.includes('network') || text.includes('fetch') || text.includes('offline') || text.includes('timeout')) {
    return t('errors.offline');
  }
  if (text.includes('jwt') || text.includes('session') || text.includes('not authenticated') || text.includes('refresh token') || text.includes('nisi prijavljen')) {
    return t('errors.signedOutRetry');
  }
  if (text.includes('pgrst') || text.includes('42501') || text.includes('permission') || text.includes('row-level') || text.includes('postgres')) {
    return t('errors.query');
  }
  return ownSentence(error) ?? t('errors.generic');
}
