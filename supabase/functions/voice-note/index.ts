import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { draftFromText, transcribeAudio } from './gemini.ts';

const dailyLimit = 20;
const maxAudioChars = 2_000_000;
const zone = 'Europe/Belgrade';
const allowedMime = new Set(['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/x-m4a']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Snimak nije stigao. Pokušaj ponovo.' }, 400);

  try {
    const admin = serviceClient();
    const userId = await callerId(admin, request);
    if (!userId) return json({ error: 'Nisi prijavljen.' }, 401);

    const body = await readBody(request);
    if ('error' in body) return json({ error: body.error }, 400);

    const since = startOfZonedDay(zone);
    const { data: runs, error: countError } = await admin
      .from('voice_note_runs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since);
    if (countError) throw countError;
    if ((runs?.length ?? 0) >= dailyLimit) {
      const limit = body.kind === 'text'
        ? 'Danas je već iskorišćeno dvadeset nacrta. Pokušaj ponovo sutra.'
        : 'Danas je već iskorišćeno dvadeset glasovnih beleški. Pokušaj ponovo sutra.';
      return json({ error: limit }, 429);
    }

    const { error: runError } = await admin.from('voice_note_runs').insert({ user_id: userId });
    if (runError) throw runError;

    // Snimak i tekst žive samo u ovom zahtevu. Ne idu u Storage ni u tabelu. Ostaje dnevni brojač.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (body.kind === 'text') {
      const mail = await draftFromText(body.text, body.name, body.company, body.event, body.tone);
      if (!mail) return json({ error: 'Nacrt nije napisan. Proveri belešku i pokušaj ponovo.' }, 422);
      return json({ note: body.text, topic: '', follow_up_date: null, email_subject: mail.subject, email_body: mail.body, full_name: body.name, job_title: '', company: body.company, email: '', phone: '' });
    }
    const draft = await transcribeAudio(body.audio, body.mime, today);
    if (!draft) return json({ error: 'Nisam razumeo snimak. Govori bliže mikrofonu i pokušaj ponovo.' }, 422);

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
    return json({ error: 'Beleška nije obrađena. Pokušaj ponovo.' }, 500);
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

type Incoming =
  | { kind: 'audio'; audio: string; mime: string }
  | { kind: 'text'; text: string; name: string; company: string; event: string; tone: string }
  | { error: string };

async function readBody(request: Request): Promise<Incoming> {
  let body: { audio_base64?: unknown; mime_type?: unknown; text?: unknown; name?: unknown; company?: unknown; event?: unknown; tone?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { error: 'Poruka nije stigla. Pokušaj ponovo.' };
  }
  if (typeof body.text === 'string') {
    const text = body.text.trim();
    if (!text) return { error: 'Napiši belešku pa pokušaj ponovo.' };
    if (text.length > 4000) return { error: 'Beleška je predugačka. Skrati je i pokušaj ponovo.' };
    const tone = body.tone === 'shorter' || body.tone === 'formal' ? body.tone : 'plain';
    return { kind: 'text', text, name: clipField(body.name), company: clipField(body.company), event: clipField(body.event), tone };
  }
  const mime = typeof body.mime_type === 'string' ? body.mime_type.trim().toLowerCase() : '';
  const audio = typeof body.audio_base64 === 'string' ? body.audio_base64.replace(/\s/g, '') : '';
  if (!allowedMime.has(mime)) return { error: 'Format snimka nije podržan. Snimi belešku ponovo.' };
  if (!audio) return { error: 'Snimak je prazan. Pritisni Snimi i govori do 30 sekundi.' };
  if (audio.length > maxAudioChars) return { error: 'Snimak je predugačak. Snimi najviše 30 sekundi.' };
  return { kind: 'audio', audio, mime };
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
