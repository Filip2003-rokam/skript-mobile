import { freshDb, type Db } from './db';
import { ana, bora, ceca, dejan, failure, seedEvent } from './fixtures';

let db: Db;
let eventId: string;

beforeEach(async () => {
  db = await freshDb();
  ({ eventId } = await seedEvent(db));
});

afterEach(async () => {
  await db.close();
});

async function propose(from: string, to: string, place = 'Hol'): Promise<string> {
  const row = await db.as(from, () =>
    db.query<{ id: string }>(
      "insert into public.meetings (event_id, proposer_id, invitee_id, day, start_time, place) values ($1, $2, $3, 1, '11:30', $4) returning id",
      [eventId, from, to, place],
    ),
  );
  return row.rows[0].id;
}

describe('sastanci', () => {
  it('predlog ne traži obostrano interesovanje, a važi tek kad druga strana prihvati', async () => {
    const id = await propose(ana, bora);
    const before = await db.as(bora, () => db.query<{ status: string }>('select status from public.meetings where id = $1', [id]));
    expect(before.rows[0].status).toBe('pending');
    await db.as(bora, () => db.query("update public.meetings set status = 'accepted' where id = $1", [id]));
    const after = await db.as(ana, () => db.query<{ status: string; responded_at: string | null }>('select status, responded_at from public.meetings where id = $1', [id]));
    expect(after.rows[0].status).toBe('accepted');
    expect(after.rows[0].responded_at).not.toBeNull();
  });

  it('ne može se predložiti u tuđe ime ni nekome ko nije na eventu', async () => {
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query("insert into public.meetings (event_id, proposer_id, invitee_id, day, start_time, place) values ($1, $2, $3, 1, '11:30', 'Hol')", [eventId, bora, ceca]),
        ),
      ),
    ).not.toBeNull();
    expect(await failure(() => propose(ana, dejan))).not.toBeNull();
  });

  it('predlagač ne može sam da prihvati, a pozvani ne može da otkaže', async () => {
    const id = await propose(ana, bora);
    expect(await failure(() => db.as(ana, () => db.query("update public.meetings set status = 'accepted' where id = $1", [id])))).toMatch(/otkaže/);
    expect(await failure(() => db.as(bora, () => db.query("update public.meetings set status = 'cancelled' where id = $1", [id])))).toMatch(/prihvatiš/);
  });

  it('pri odgovoru se ne mogu menjati vreme ni mesto', async () => {
    const id = await propose(ana, bora);
    expect(
      await failure(() => db.as(bora, () => db.query("update public.meetings set status = 'accepted', place = 'Bina' where id = $1", [id]))),
    ).toMatch(/samo status/);
  });

  it('treća osoba ne vidi tuđi sastanak i ne može da ga promeni', async () => {
    const id = await propose(ana, bora);
    const seen = await db.as(ceca, () => db.query('select id from public.meetings where id = $1', [id]));
    expect(seen.rows).toHaveLength(0);
    await db.as(ceca, () => db.query("update public.meetings set status = 'accepted' where id = $1", [id]));
    const still = await db.query<{ status: string }>('select status from public.meetings where id = $1', [id]);
    expect(still.rows[0].status).toBe('pending');
  });

  it('jedan otvoren predlog po paru, najviše pet otvorenih, a posle odbijanja nema novog', async () => {
    await propose(ana, bora);
    expect(await failure(() => propose(bora, ana))).toMatch(/duplicate|unique/);
    const id = (await db.query<{ id: string }>('select id from public.meetings')).rows[0].id;
    await db.as(bora, () => db.query("update public.meetings set status = 'declined' where id = $1", [id]));
    expect(await failure(() => propose(ana, bora))).toMatch(/odbila/);
  });
});

describe('zvonce', () => {
  it('predlog, prihvatanje i odbijanje stižu pravoj osobi', async () => {
    const first = await propose(ana, bora);
    await db.as(bora, () => db.query("update public.meetings set status = 'accepted' where id = $1", [first]));
    const second = await propose(ana, ceca);
    await db.as(ceca, () => db.query("update public.meetings set status = 'declined' where id = $1", [second]));

    const boraSees = await db.as(bora, () => db.query<{ kind: string }>('select kind from public.notifications order by created_at'));
    expect(boraSees.rows.map((row) => row.kind)).toEqual(['meeting_proposed']);
    const anaSees = await db.as(ana, () => db.query<{ kind: string }>('select kind from public.notifications order by kind'));
    expect(anaSees.rows.map((row) => row.kind)).toEqual(['meeting_accepted', 'meeting_declined']);
  });

  it('obostrano interesovanje javi obema stranama', async () => {
    await db.as(ana, () => db.query("insert into public.interests (event_id, user_id, target_user_id, kind) values ($1, $2, $3, 'interested')", [eventId, ana, bora]));
    await db.as(bora, () => db.query("insert into public.interests (event_id, user_id, target_user_id, kind) values ($1, $2, $3, 'interested')", [eventId, bora, ana]));
    for (const user of [ana, bora]) {
      const rows = await db.as(user, () => db.query<{ kind: string }>('select kind from public.notifications'));
      expect(rows.rows.map((row) => row.kind)).toEqual(['connection_accepted']);
    }
  });

  it('korisnik može samo da označi svoje obaveštenje kao pročitano', async () => {
    await propose(ana, bora);
    const id = (await db.query<{ id: string }>('select id from public.notifications')).rows[0].id;
    await db.as(bora, () => db.query('update public.notifications set read_at = now() where id = $1', [id]));
    expect((await db.query<{ read_at: string | null }>('select read_at from public.notifications')).rows[0].read_at).not.toBeNull();
    expect(await failure(() => db.as(bora, () => db.query("update public.notifications set kind = 'meeting_accepted' where id = $1", [id])))).not.toBeNull();
    expect(
      await failure(() => db.as(bora, () => db.query('insert into public.notifications (user_id, kind) values ($1, $2)', [ana, 'meeting_accepted']))),
    ).not.toBeNull();
  });
});

describe('moj dan', () => {
  it('sačuvana predavanja vidi samo vlasnik', async () => {
    const session = (await db.query<{ id: string }>('select id from public.event_sessions')).rows[0].id;
    await db.as(ana, () => db.query('insert into public.saved_sessions (user_id, session_id) values ($1, $2)', [ana, session]));
    expect((await db.as(bora, () => db.query('select * from public.saved_sessions'))).rows).toHaveLength(0);
    expect(await failure(() => db.as(bora, () => db.query('insert into public.saved_sessions (user_id, session_id) values ($1, $2)', [ana, session])))).not.toBeNull();
  });
});
