// Provera razmene kontakta: npx tsx scripts/try-swap.ts
// Traži migraciju 007. Čita scripts/.env. Service role ostaje ovde.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const summitSlug = 'startup-revolution-ai-summit';
const ivanEmail = 'test-ivan@skript.test';
const lucaEmail = 'test-luca@skript.test';
const scriptDir = dirname(fileURLToPath(import.meta.url));

type Check = { Provera: string; Rezultat: 'PROŠLO' | 'PALO' };

function loadEnv(path: string): Record<string, string> {
  const text = readFileSync(path, 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function required(env: Record<string, string>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`U scripts/.env nedostaje ${key}.`);
  return value;
}

async function userId(admin: SupabaseClient, email: string): Promise<string> {
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`Nalog ${email} ne postoji.`);
}

async function signIn(url: string, anonKey: string, email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

function code(): string {
  return randomBytes(16).toString('hex');
}

async function main() {
  const env = loadEnv(join(scriptDir, '.env'));
  const url = required(env, 'SUPABASE_URL');
  const admin = createClient(url, required(env, 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: events, error: eventError } = await admin.from('events').select('id, slug');
  if (eventError) throw new Error(eventError.message);
  const summit = (events ?? []).find((item) => item.slug === summitSlug);
  if (!summit) throw new Error(`Event ${summitSlug} nije u bazi.`);
  const other = (events ?? []).find((item) => item.id !== summit.id);
  const ivanId = await userId(admin, ivanEmail);
  const lucaId = await userId(admin, lucaEmail);
  const ivan = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), ivanEmail, required(env, 'TEST_PASSWORD'));
  const luca = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), lucaEmail, required(env, 'TEST_PASSWORD'));

  const [{ data: links }, { data: people }] = await Promise.all([
    admin.from('connections').select('*').eq('event_id', summit.id).or(`and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId}),and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId})`),
    admin.from('contacts').select('*').or(`and(owner_id.eq.${ivanId},contact_user_id.eq.${lucaId}),and(owner_id.eq.${lucaId},contact_user_id.eq.${ivanId})`),
  ]);
  const savedLinks = links ?? [];
  const savedPeople = people ?? [];
  const checks: Check[] = [];

  try {
    await admin.from('connections').delete().eq('event_id', summit.id).or(`and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId}),and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId})`);
    await admin.from('contacts').delete().or(`and(owner_id.eq.${ivanId},contact_user_id.eq.${lucaId}),and(owner_id.eq.${lucaId},contact_user_id.eq.${ivanId})`);

    const denied = await luca.from('connections').insert({ event_id: summit.id, requester_id: lucaId, receiver_id: ivanId, status: 'accepted', source: 'qr' });
    checks.push({ Provera: 'klijent ne sme sam da upiše accepted', Rezultat: denied.error ? 'PROŠLO' : 'PALO' });

    const valid = code();
    const issued = await ivan.from('swap_tokens').insert({ event_id: summit.id, token: valid });
    const swapped = await luca.rpc('swap_contact', { token: valid });
    const [{ data: connection }, { data: ivanContact }, { data: lucaContact }] = await Promise.all([
      admin.from('connections').select('status, source').eq('event_id', summit.id).or(`and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId}),and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId})`),
      ivan.from('contacts').select('id').eq('contact_user_id', lucaId),
      luca.from('contacts').select('id').eq('contact_user_id', ivanId),
    ]);
    const row = (connection ?? [])[0] as { status?: string; source?: string } | undefined;
    checks.push({
      Provera: 'važeći token pravi vezu i kontakte za oba',
      Rezultat: !issued.error && !swapped.error && row?.status === 'accepted' && row.source === 'qr' && (ivanContact ?? []).length > 0 && (lucaContact ?? []).length > 0 ? 'PROŠLO' : 'PALO',
    });

    const expired = code();
    await ivan.from('swap_tokens').insert({ event_id: summit.id, token: expired });
    await admin.from('swap_tokens').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('token', expired);
    const late = await luca.rpc('swap_contact', { token: expired });
    checks.push({ Provera: 'istekao token ne prolazi', Rezultat: late.error ? 'PROŠLO' : 'PALO' });

    if (!other) {
      checks.push({ Provera: 'token sa drugog eventa ne prolazi', Rezultat: 'PALO' });
    } else {
      const foreign = code();
      const { error: foreignInsert } = await admin.from('swap_tokens').insert({ owner_id: ivanId, event_id: other.id, token: foreign, expires_at: new Date(Date.now() + 60_000).toISOString() });
      const wrong = await luca.rpc('swap_contact', { token: foreign });
      checks.push({ Provera: 'token sa drugog eventa ne prolazi', Rezultat: !foreignInsert && wrong.error ? 'PROŠLO' : 'PALO' });
    }
  } finally {
    await admin.from('swap_tokens').delete().eq('owner_id', ivanId);
    await admin.from('connections').delete().eq('event_id', summit.id).or(`and(requester_id.eq.${ivanId},receiver_id.eq.${lucaId}),and(requester_id.eq.${lucaId},receiver_id.eq.${ivanId})`);
    await admin.from('contacts').delete().or(`and(owner_id.eq.${ivanId},contact_user_id.eq.${lucaId}),and(owner_id.eq.${lucaId},contact_user_id.eq.${ivanId})`);
    if (savedPeople.length > 0) await admin.from('contacts').insert(savedPeople.map(({ id: _id, ...person }) => person));
    if (savedLinks.length > 0) await admin.from('connections').insert(savedLinks.map(({ id: _id, ...link }) => link));
  }

  console.table(checks);
  if (checks.some((check) => check.Rezultat === 'PALO')) process.exitCode = 1;
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : 'Provera nije uspela.');
  process.exitCode = 1;
});
