import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  fallbackOpeners,
  fallbackWhy,
  scoreCandidate,
  type MatchProfile,
  type MatchScore,
} from './score.ts';

const dailyLimit = 5;
const geminiTimeoutMs = 20_000;
const defaultModel = 'gemini-3.6-flash';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AttendeeRow = {
  user_id: string;
  why: string[] | null;
  role: string | null;
  company: string | null;
  offers: string[] | null;
  needs: string[] | null;
  in_room: boolean | null;
};

type Ranked = {
  userId: string;
  profile: MatchProfile;
  score: MatchScore;
};

type Copy = { why: string; openers: [string, string] };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Nedostaje event.' }, 400);

  try {
    const eventId = await readEventId(request);
    if (!eventId) return json({ error: 'Nedostaje event.' }, 400);

    const admin = serviceClient();
    const userId = await callerId(admin, request);
    if (!userId) return json({ error: 'Nisi prijavljen.' }, 401);

    const { data: event, error: eventError } = await admin.from('events').select('matching_enabled').eq('id', eventId).maybeSingle();
    if (eventError) throw eventError;
    if (!event) return json({ error: 'Predlozi nisu uključeni za ovaj event.' }, 400);

    const { data: attendance, error: mineError } = await admin
      .from('event_attendees')
      .select('user_id, why, role, company, offers, needs, in_room')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (mineError) throw mineError;
    if (!attendance) return json({ error: 'Nisi učesnik ovog eventa.' }, 403);
    if (!event.matching_enabled) return json({ error: 'Predlozi nisu uključeni za ovaj event.' }, 400);

    const since = startOfZonedDay('Europe/Belgrade');
    const { data: runs, error: countError } = await admin
      .from('match_runs')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .gte('created_at', since);
    if (countError) throw countError;
    // Pet poziva prolazi. Šesti vidi već upisanih pet i dobija 429.
    if ((runs?.length ?? 0) >= dailyLimit) {
      return json({ error: 'Danas si već tražio predloge pet puta. Pokušaj ponovo sutra.' }, 429);
    }

    const { error: runError } = await admin.from('match_runs').insert({ event_id: eventId, user_id: userId });
    if (runError) throw runError;

    const me = profileFrom(attendance, '');
    const ranked = await rankCandidates(admin, eventId, userId, me);
    const copy = await writeCopy(ranked);
    const rows = ranked.map((item) => {
      const text = copy.get(item.userId) ?? {
        why: fallbackWhy(item.score),
        openers: fallbackOpeners(me, item.profile, item.score.matched_theirs),
      };
      return {
        event_id: eventId,
        user_id: userId,
        suggested_user_id: item.userId,
        score: item.score.score,
        why: text.why,
        matched_mine: item.score.matched_mine,
        matched_theirs: item.score.matched_theirs,
        openers: text.openers,
      };
    });

    const { error: deleteError } = await admin.from('match_suggestions').delete().eq('event_id', eventId).eq('user_id', userId);
    if (deleteError) throw deleteError;
    if (rows.length > 0) {
      const { error: insertError } = await admin.from('match_suggestions').insert(rows);
      if (insertError) throw insertError;
    }

    return json({ suggestions: rows });
  } catch (cause) {
    console.error(cause);
    return json({ error: 'Predlozi trenutno nisu dostupni. Pokušaj ponovo.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKey();
  if (!url || !key) throw new Error('Service role klijent nije podešen.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function secretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return undefined;
  try {
    const keys = JSON.parse(raw) as Record<string, string>;
    return keys.default;
  } catch {
    return undefined;
  }
}

async function callerId(admin: SupabaseClient, request: Request): Promise<string | null> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function readEventId(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { event_id?: unknown };
    return typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null;
  } catch {
    return null;
  }
}

function profileFrom(row: AttendeeRow, name: string): MatchProfile {
  return {
    name,
    role: row.role,
    company: row.company,
    why: row.why ?? [],
    offers: row.offers ?? [],
    needs: row.needs ?? [],
    inRoom: row.in_room ?? false,
  };
}

async function rankCandidates(admin: SupabaseClient, eventId: string, userId: string, me: MatchProfile): Promise<Ranked[]> {
  const { data: attendees, error } = await admin
    .from('event_attendees')
    .select('user_id, why, role, company, offers, needs, in_room')
    .eq('event_id', eventId);
  if (error) throw error;
  const others = ((attendees ?? []) as AttendeeRow[]).filter((row) => row.user_id !== userId);
  if (others.length === 0) return [];

  const ids = others.map((row) => row.user_id);
  const [{ data: profiles, error: profileError }, blocked] = await Promise.all([
    admin.from('profiles').select('id, full_name').in('id', ids),
    blockedIds(admin, eventId, userId),
  ]);
  if (profileError) throw profileError;

  const names = new Map<string, string>();
  for (const profile of profiles ?? []) names.set(profile.id, profile.full_name?.trim() || '');

  const { data: meProfile, error: nameError } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  if (nameError) throw nameError;
  me.name = meProfile?.full_name?.trim() || '';

  return others
    .filter((row) => !blocked.has(row.user_id))
    .flatMap((row) => {
      const profile = profileFrom(row, names.get(row.user_id) || 'Učesnik');
      const score = scoreCandidate(me, profile);
      return score ? [{ userId: row.user_id, profile, score }] : [];
    })
    .sort((a, b) => b.score.score - a.score.score || a.profile.name.localeCompare(b.profile.name, 'sr'))
    .slice(0, 10);
}

async function blockedIds(admin: SupabaseClient, eventId: string, userId: string): Promise<Set<string>> {
  const [sent, received, contacts, interests] = await Promise.all([
    admin.from('connections').select('receiver_id').eq('event_id', eventId).eq('requester_id', userId),
    admin.from('connections').select('requester_id').eq('event_id', eventId).eq('receiver_id', userId),
    admin.from('contacts').select('contact_user_id').eq('owner_id', userId).not('contact_user_id', 'is', null),
    admin.from('interests').select('target_user_id').eq('event_id', eventId).eq('user_id', userId),
  ]);
  if (sent.error) throw sent.error;
  if (received.error) throw received.error;
  if (contacts.error) throw contacts.error;
  if (interests.error) throw interests.error;

  const blocked = new Set<string>();
  for (const row of sent.data ?? []) blocked.add(row.receiver_id);
  for (const row of received.data ?? []) blocked.add(row.requester_id);
  for (const row of contacts.data ?? []) if (row.contact_user_id) blocked.add(row.contact_user_id);
  for (const row of interests.data ?? []) blocked.add(row.target_user_id);
  return blocked;
}

async function writeCopy(ranked: Ranked[]): Promise<Map<string, Copy>> {
  const fallback = new Map<string, Copy>();
  if (ranked.length === 0) return fallback;
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    console.error('GEMINI_API_KEY nije podešen.');
    return fallback;
  }

  const model = Deno.env.get('GEMINI_MODEL')?.trim() || defaultModel;
  const allowed = new Set(ranked.map((item) => item.userId));
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(geminiTimeoutMs),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(ranked) }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                user_id: { type: 'STRING' },
                why: { type: 'STRING' },
                openers: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['user_id', 'why', 'openers'],
            },
          },
        },
      }),
    });
    if (!response.ok) {
      console.error(`Gemini je vratio ${response.status}: ${await geminiError(response, key)}`);
      return fallback;
    }
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    const copy = parseCopy(text, allowed);
    if (!copy) console.error('Gemini je vratio neispravan JSON.');
    return copy ?? fallback;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Nepoznata greška';
    console.error(`Gemini nije odgovorio: ${message}`);
    return fallback;
  }
}

async function geminiError(response: Response, key: string): Promise<string> {
  const raw = await response.text();
  let message = raw.slice(0, 500);
  try {
    const body = JSON.parse(raw) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // Telo nije JSON. Ostaje skraćen tekst.
  }
  return key ? message.replaceAll(key, '') : message;
}

function prompt(ranked: Ranked[]): string {
  const people = ranked.map((item) => ({
    user_id: item.userId,
    ime: item.profile.name,
    uloga: item.profile.role,
    firma: item.profile.company,
    why: item.profile.why,
    nudi: item.profile.offers,
    trazi: item.profile.needs,
    poklapanje: `${item.score.matched_mine} ↔ ${item.score.matched_theirs}`,
  }));
  return [
    'Napiši tekst za već izabrane kandidate. Ne dodaji i ne izbacuj ljude. Svaki user_id prepiši tačno iz liste.',
    'Za svakog vrati why: jednu konkretnu rečenicu na srpskom, zašto da se upoznamo, bez laskanja.',
    'Obraćaj se korisniku sa „ti“, npr. „Ti praviš softver, a Northwindu treba razvojni tim.“',
    'Piši samo na osnovu podataka koje dobiješ (uloga, firma, šta nudi, šta traži, poklapanje). Ne izmišljaj potrebe, brojke ni detalje o firmama.',
    'I openers: tačno dve kratke prve poruke na srpskom, prirodne, do 200 znakova, bez laskanja.',
    'Odgovor je samo JSON niz objekata sa user_id, why i openers.',
    JSON.stringify(people),
  ].join('\n');
}

function parseCopy(raw: string, allowed: Set<string>): Map<string, Copy> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const copy = new Map<string, Copy>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') return null;
    const row = item as { user_id?: unknown; why?: unknown; openers?: unknown };
    if (typeof row.user_id !== 'string' || !allowed.has(row.user_id)) return null;
    if (typeof row.why !== 'string' || !row.why.trim()) return null;
    if (!Array.isArray(row.openers)) return null;
    const openers = row.openers.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).slice(0, 2).map(clip);
    if (openers.length < 2) return null;
    copy.set(row.user_id, { why: clip(row.why), openers: [openers[0], openers[1]] });
  }
  return copy;
}

function clip(text: string): string {
  const value = text.trim();
  if (value.length <= 200) return value;
  return `${value.slice(0, 199)}…`;
}

function startOfZonedDay(timeZone: string, now = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const midnight = new Date(`${day}T00:00:00.000Z`);
  const offset = zoneOffset(timeZone, midnight);
  let start = new Date(midnight.getTime() - offset);
  const atStart = zoneOffset(timeZone, start);
  if (atStart !== offset) start = new Date(midnight.getTime() - atStart);
  return start.toISOString();
}

function zoneOffset(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  let hour = pick('hour');
  if (hour === 24) hour = 0;
  return Date.UTC(pick('year'), pick('month') - 1, pick('day'), hour, pick('minute'), pick('second')) - date.getTime();
}
