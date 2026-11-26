import { createUser, type Db } from './db';

export const ana = '00000000-0000-4000-8000-00000000000a';
export const bora = '00000000-0000-4000-8000-00000000000b';
export const ceca = '00000000-0000-4000-8000-00000000000c';
export const dejan = '00000000-0000-4000-8000-00000000000d';

/** Event sa tri učesnika (Ana, Bora, Ceca) i Dejanom, koji nije na eventu. */
export async function seedEvent(db: Db): Promise<{ eventId: string; otherEventId: string; sessionId: string }> {
  await createUser(db, ana, 'Ana Petrović', 'ana@primer.com');
  await createUser(db, bora, 'Bora Jovanović', 'bora@primer.com');
  await createUser(db, ceca, 'Ceca Ilić', 'ceca@primer.com');
  await createUser(db, dejan, 'Dejan Kostić', 'dejan@primer.com');
  await db.query("update public.profile_private set phone = '+381 60 111' where user_id = $1", [bora]);
  const event = await db.query<{ id: string }>(
    "insert into public.events (slug, name, starts_on, days) values ('pogon', 'Pogon', current_date, 2) returning id",
  );
  const other = await db.query<{ id: string }>("insert into public.events (slug, name) values ('drugi', 'Drugi') returning id");
  const eventId = event.rows[0].id;
  for (const user of [ana, bora, ceca]) {
    await db.query('insert into public.event_attendees (event_id, user_id) values ($1, $2)', [eventId, user]);
  }
  await db.query('insert into public.event_attendees (event_id, user_id) values ($1, $2)', [other.rows[0].id, dejan]);
  const session = await db.query<{ id: string }>(
    "insert into public.event_sessions (event_id, title, day, start_time) values ($1, 'Keynote', 1, '10:00') returning id",
    [eventId],
  );
  return { eventId, otherEventId: other.rows[0].id, sessionId: session.rows[0].id };
}

/** Poruka greške iz baze, ili null ako je upit prošao. */
export async function failure(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (cause) {
    return (cause as Error).message;
  }
}
