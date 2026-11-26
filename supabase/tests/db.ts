/// <reference types="node" />
// Pravi Postgres u testu (PGlite), sa svim migracijama iz supabase/migrations.
// Supabase delovi koje migracije koriste (auth.users, auth.uid(), uloge) su ovde napravljeni ručno.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(__dirname, '..', 'migrations');

const supabaseStub = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
`;

export type Db = PGlite & {
  /** Radi kao prijavljen korisnik: uloga authenticated i auth.uid() = userId. */
  as<T>(userId: string, fn: () => Promise<T>): Promise<T>;
  /** Radi kao neprijavljen posetilac (anon). */
  asAnon<T>(fn: () => Promise<T>): Promise<T>;
};

export async function freshDb(): Promise<Db> {
  const db = (await PGlite.create()) as unknown as Db;
  await db.exec(supabaseStub);
  const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    } catch (cause) {
      throw new Error(`Migracija ${file} ne prolazi: ${(cause as Error).message}`);
    }
  }
  db.as = async (userId, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
    }
  };
  db.asAnon = async (fn) => {
    await db.exec('set role anon;');
    try {
      return await fn();
    } finally {
      await db.exec('reset role;');
    }
  };
  return db;
}

/** Nalog kao posle registracije: okidač napravi profil i privatni red. */
export async function createUser(db: PGlite, id: string, name: string, email: string): Promise<void> {
  await db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, email, { full_name: name }]);
}
