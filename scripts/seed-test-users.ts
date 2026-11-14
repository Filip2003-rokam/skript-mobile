// Lokalni seed: npx tsx scripts/seed-test-users.ts
// Čita scripts/.env. Service role ključ ostaje ovde i ne ide u aplikaciju.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { needOptions, offerOptions, roleOptions } from '../constants/options';
import { testPeople, type DemoPerson, type Kind } from './test-people.ts';

const summitSlug = 'startup-revolution-ai-summit';
const scriptDir = dirname(fileURLToPath(import.meta.url));

type Profile = {
  person: DemoPerson;
  why: string[];
  role: string;
  offers: string[];
  needs: string[];
};

const offerKeys = new Set(offerOptions.map((option) => option.key));
const needKeys = new Set(needOptions.map((option) => option.key));
const roleKeys = new Set(roleOptions.map((option) => option.key));
const whyKeys = new Set(['Sell', 'Find clients', 'Buy', 'Invest', 'Raise', 'Hire', 'Find partners', 'Learn']);

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

function mapWhy(kind: Kind): string[] {
  switch (kind) {
    case 'buyer':
      return ['Buy'];
    case 'agency':
      return ['Sell', 'Find clients'];
    case 'investor':
      return ['Invest'];
    case 'founder':
      return ['Raise'];
    case 'operator':
      return ['Find partners'];
  }
}

function mapRole(person: DemoPerson): string {
  if (person.kind === 'investor') return 'Investor';
  if (person.role === 'Founder') return 'Founder';
  const text = person.role.toLowerCase();
  const closest: [string, string][] = [
    ['product', 'Product'],
    ['partnership', 'Sales'],
    ['sales', 'Sales'],
    ['engineer', 'Engineering'],
    ['developer', 'Engineering'],
    ['growth', 'Marketing'],
    ['market', 'Marketing'],
    ['student', 'Student'],
  ];
  for (const [needle, role] of closest) {
    if (text.includes(needle)) return role;
  }
  return 'Other';
}

function mapOffers(tags: string[]): string[] {
  return tags.filter((tag) => offerKeys.has(tag));
}

function mapNeeds(tags: string[]): string[] {
  return tags.map((tag) => (tag === 'Software development' ? 'Developers' : tag)).filter((tag) => needKeys.has(tag));
}

function profilesFor(people: DemoPerson[]): Profile[] {
  return people.map((person) => {
    const why = mapWhy(person.kind);
    const role = mapRole(person);
    const offers = mapOffers(person.offersTags);
    const needs = mapNeeds(person.needsTags);
    if (!roleKeys.has(role)) throw new Error(`${person.name}: uloga ${role} nije u listi.`);
    for (const value of why) if (!whyKeys.has(value)) throw new Error(`${person.name}: razlog ${value} nije u listi.`);
    for (const value of offers) if (!offerKeys.has(value)) throw new Error(`${person.name}: ponuda ${value} nije u listi.`);
    for (const value of needs) if (!needKeys.has(value)) throw new Error(`${person.name}: potreba ${value} nije u listi.`);
    return { person, why, role, offers, needs };
  });
}

function loginEmail(id: string): string {
  return `test-${id}@skript.test`;
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

async function createAttendee(supabase: SupabaseClient, eventId: string, profile: Profile, userId: string) {
  const { person, why, role, offers, needs } = profile;
  const { data: named, error: nameError } = await supabase.from('profiles').update({ full_name: person.name }).eq('id', userId).select('id');
  if (nameError) throw new Error(nameError.message);
  if (!named?.length) throw new Error(`Profil za ${person.name} nije upisan.`);

  const { data: priv, error: privateError } = await supabase
    .from('profile_private')
    .update({ email: person.email, phone: person.phone })
    .eq('user_id', userId)
    .select('user_id');
  if (privateError) throw new Error(privateError.message);
  if (!priv?.length) throw new Error(`Privatni podaci za ${person.name} nisu upisani.`);

  const { error } = await supabase.from('event_attendees').insert({
    event_id: eventId,
    user_id: userId,
    why,
    role,
    company: person.company,
    offers,
    needs,
    in_room: person.inRoom,
  });
  if (error) throw new Error(error.message);
}

async function main() {
  if (testPeople.length !== 12) throw new Error(`U test-people.ts je ${testPeople.length} osoba, a očekivano je 12.`);
  const people = profilesFor(testPeople);
  const env = loadEnv(join(scriptDir, '.env'));
  const supabase = createClient(required(env, 'SUPABASE_URL'), required(env, 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const password = required(env, 'TEST_PASSWORD');
  const myEmail = env.MY_EMAIL?.trim().toLowerCase() ?? '';

  const { data: event, error: eventError } = await supabase.from('events').select('id').eq('slug', summitSlug).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error(`Event ${summitSlug} nije u bazi.`);

  const users = await listUsers(supabase);
  const rows: { Ime: string; Uloga: string; Firma: string; Traži: string; Nudi: string; Stanje: string }[] = [];

  for (const profile of people) {
    const { person, role, offers, needs } = profile;
    const email = loginEmail(person.id);
    const existing = users.get(email);
    if (existing) {
      console.log(`${person.name} već postoji, preskačem.`);
      rows.push(line(person, role, needs, offers, 'preskočen'));
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: person.name },
    });
    if (error || !data.user) throw new Error(error?.message ?? `Nalog za ${person.name} nije napravljen.`);
    try {
      await createAttendee(supabase, event.id, profile, data.user.id);
    } catch (cause) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
      if (deleteError) console.error(`Nalog ${email} nije obrisan posle greške: ${deleteError.message}`);
      throw cause;
    }
    users.set(email, data.user.id);
    console.log(`${person.name} je napravljen (${email}).`);
    rows.push(line(person, role, needs, offers, 'napravljen'));
  }

  console.table(rows);
  await saveMarkoInterest(supabase, event.id, users, myEmail);
}

function line(person: DemoPerson, role: string, needs: string[], offers: string[], state: string) {
  return {
    Ime: person.name,
    Uloga: role,
    Firma: person.company,
    Traži: needs.join(', ') || '—',
    Nudi: offers.join(', ') || '—',
    Stanje: state,
  };
}

async function saveMarkoInterest(supabase: SupabaseClient, eventId: string, users: Map<string, string>, myEmail: string) {
  if (!myEmail) return;
  const receiverId = users.get(myEmail);
  const { data: attendance, error: attendanceError } = receiverId
    ? await supabase.from('event_attendees').select('id').eq('event_id', eventId).eq('user_id', receiverId).maybeSingle()
    : { data: null, error: null };
  if (attendanceError) throw new Error(attendanceError.message);
  if (!attendance) {
    console.warn(`Upozorenje: nalog ${myEmail} još nije na eventu. Interesovanje je preskočeno.`);
    return;
  }

  const markoId = users.get(loginEmail('marko'));
  if (!markoId) throw new Error('Marko Ilić nema nalog, pa interesovanje nije upisano.');
  if (markoId === receiverId) {
    console.warn('Upozorenje: MY_EMAIL je nalog Marka Ilića. Interesovanje je preskočeno.');
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('interests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', markoId)
    .eq('target_user_id', receiverId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    console.log('Interesovanje Marka Ilića već postoji.');
    return;
  }

  const { error } = await supabase.from('interests').insert({
    event_id: eventId,
    user_id: markoId,
    target_user_id: receiverId,
    kind: 'interested',
  });
  if (error) throw new Error(error.message);
  console.log(`Marko Ilić je zainteresovan za ${myEmail}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Nešto nije uspelo.');
  process.exit(1);
});
