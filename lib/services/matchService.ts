import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getSession } from './authService';
import { appLanguage, appLocale, t } from '../i18n';

export type Suggestion = {
  id: string;
  suggestedUserId: string;
  score: number;
  why: string | null;
  matchedMine: string | null;
  matchedTheirs: string | null;
  openers: string[];
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  company: string | null;
  intents: string[];
  offers: string[];
  needs: string[];
  inRoom: boolean;
};

type SuggestionRow = {
  id: string;
  score: number;
  why: string | null;
  matched_mine: string | null;
  matched_theirs: string | null;
  openers: string[] | null;
  suggested_user_id: string;
};

type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

const phraseEn: Record<string, string> = {
  'Praviš softver': 'You build software',
  'Dizajniraš proizvode': 'You design products',
  Investiraš: 'You invest',
  'Praviš prodajne kontakte': 'You make sales intros',
  'Radiš marketing': 'You do marketing',
  'Mentoruješ osnivače': 'You mentor founders',
  'Tražiš klijente': 'You are looking for clients',
  'Tražiš programere': 'You are looking for developers',
  'Tražiš partnere': 'You are looking for partners',
  Zapošljavaš: 'You are hiring',
  'Skupljaš novac': 'You are raising money',
  'Treba im razvojni tim': 'They need a dev team',
  'Skuplja seed rundu': 'Raising a seed round',
  'Traži klijente': 'Looking for clients',
  'Traži partnere': 'Looking for partners',
  'Traži programere': 'Looking for developers',
  'Treba im marketing': 'They need marketing',
  'Treba im dizajn': 'They need design',
  'Traži mentora': 'Looking for a mentor',
  'Investira u seed': 'Invests in seed',
  'Pravi softver': 'Builds software',
  'Može biti prvi kupac': 'Could be a first customer',
};

function englishPhrase(value: string | null): string | null {
  if (!value || appLanguage() !== 'en') return value;
  return phraseEn[value] ?? value;
}

function englishWhy(why: string | null, mine: string | null, theirs: string | null): string | null {
  if (!why || appLanguage() !== 'en') return why;
  const mineEn = mine ? phraseEn[mine] : undefined;
  const theirsEn = theirs ? phraseEn[theirs] : undefined;
  if (!/[čćžšđ]/i.test(why) && !why.startsWith('Ti ')) return why;
  if (!mineEn || !theirsEn) return why;
  return `${mineEn}, and ${theirsEn.charAt(0).toLowerCase()}${theirsEn.slice(1)}.`;
}

type AttendeeRow = {
  user_id: string;
  role: string | null;
  company: string | null;
  why: string[] | null;
  offers: string[] | null;
  needs: string[] | null;
  in_room: boolean | null;
};

export async function getSuggestions(eventId: string): Promise<Suggestion[]> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));

  const { data, error } = await supabase
    .from('match_suggestions')
    .select('id, score, why, matched_mine, matched_theirs, openers, suggested_user_id')
    .eq('event_id', eventId)
    .eq('user_id', session.user.id)
    .order('score', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as SuggestionRow[];
  const ids = rows.map((row) => row.suggested_user_id);
  if (ids.length === 0) return [];

  const [{ data: profiles, error: profileError }, { data: attendees, error: attendeeError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids),
    supabase.from('event_attendees').select('user_id, role, company, why, offers, needs, in_room').eq('event_id', eventId).in('user_id', ids),
  ]);
  if (profileError) throw profileError;
  if (attendeeError) throw attendeeError;

  const people = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const presence = new Map(((attendees ?? []) as AttendeeRow[]).map((attendee) => [attendee.user_id, attendee]));

  return rows
    .map((row) => {
      const person = people.get(row.suggested_user_id);
      const attendee = presence.get(row.suggested_user_id);
      return {
        id: row.id,
        suggestedUserId: row.suggested_user_id,
        score: row.score,
        why: englishWhy(row.why, row.matched_mine, row.matched_theirs),
        matchedMine: englishPhrase(row.matched_mine),
        matchedTheirs: englishPhrase(row.matched_theirs),
        openers: row.openers ?? [],
        name: person?.full_name ?? null,
        avatarUrl: person?.avatar_url ?? null,
        role: attendee?.role ?? null,
        company: attendee?.company ?? null,
        intents: attendee?.why ?? [],
        offers: attendee?.offers ?? [],
        needs: attendee?.needs ?? [],
        inRoom: attendee?.in_room ?? false,
      };
    })
    .sort((a, b) => b.score - a.score || (a.name ?? '').localeCompare(b.name ?? '', appLocale()));
}

export async function refreshSuggestions(eventId: string): Promise<Suggestion[]> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));

  const { error } = await supabase.functions.invoke('match-attendees', { body: { event_id: eventId, lang: appLanguage() } });
  if (error) throw new Error(await functionMessage(error));
  return getSuggestions(eventId);
}

async function functionMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const body = (await error.context.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      return t('match.unavailable');
    }
  }
  return t('match.unavailable');
}
