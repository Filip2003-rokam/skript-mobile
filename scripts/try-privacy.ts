// Provera privatnosti: npx tsx scripts/try-privacy.ts
// Čita scripts/.env. Service role ključ ostaje ovde i ne ide u aplikaciju.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const summitSlug = 'startup-revolution-ai-summit';
const foundersSlug = 'founders-week-belgrade';
const ivanEmail = 'test-ivan@skript.test';
const privacyEmail = 'test-privacy@skript.test';
const scriptDir = dirname(fileURLToPath(import.meta.url));

type Check = { Nalog: string; Provera: string; Rezultat: 'PROŠLO' | 'PALO' };

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

async function userIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function ensurePrivacyUser(admin: SupabaseClient, password: string, eventId: string): Promise<string> {
  let userId = await userIdByEmail(admin, privacyEmail);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: privacyEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Privacy' },
    });
    if (error) throw new Error(error.message);
    userId = data.user?.id ?? null;
  }
  if (!userId) throw new Error(`Nalog ${privacyEmail} nije napravljen.`);

  const { error: deleteError } = await admin.from('event_attendees').delete().eq('user_id', userId).neq('event_id', eventId);
  if (deleteError) throw new Error(deleteError.message);

  const { data: existing, error: existingError } = await admin
    .from('event_attendees')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return userId;

  const { error } = await admin.from('event_attendees').insert({
    event_id: eventId,
    user_id: userId,
    why: ['Learn'],
    role: 'Other',
    company: 'Skript',
    offers: [],
    needs: [],
    in_room: false,
  });
  if (error) throw new Error(error.message);
  return userId;
}

async function signIn(url: string, anonKey: string, email: string, password: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  const userId = data.user?.id;
  if (!userId) throw new Error(`${email}: prijava nema nalog.`);
  return { client, userId };
}

async function eventId(admin: SupabaseClient, slug: string): Promise<string> {
  const { data, error } = await admin.from('events').select('id').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Event ${slug} nije u bazi.`);
  return data.id;
}

function row(email: string, label: string, ok: boolean): Check {
  return { Nalog: email, Provera: label, Rezultat: ok ? 'PROŠLO' : 'PALO' };
}

async function checksFor(
  email: string,
  client: SupabaseClient,
  userId: string,
  ownEventId: string,
  otherEventId: string,
  otherUserId: string,
  ownLabel: string,
  otherLabel: string,
): Promise<Check[]> {
  const [ownAttendees, otherAttendees, otherProfile, priv] = await Promise.all([
    client.from('event_attendees').select('user_id').eq('event_id', ownEventId),
    client.from('event_attendees').select('user_id').eq('event_id', otherEventId),
    client.from('profiles').select('id').eq('id', otherUserId).maybeSingle(),
    client.from('profile_private').select('user_id'),
  ]);

  const seesOwn =
    !ownAttendees.error &&
    (ownAttendees.data ?? []).some((attendee) => attendee.user_id === userId) &&
    (ownAttendees.data ?? []).every((attendee) => attendee.user_id !== otherUserId);
  const hidesOtherEvent = !otherAttendees.error && (otherAttendees.data ?? []).length === 0;
  const hidesOtherProfile = !otherProfile.error && otherProfile.data == null;
  const privateRows = priv.data ?? [];
  const onlyOwnPrivate = !priv.error && privateRows.length === 1 && privateRows[0]?.user_id === userId;

  return [
    row(email, `vidi učesnike ${ownLabel}`, seesOwn),
    row(email, `ne vidi učesnike ${otherLabel}`, hidesOtherEvent),
    row(email, 'ne vidi profil onog drugog', hidesOtherProfile),
    row(email, 'profile_private samo njegov red', onlyOwnPrivate),
  ];
}

async function main() {
  const env = loadEnv(join(scriptDir, '.env'));
  const url = required(env, 'SUPABASE_URL');
  const password = required(env, 'TEST_PASSWORD');
  const admin = createClient(url, required(env, 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const summitId = await eventId(admin, summitSlug);
  const foundersId = await eventId(admin, foundersSlug);
  const privacyId = await ensurePrivacyUser(admin, password, foundersId);

  const ivan = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), ivanEmail, password);
  const privacy = await signIn(url, required(env, 'SUPABASE_ANON_KEY'), privacyEmail, password);

  const checks = [
    ...(await checksFor(ivanEmail, ivan.client, ivan.userId, summitId, foundersId, privacyId, 'Summita', 'Founders Week')),
    ...(await checksFor(privacyEmail, privacy.client, privacy.userId, foundersId, summitId, ivan.userId, 'Founders Week', 'Summita')),
  ];

  console.table(checks);
  if (checks.some((check) => check.Rezultat === 'PALO')) process.exitCode = 1;
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : 'Provera nije uspela.';
  console.error(message);
  process.exitCode = 1;
});
