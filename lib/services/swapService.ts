import { supabase } from '../supabase';
import { getSession } from './authService';

const minutes = 5;

export function swapQr(token: string): string {
  return `skript://swap/${token}`;
}

export async function issueSwapToken(eventId: string): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen. Prijavi se i pokušaj ponovo.');
  const token = freshToken();
  const { error: cleared } = await supabase.from('swap_tokens').delete().eq('event_id', eventId).is('used_at', null);
  if (cleared) throw cleared;
  const { error } = await supabase.from('swap_tokens').insert({ event_id: eventId, token });
  if (error) throw error;
  return token;
}

export async function revokeSwapToken(eventId: string): Promise<void> {
  await supabase.from('swap_tokens').delete().eq('event_id', eventId).is('used_at', null);
}

export async function swapContact(token: string): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen. Prijavi se i pokušaj ponovo.');
  const { data, error } = await supabase.rpc('swap_contact', { token });
  if (error) throw new Error(rpcMessage(error));
  if (typeof data !== 'string' || !data) throw new Error('Kontakt nije napravljen. Pokušaj ponovo.');
  return data;
}

export const swapRefreshMs = (minutes - 1) * 60 * 1000;

function freshToken(): string {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.randomUUID) throw new Error('Telefon ne može da napravi kod. Zatvori ekran i otvori ga ponovo.');
  return cryptoRef.randomUUID().replace(/-/g, '');
}

function rpcMessage(error: { message?: string }): string {
  const text = error.message ?? '';
  const cleaned = text.replace(/^.*ERROR:\s*/i, '').split('\n')[0].trim();
  return cleaned || 'Razmena nije uspela. Pokušaj ponovo.';
}
