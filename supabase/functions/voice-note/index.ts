import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { draftFromText, transcribeAudio, type Lang } from './gemini.ts';

const dailyLimit = 20;
const maxAudioChars = 2_000_000;
const zone = 'Europe/Belgrade';
const allowedMime = new Set(['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/x-m4a']);
// Poruke za telefon, na jeziku koji aplikacija pošalje (lang).
const messages: Record<Lang, Record<string, string>> = {
  sr: {
    noAudio: 'Snimak nije stigao. Pokušaj ponovo.',
    signedOut: 'Nisi prijavljen.',
    limitText: 'Danas je već iskorišćeno dvadeset nacrta. Pokušaj ponovo sutra.',
    limitAudio: 'Danas je već iskorišćeno dvadeset glasovnih beleški. Pokušaj ponovo sutra.',
    noDraft: 'Nacrt nije napisan. Proveri belešku i pokušaj ponovo.',
    notUnderstood: 'Nisam razumeo snimak. Govori bliže mikrofonu i pokušaj ponovo.',
    failed: 'Beleška nije obrađena. Pokušaj ponovo.',
    noMessage: 'Poruka nije stigla. Pokušaj ponovo.',
    emptyNote: 'Napiši belešku pa pokušaj ponovo.',
    longNote: 'Beleška je predugačka. Skrati je i pokušaj ponovo.',
    format: 'Format snimka nije podržan. Snimi belešku ponovo.',
    empty: 'Snimak je prazan. Pritisni Snimi i govori do 30 sekundi.',
    long: 'Snimak je predugačak. Snimi najviše 30 sekundi.',
  },
  en: {
    noAudio: 'The recording did not arrive. Try again.',
    signedOut: 'You are not signed in.',
    limitText: 'You already used twenty drafts today. Try again tomorrow.',
    limitAudio: 'You already used twenty voice notes today. Try again tomorrow.',
    noDraft: 'The draft was not written. Check the note and try again.',
    notUnderstood: 'I did not understand the recording. Speak closer to the microphone and try again.',
    failed: 'The note was not processed. Try again.',
    noMessage: 'The message did not arrive. Try again.',
    emptyNote: 'Write a note, then try again.',
    longNote: 'The note is too long. Shorten it and try again.',
    format: 'This recording format is not supported. Record the note again.',
    empty: 'The recording is empty. Tap Record and speak for up to 30 seconds.',
    long: 'The recording is too long. Record at most 30 seconds.',
  },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: messages.sr.noAudio }, 400);

  let lang: Lang = 'sr';
  try {
    const admin = serviceClient();
    const body = await readBody(request);
    lang = body.lang;
    const m = messages[lang];
    const userId = await callerId(admin, request);
    if (!userId) return json({ error: m.signedOut }, 401);
    if ('error' in body) return json({ error: m[body.error] }, 400);

    const since = startOfZonedDay(zone);
    const { data: runs, error: countError } = await admin
      .from('voice_note_runs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since);
    if (countError) throw countError;
    if ((runs?.length ?? 0) >= dailyLimit) {
      const limit = body.kind === 'text' ? m.limitText : m.limitAudio;
      return json({ error: limit }, 429);
    }

    const { error: runError } = await admin.from('voice_note_runs').insert({ user_id: userId });
    if (runError) throw runError;

    // Snimak i tekst žive samo u ovom zahtevu. Ne idu u Storage ni u tabelu. Ostaje dnevni brojač.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (body.kind === 'text') {
      const mail = await draftFromText(body.text, body.name, body.company, body.event, body.tone, lang);
      if (!mail) return json({ error: m.noDraft }, 422);
      return json({ note: body.text, topic: '', follow_up_date: null, email_subject: mail.subject, email_body: mail.body, full_name: body.name, job_title: '', company: body.company, email: '', phone: '' });
    }
    const draft = await transcribeAudio(body.audio, body.mime, today, lang);
    if (!draft) return json({ error: m.notUnderstood }, 422);

    return json({
      note: draft.note,
      topic: draft.topic,
      follow_up_date: draft.followUpDate ?? suggestDate(today),
      email_subject: draft.subject,
      email_body: draft.body,
      full_name: draft.fullName,
      job_title: draft.jobTitle,
      company: draft.company,
      email: draft.email,
      phone: draft.phone,
    });
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : cause);
    return json({ error: messages[lang].failed }, 500);
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

type ErrorKey = 'noMessage' | 'emptyNote' | 'longNote' | 'format' | 'empty' | 'long';
type Incoming = { lang: Lang } & (
  | { kind: 'audio'; audio: string; mime: string }
  | { kind: 'text'; text: string; name: string; company: string; event: string; tone: string }
  | { error: ErrorKey }
);

async function readBody(request: Request): Promise<Incoming> {
  let body: { audio_base64?: unknown; mime_type?: unknown; text?: unknown; name?: unknown; company?: unknown; event?: unknown; tone?: unknown; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { lang: 'sr', error: 'noMessage' };
  }
  const lang: Lang = body.lang === 'en' ? 'en' : 'sr';
  if (typeof body.text === 'string') {
    const text = body.text.trim();
    if (!text) return { lang, error: 'emptyNote' };
    if (text.length > 4000) return { lang, error: 'longNote' };
    const tone = body.tone === 'shorter' || body.tone === 'formal' ? body.tone : 'plain';
    return { lang, kind: 'text', text, name: clipField(body.name), company: clipField(body.company), event: clipField(body.event), tone };
  }
  const mime = typeof body.mime_type === 'string' ? body.mime_type.trim().toLowerCase() : '';
  const audio = typeof body.audio_base64 === 'string' ? body.audio_base64.replace(/\s/g, '') : '';
  if (!allowedMime.has(mime)) return { lang, error: 'format' };
  if (!audio) return { lang, error: 'empty' };
  if (audio.length > maxAudioChars) return { lang, error: 'long' };
  return { lang, kind: 'audio', audio, mime };
}

function clipField(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

function suggestDate(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  let added = 0;
  while (added < 3) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  const monthText = String(cursor.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(cursor.getUTCDate()).padStart(2, '0');
  return `${cursor.getUTCFullYear()}-${monthText}-${dayText}`;
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
