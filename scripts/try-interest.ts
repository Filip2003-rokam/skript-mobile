// Provera obostranog interesovanja: npx tsx scripts/try-interest.ts
// Čita scripts/.env. Service role ključ ostaje ovde i ne ide u aplikaciju.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const summitSlug = 'startup-revolution-ai-summit';
const ivanEmail = 'test-ivan@skript.test';
const lucaEmail = 'test-luca@skript.test';
const extraEmails = [
  'test-jonas@skript.test',
  'test-lara@skript.test',
  'test-marko@skript.test',
  'test-mina@skript.test',
  'test-niko@skript.test',
  'test-petra@skript.test',
];
const limitMessage = 'Imaš već 5 otvorenih interesovanja. Povuci jedno pa pokušaj ponovo.';
const scriptDir = dirname(fileURLToPath(import.meta.url));

type Check = { Provera: string; Rezultat: 'PROŠLO' | 'PALO' };
type InterestRow = { id: string; event_id: string; user_id: string; target_user_id: string; kind: string; created_at: string };
type ConnectionRow = {
  id: string;
  event_id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  message: string | null;
  source: string;
  created_at: string;
  responded_at: string | null;
};
type ContactRow = {
  id: string;
  owner_id: string;
  contact_user_id: string | null;
  event_id: string | null;
  full_name: string;
  job_title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  note: string | null;
  follow_up_date: string | null;
  follow_up_done: boolean;
};

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

function row(label: string, ok: boolean): Check {
  return { Provera: label, Rezultat: ok ? 'PROŠLO' : 'PALO' };
}

async function userIdByEmail(admin: SupabaseClient, email: string): Promise<string> {
  const perPage = 200;
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < perPage) break;
  }
  throw new Error(`Nalog ${email} ne postoji.`);
}

async function signIn(url: string, anonKey: string, email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

function errorText(error: { message?: string; details?: string; hint?: string } | null): string {
  if (!error) return '';
  return `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
}

async function main() {
  const env = loadEnv(join(scriptDir, '.env'));
  const url = required(env, 'SUPABASE_URL');
  const password = required(env, 'TEST_PASSWORD');
  const admin = createClient(url, required(env, 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: event, error: eventError } = await admin.from('events').select('id').eq('slug', summitSlug).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error(`Event ${summitSlug} nije u bazi.`);
  const eventId = event.id as string;

  const ivanId = await userIdByEmail(admin, ivanEmail);
  const lucaId = await userIdByEmail(admin, lucaEmail);
  const extraIds: string[] = [];
  for (const email of extraEmails) extraIds.push(await userIdByEmail(admin, email));

  const [{ data: interests, error: interestError }, { data: connections, error: connectionError }, { data: contacts, error: contactError }] =
    await Promise.all([
      admin.from('interests').select('*').eq('event_id', eventId).or(`user_id.eq.${ivanId},target_user_id.eq.${ivanId}`),
      admin.from('connections').select('*').eq('event_id', eventId).or(`requester_id.eq.${ivanId},receiver_id.eq.${ivanId}`),
      admin.from('contacts').select('*').or(`owner_id.eq.${ivanId},contact_user_id.eq.${ivanId}`),
    ]);
  if (interestError) throw new Error(interestError.message);
  if (connectionError) throw new Error(connectionError.message);
  if (contactError) throw new Error(contactError.message);

  const savedInterests = (interests ?? []) as InterestRow[];
  const savedConnections = (connections ?? []) as ConnectionRow[];
  const savedContacts = (contacts ?? []) as ContactRow[];

  const checks: Check[] = [];
  try {
    await clearIvan(admin, eventId, ivanId);

    const ivan = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), ivanEmail, password);
    const luca = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), lucaEmail, password);

    const ivanClick = await ivan.from('interests').insert({
      event_id: eventId,
      user_id: ivanId,
      target_user_id: lucaId,
      kind: 'interested',
    });
    checks.push(row('Ivan klikne Zainteresovan na Lucu', !ivanClick.error));

    const [seen, requests] = await Promise.all([
      luca.from('interests').select('id, user_id').eq('event_id', eventId).eq('user_id', ivanId),
      luca.from('connections').select('id').eq('event_id', eventId).or(`and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId}),and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId})`),
    ]);
    checks.push(row('Luca ne vidi Ivanov red u interests', !seen.error && (seen.data ?? []).length === 0));
    checks.push(row('Luca nema zahtev od Ivana', !requests.error && (requests.data ?? []).length === 0));

    const lucaClick = await luca.from('interests').insert({
      event_id: eventId,
      user_id: lucaId,
      target_user_id: ivanId,
      kind: 'interested',
    });
    const [link, ivanContact, lucaContact] = await Promise.all([
      admin
        .from('connections')
        .select('id, status')
        .eq('event_id', eventId)
        .or(`and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId}),and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId})`),
      ivan.from('contacts').select('id').eq('contact_user_id', lucaId),
      luca.from('contacts').select('id').eq('contact_user_id', ivanId),
    ]);
    const accepted = ((link.data ?? []) as { status: string }[]).some((item) => item.status === 'accepted');
    checks.push(row('posle Lucinog klika postoji prihvaćena veza', !lucaClick.error && !link.error && accepted));
    checks.push(row('Ivan ima kontakt za Lucu', !ivanContact.error && (ivanContact.data ?? []).length > 0));
    checks.push(row('Luca ima kontakt za Ivana', !lucaContact.error && (lucaContact.data ?? []).length > 0));

    let sixth = '';
    for (let index = 0; index < extraIds.length; index += 1) {
      const inserted = await ivan.from('interests').insert({
        event_id: eventId,
        user_id: ivanId,
        target_user_id: extraIds[index],
        kind: 'interested',
      });
      if (index < 5) {
        checks.push(row(`Ivanovo interesovanje ${index + 1} od 5`, !inserted.error));
      } else {
        sixth = errorText(inserted.error);
      }
    }
    checks.push(row('šesto interesovanje vraća srpsku poruku', sixth.includes(limitMessage)));
  } finally {
    await restore(admin, eventId, ivanId, savedInterests, savedConnections, savedContacts);
  }

  console.table(checks);
  if (checks.some((check) => check.Rezultat === 'PALO')) process.exitCode = 1;
}

async function clearIvan(admin: SupabaseClient, eventId: string, ivanId: string) {
  const [interests, connections, contacts] = await Promise.all([
    admin.from('interests').delete().eq('event_id', eventId).or(`user_id.eq.${ivanId},target_user_id.eq.${ivanId}`),
    admin.from('connections').delete().eq('event_id', eventId).or(`requester_id.eq.${ivanId},receiver_id.eq.${ivanId}`),
    admin.from('contacts').delete().or(`owner_id.eq.${ivanId},contact_user_id.eq.${ivanId}`),
  ]);
  if (interests.error) throw new Error(interests.error.message);
  if (connections.error) throw new Error(connections.error.message);
  if (contacts.error) throw new Error(contacts.error.message);
}

async function restore(
  admin: SupabaseClient,
  eventId: string,
  ivanId: string,
  interests: InterestRow[],
  connections: ConnectionRow[],
  contacts: ContactRow[],
) {
  await clearIvan(admin, eventId, ivanId);
  if (contacts.length > 0) {
    const { error } = await admin.from('contacts').insert(contacts.map(({ id: _id, ...contact }) => contact));
    if (error) throw new Error(error.message);
  }
  if (connections.length > 0) {
    const { error } = await admin.from('connections').insert(
      connections.map(({ id: _id, ...connection }) => connection),
    );
    if (error) throw new Error(error.message);
  }
  if (interests.length > 0) {
    const { error } = await admin.from('interests').insert(interests.map(({ id: _id, ...interest }) => interest));
    if (error) throw new Error(error.message);
  }

  const [freshConnections, freshContacts] = await Promise.all([
    admin.from('connections').select('id, requester_id, receiver_id, status').eq('event_id', eventId).or(`requester_id.eq.${ivanId},receiver_id.eq.${ivanId}`),
    admin.from('contacts').select('id, owner_id, contact_user_id').or(`owner_id.eq.${ivanId},contact_user_id.eq.${ivanId}`),
  ]);
  if (freshConnections.error) throw new Error(freshConnections.error.message);
  if (freshContacts.error) throw new Error(freshContacts.error.message);

  const keepLinks = new Set(connections.map((item) => `${item.requester_id}:${item.receiver_id}:${item.status}`));
  const extraLinks = ((freshConnections.data ?? []) as { id: string; requester_id: string; receiver_id: string; status: string }[])
    .filter((item) => !keepLinks.has(`${item.requester_id}:${item.receiver_id}:${item.status}`))
    .map((item) => item.id);
  if (extraLinks.length > 0) {
    const { error } = await admin.from('connections').delete().in('id', extraLinks);
    if (error) throw new Error(error.message);
  }

  const keepContacts = new Set(contacts.map((item) => `${item.owner_id}:${item.contact_user_id ?? ''}`));
  const extraContacts = ((freshContacts.data ?? []) as { id: string; owner_id: string; contact_user_id: string | null }[])
    .filter((item) => !keepContacts.has(`${item.owner_id}:${item.contact_user_id ?? ''}`))
    .map((item) => item.id);
  if (extraContacts.length > 0) {
    const { error } = await admin.from('contacts').delete().in('id', extraContacts);
    if (error) throw new Error(error.message);
  }
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : 'Provera nije uspela.';
  console.error(message);
  process.exitCode = 1;
});
