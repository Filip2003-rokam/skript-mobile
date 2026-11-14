// Lokalni demo za nalog iz MY_EMAIL: npx tsx scripts/seed-my-demo.ts
// Čita scripts/.env. Service role ključ ostaje ovde i ne ide u aplikaciju.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const summitSlug = 'startup-revolution-ai-summit';
const scriptDir = dirname(fileURLToPath(import.meta.url));

const incoming = [
  { id: 'tom', name: 'Tom Becker' },
  { id: 'sofia', name: 'Sofia Reed' },
] as const;

const saved = [
  { id: 'niko', name: 'Niko Varga' },
  { id: 'luca', name: 'Luca Weiss' },
] as const;

const manual = [
  { name: 'Lena Kovač', company: 'Severni studio', email: 'lena.kovac@example.com', followUp: true },
  { name: 'Dunja Petrović', company: 'Atelje Reka', email: 'dunja.petrovic@example.com', followUp: false },
] as const;

type Row = { Šta: string; Stanje: string };

function loadEnv(path: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error('Nema scripts/.env. Kopiraj scripts/.env.example i popuni ga.');
  }
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function required(env: Record<string, string>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`U scripts/.env nedostaje ${key}.`);
  return value;
}

function loginEmail(id: string): string {
  return `test-${id}@skript.test`;
}

function tomorrow(): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

async function listUsers(supabase: SupabaseClient): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  const perPage = 200;
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    }
    if (data.users.length < perPage) return byEmail;
  }
  return byEmail;
}

function userId(users: Map<string, string>, email: string, label: string): string {
  const id = users.get(email.toLowerCase());
  if (!id) throw new Error(`${label} nema nalog (${email}).`);
  return id;
}

async function incomingInterest(supabase: SupabaseClient, eventId: string, me: string, fromId: string, name: string, rows: Row[]) {
  const { data: existing, error: existingError } = await supabase
    .from('interests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', fromId)
    .eq('target_user_id', me)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    rows.push({ Šta: `Interesovanje od ${name}`, Stanje: 'već postoji' });
    return;
  }

  const { error } = await supabase.from('interests').insert({
    event_id: eventId,
    user_id: fromId,
    target_user_id: me,
    kind: 'interested',
  });
  if (error) throw new Error(error.message);
  rows.push({ Šta: `Interesovanje od ${name}`, Stanje: 'upisano, slepo' });
}

async function ensureInterest(supabase: SupabaseClient, eventId: string, userId: string, targetId: string) {
  const { data: existing, error: existingError } = await supabase
    .from('interests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('target_user_id', targetId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return;

  const { error } = await supabase.from('interests').insert({
    event_id: eventId,
    user_id: userId,
    target_user_id: targetId,
    kind: 'interested',
  });
  if (error?.code === '23505') return;
  if (error) throw new Error(error.message);
}

async function connectJonas(supabase: SupabaseClient, eventId: string, me: string, jonasId: string, rows: Row[]) {
  const [forward, backward] = await Promise.all([
    supabase.from('connections').select('id, status').eq('event_id', eventId).eq('requester_id', me).eq('receiver_id', jonasId).maybeSingle(),
    supabase.from('connections').select('id, status').eq('event_id', eventId).eq('requester_id', jonasId).eq('receiver_id', me).maybeSingle(),
  ]);
  if (forward.error) throw new Error(forward.error.message);
  if (backward.error) throw new Error(backward.error.message);
  const status = (forward.data?.status ?? backward.data?.status) as string | undefined;
  if (status === 'accepted') {
    rows.push({ Šta: 'Veza sa Jonasom Weberom', Stanje: 'već prihvaćena' });
    return;
  }
  if (status) {
    rows.push({ Šta: 'Veza sa Jonasom Weberom', Stanje: `postoji kao ${status}, nisam dirao` });
    return;
  }

  await ensureInterest(supabase, eventId, me, jonasId);
  await ensureInterest(supabase, eventId, jonasId, me);
  rows.push({ Šta: 'Veza sa Jonasom Weberom', Stanje: 'oba interesovanja, prihvaćena ako je triger prošao' });
}

async function savePerson(supabase: SupabaseClient, eventId: string, me: string, savedId: string, name: string, rows: Row[]) {
  const { error } = await supabase.from('saved_people').insert({
    user_id: me,
    event_id: eventId,
    saved_user_id: savedId,
  });
  if (error?.code === '23505') {
    rows.push({ Šta: `Sačuvan ${name}`, Stanje: 'već postoji' });
    return;
  }
  if (error) throw new Error(error.message);
  rows.push({ Šta: `Sačuvan ${name}`, Stanje: 'upisan' });
}

async function manualContact(
  supabase: SupabaseClient,
  eventId: string,
  me: string,
  person: (typeof manual)[number],
  followUpDate: string,
  rows: Row[],
) {
  const { data: existing, error: existingError } = await supabase
    .from('contacts')
    .select('id')
    .eq('owner_id', me)
    .eq('email', person.email)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    rows.push({ Šta: `Kontakt ${person.name}`, Stanje: 'već postoji' });
    return;
  }

  const { error } = await supabase.from('contacts').insert({
    owner_id: me,
    contact_user_id: null,
    event_id: eventId,
    full_name: person.name,
    company: person.company,
    email: person.email,
    follow_up_date: person.followUp ? followUpDate : null,
    follow_up_done: false,
  });
  if (error) throw new Error(error.message);
  rows.push({ Šta: `Kontakt ${person.name}`, Stanje: person.followUp ? `upisan, follow-up ${followUpDate}` : 'upisan' });
}

async function main() {
  const env = loadEnv(join(scriptDir, '.env'));
  const myEmail = required(env, 'MY_EMAIL').toLowerCase();
  const supabase = createClient(required(env, 'SUPABASE_URL'), required(env, 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: event, error: eventError } = await supabase.from('events').select('id').eq('slug', summitSlug).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error(`Event ${summitSlug} nije u bazi.`);

  const users = await listUsers(supabase);
  const me = users.get(myEmail);
  if (!me) {
    console.warn(`Upozorenje: nalog ${myEmail} ne postoji. Ništa nije upisano.`);
    return;
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from('event_attendees')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', me)
    .maybeSingle();
  if (attendanceError) throw new Error(attendanceError.message);
  if (!attendance) {
    console.warn(`Upozorenje: nalog ${myEmail} još nije na eventu. Ništa nije upisano.`);
    return;
  }

  const rows: Row[] = [];
  for (const person of incoming) {
    const fromId = userId(users, loginEmail(person.id), person.name);
    await incomingInterest(supabase, event.id, me, fromId, person.name, rows);
  }

  const jonasId = userId(users, loginEmail('jonas'), 'Jonas Weber');
  await connectJonas(supabase, event.id, me, jonasId, rows);

  for (const person of saved) {
    const savedId = userId(users, loginEmail(person.id), person.name);
    await savePerson(supabase, event.id, me, savedId, person.name, rows);
  }

  const followUpDate = tomorrow();
  for (const person of manual) {
    await manualContact(supabase, event.id, me, person, followUpDate, rows);
  }

  console.table(rows);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Nešto nije uspelo.');
  process.exit(1);
});
