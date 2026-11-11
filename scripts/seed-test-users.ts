// Lokalni seed: npx tsx scripts/seed-test-users.ts
// Čita scripts/.env. Service role ključ ostaje ovde i ne ide u aplikaciju.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { needOptions, offerOptions, roleOptions } from '../constants/options';

const summitSlug = 'startup-revolution-ai-summit';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const demoDir = join(scriptDir, '..', 'stari-kod', 'demo-ref');
const englishRequest = 'Saw you build software for other companies. We need a team for our patient app. Coffee after lunch?';
const serbianRequest = 'Video sam da pravite softver za druge firme. Treba nam tim za aplikaciju za pacijente. Kafa posle ručka?';

const kinds = ['buyer', 'agency', 'investor', 'founder', 'operator'] as const;
type Kind = (typeof kinds)[number];

type DemoPerson = {
  id: string;
  name: string;
  role: string;
  company: string;
  kind: Kind;
  offersTags: string[];
  needsTags: string[];
  email: string;
  phone: string;
  inRoom: boolean;
};

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

function readObject(source: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error('Ne mogu da pročitam osobu iz network.ts.');
}

// network.ts uvozi demo slike, pa čitamo same zapise osoba.
function loadPeople(): DemoPerson[] {
  const source = readFileSync(join(demoDir, 'network.ts'), 'utf8');
  const people: DemoPerson[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('p({', cursor);
    if (start < 0) break;
    const literal = readObject(source, start + 2);
    let person: DemoPerson;
    try {
      person = new Function(`return (${literal})`)() as DemoPerson;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'nepoznata greška';
      throw new Error(`Ne mogu da pročitam zapis iz network.ts: ${detail}`);
    }
    if (!kinds.includes(person.kind)) throw new Error(`${person.name}: nepoznata vrsta ${person.kind}.`);
    people.push(person);
    cursor = start + 2 + literal.length;
  }
  if (people.length !== 12) throw new Error(`U network.ts je ${people.length} osoba, a očekivano je 12.`);
  return people;
}

function loadRequest(): string {
  const source = readFileSync(join(demoDir, 'networking.ts'), 'utf8');
  if (!source.includes(englishRequest)) {
    throw new Error('Poruka iz emptyNetwork više nije ista. Proveri prevod u skripti.');
  }
  if (serbianRequest.length > 280) throw new Error('Prevedena poruka je duža od 280 znakova.');
  return serbianRequest;
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
  const people = profilesFor(loadPeople());
  const message = loadRequest();
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
  await sendMarkoRequest(supabase, event.id, users, myEmail, message);
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

async function sendMarkoRequest(supabase: SupabaseClient, eventId: string, users: Map<string, string>, myEmail: string, message: string) {
  if (!myEmail) return;
  const receiverId = users.get(myEmail);
  const { data: attendance, error: attendanceError } = receiverId
    ? await supabase.from('event_attendees').select('id').eq('event_id', eventId).eq('user_id', receiverId).maybeSingle()
    : { data: null, error: null };
  if (attendanceError) throw new Error(attendanceError.message);
  if (!attendance) {
    console.warn(`Upozorenje: nalog ${myEmail} još nije na eventu. Zahtev je preskočen.`);
    return;
  }

  const markoId = users.get(loginEmail('marko'));
  if (!markoId) throw new Error('Marko Ilić nema nalog, pa zahtev nije poslat.');
  if (markoId === receiverId) {
    console.warn('Upozorenje: MY_EMAIL je nalog Marka Ilića. Zahtev je preskočen.');
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('connections')
    .select('id')
    .eq('event_id', eventId)
    .eq('requester_id', markoId)
    .eq('receiver_id', receiverId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    console.log('Zahtev od Marka Ilića već postoji.');
    return;
  }

  const { error } = await supabase.from('connections').insert({
    event_id: eventId,
    requester_id: markoId,
    receiver_id: receiverId,
    status: 'pending',
    message,
    source: 'match',
  });
  if (error) throw new Error(error.message);
  console.log(`Marko Ilić je poslao zahtev na ${myEmail}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Nešto nije uspelo.');
  process.exit(1);
});
