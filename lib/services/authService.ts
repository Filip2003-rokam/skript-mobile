import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { unregisterPush } from './notificationService';
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

export function authErrorMessage(error: unknown): string {
  const value = typeof error === 'object' && error !== null ? (error as { message?: string; code?: string; name?: string }) : {};
  const text = `${value.code ?? ''} ${value.name ?? ''} ${value.message ?? ''}`.toLowerCase();

  if (text.includes('invalid_credentials') || text.includes('invalid login')) {
    return t('errors.wrongPassword');
  }
  if (text.includes('already registered') || text.includes('already been registered') || text.includes('user_already_exists')) {
    return t('errors.accountExists');
  }
  if (text.includes('network') || text.includes('fetch') || text.includes('offline')) {
    return t('errors.offline');
  }
  return t('errors.generic');
}
