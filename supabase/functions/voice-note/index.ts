import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { transcribeAudio } from './gemini.ts';

const dailyLimit = 5;
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

    const payload = await readAudio(request);
    if ('error' in payload) return json({ error: payload.error }, 400);

    const since = startOfZonedDay(zone);
    const { data: runs, error: countError } = await admin
      .from('voice_note_runs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since);
    if (countError) throw countError;
    if ((runs?.length ?? 0) >= dailyLimit) {
      return json({ error: 'Danas je već iskorišćeno pet glasovnih beleški. Pokušaj ponovo sutra.' }, 429);
    }

    const { error: runError } = await admin.from('voice_note_runs').insert({ user_id: userId });
    if (runError) throw runError;

    // Snimak živi samo u ovom zahtevu. Ne ide u Storage ni u tabelu.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const draft = await transcribeAudio(payload.audio, payload.mime, today);
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

async function readAudio(request: Request): Promise<{ audio: string; mime: string } | { error: string }> {
  let body: { audio_base64?: unknown; mime_type?: unknown };
  try {
    body = (await request.json()) as { audio_base64?: unknown; mime_type?: unknown };
  } catch {
    return { error: 'Snimak nije stigao. Pokušaj ponovo.' };
  }
  const mime = typeof body.mime_type === 'string' ? body.mime_type.trim().toLowerCase() : '';
  const audio = typeof body.audio_base64 === 'string' ? body.audio_base64.replace(/\s/g, '') : '';
  if (!allowedMime.has(mime)) return { error: 'Format snimka nije podržan. Snimi belešku ponovo.' };
  if (!audio) return { error: 'Snimak je prazan. Pritisni Snimi i govori do 30 sekundi.' };
  if (audio.length > maxAudioChars) return { error: 'Snimak je predugačak. Snimi najviše 30 sekundi.' };
  return { audio, mime };
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
