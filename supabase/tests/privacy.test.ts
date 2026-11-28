// Ko šta vidi u bazi. Svaki test ide kroz iste uloge i politike kao telefon (authenticated, anon).
import { createUser, freshDb, type Db } from './db';
import { ana, bora, ceca, dejan, failure, seedEvent } from './fixtures';

let db: Db;
let eventId: string;
let otherEventId: string;

beforeEach(async () => {
  db = await freshDb();
  ({ eventId, otherEventId } = await seedEvent(db));
});

afterEach(async () => {
  await db.close();
});

const swapCode = 'kod-za-razmenu-0001';

async function ids(userId: string, sql: string, params: unknown[] = []): Promise<string[]> {
  const result = await db.as(userId, () => db.query<{ id: string }>(sql, params));
  return result.rows.map((row) => row.id).sort();
}

async function request(from: string, to: string, message: string | null = null): Promise<string> {
  const row = await db.as(from, () =>
    db.query<{ id: string }>(
      "insert into public.connections (event_id, requester_id, receiver_id, message, source) values ($1, $2, $3, $4, 'qr') returning id",
      [eventId, from, to, message],
    ),
  );
  return row.rows[0].id;
}

async function answer(userId: string, id: string, status: 'accepted' | 'declined'): Promise<number> {
  const result = await db.as(userId, () =>
    db.query('update public.connections set status = $1 where id = $2 returning id', [status, id]),
  );
  return result.rows.length;
}

async function contactOf(owner: string, other: string): Promise<{ email: string | null; phone: string | null } | null> {
  const result = await db.as(owner, () =>
    db.query<{ email: string | null; phone: string | null }>(
      'select email, phone from public.contacts where owner_id = $1 and contact_user_id = $2',
      [owner, other],
    ),
  );
  return result.rows[0] ?? null;
}

async function interest(from: string, to: string, kind: 'interested' | 'skipped' = 'interested'): Promise<void> {
  await db.as(from, () =>
    db.query('insert into public.interests (event_id, user_id, target_user_id, kind) values ($1, $2, $3, $4)', [
      eventId,
      from,
      to,
      kind,
    ]),
  );
}

async function makeSwapCode(owner: string, code = swapCode): Promise<void> {
  await db.as(owner, () =>
    db.query('insert into public.swap_tokens (owner_id, event_id, token) values ($1, $2, $3)', [owner, eventId, code]),
  );
}

async function swap(userId: string, code = swapCode): Promise<string> {
  const result = await db.as(userId, () => db.query<{ id: string }>('select public.swap_contact($1) as id', [code]));
  return result.rows[0].id;
}

describe('ko koga vidi', () => {
  it('učesnik vidi profile i prijave samo ljudi sa svog eventa', async () => {
    expect(await ids(ana, 'select id from public.profiles')).toEqual([ana, bora, ceca].sort());
    expect(await ids(ana, 'select user_id as id from public.event_attendees')).toEqual([ana, bora, ceca].sort());
    expect(await ids(ana, 'select id from public.profiles where id = $1', [dejan])).toEqual([]);
  });

  it('neko sa drugog eventa vidi samo sebe', async () => {
    expect(await ids(dejan, 'select id from public.profiles')).toEqual([dejan]);
    expect(await ids(dejan, 'select user_id as id from public.event_attendees')).toEqual([dejan]);
    expect(await ids(dejan, 'select user_id as id from public.event_attendees where event_id = $1', [eventId])).toEqual([]);
  });

  it('mejl i telefon vidi samo vlasnik, čak i na istom eventu', async () => {
    expect(await ids(ana, 'select user_id as id from public.profile_private')).toEqual([ana]);
    const changed = await db.as(ana, () =>
      db.query("update public.profile_private set phone = '000' where user_id = $1 returning user_id", [bora]),
    );
    expect(changed.rows).toHaveLength(0);
    expect(
      await failure(() =>
        db.as(ana, () => db.query("insert into public.profile_private (user_id, email) values ($1, 'lazni@primer.com')", [dejan])),
      ),
    ).not.toBeNull();
  });

  it('niko ne menja tuđi profil ni tuđu prijavu na event', async () => {
    const profile = await db.as(ana, () =>
      db.query("update public.profiles set full_name = 'X' where id = $1 returning id", [bora]),
    );
    expect(profile.rows).toHaveLength(0);
    const attendee = await db.as(ana, () =>
      db.query("update public.event_attendees set company = 'X' where user_id = $1 returning id", [bora]),
    );
    expect(attendee.rows).toHaveLength(0);
    const removed = await db.as(ana, () =>
      db.query('delete from public.event_attendees where user_id = $1 returning id', [bora]),
    );
    expect(removed.rows).toHaveLength(0);
    expect(
      await failure(() =>
        db.as(ana, () => db.query('insert into public.event_attendees (event_id, user_id) values ($1, $2)', [otherEventId, bora])),
      ),
    ).not.toBeNull();
  });

  it('pre prijave se vide samo event i agenda', async () => {
    const events = await db.asAnon(() => db.query('select id from public.events'));
    expect(events.rows).toHaveLength(2);
    const sessions = await db.asAnon(() => db.query('select id from public.event_sessions'));
    expect(sessions.rows).toHaveLength(1);
    for (const table of ['profiles', 'profile_private', 'event_attendees', 'connections', 'contacts', 'interests', 'swap_tokens', 'push_tokens']) {
      expect(await failure(() => db.asAnon(() => db.query(`select 1 from public.${table}`)))).toMatch(/permission denied/);
    }
    expect(await failure(() => db.asAnon(() => db.query("update public.events set name = 'X'")))).toMatch(/permission denied/);
  });
});

describe('kontakt se deli tek posle prihvatanja', () => {
  it('zahtev sam ne daje kontakt, prihvatanje daje obema stranama', async () => {
    const id = await request(ana, bora, 'Pričali smo o AI agentima');
    expect(await contactOf(ana, bora)).toBeNull();
    expect(await contactOf(bora, ana)).toBeNull();

    expect(await answer(bora, id, 'accepted')).toBe(1);
    expect(await contactOf(ana, bora)).toEqual({ email: 'bora@primer.com', phone: '+381 60 111' });
    expect(await contactOf(bora, ana)).toEqual({ email: 'ana@primer.com', phone: null });
  });

  it('odbijen zahtev ne daje kontakt i ne može se kasnije prepraviti u prihvaćen', async () => {
    const id = await request(ana, bora);
    expect(await answer(bora, id, 'declined')).toBe(1);
    expect(await answer(bora, id, 'accepted')).toBe(0);
    expect(await contactOf(ana, bora)).toBeNull();
  });

  it('pošiljalac ne može sam da prihvati, a prihvaćen se ne vraća na odbijen', async () => {
    const id = await request(ana, bora);
    expect(await answer(ana, id, 'accepted')).toBe(0);
    expect(await answer(ceca, id, 'accepted')).toBe(0);
    expect(await answer(bora, id, 'accepted')).toBe(1);
    expect(await answer(bora, id, 'declined')).toBe(0);
  });

  it('telefon ne može sam da upiše prihvaćen zahtev', async () => {
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query(
            "insert into public.connections (event_id, requester_id, receiver_id, status, source) values ($1, $2, $3, 'accepted', 'qr')",
            [eventId, ana, bora],
          ),
        ),
      ),
    ).toMatch(/row-level security/);
    expect(await contactOf(ana, bora)).toBeNull();
  });

  it('zahtev ide samo nekome sa istog eventa, u svoje ime, ne sebi, sa kratkom porukom', async () => {
    expect(await failure(() => request(ana, dejan))).not.toBeNull();
    expect(await failure(() => request(dejan, ana))).not.toBeNull();
    expect(await failure(() => request(ana, ana))).not.toBeNull();
    expect(await failure(() => request(ana, bora, 'x'.repeat(281)))).not.toBeNull();
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query("insert into public.connections (event_id, requester_id, receiver_id, source) values ($1, $2, $3, 'qr')", [
            eventId,
            bora,
            ceca,
          ]),
        ),
      ),
    ).not.toBeNull();
  });

  it('pri odgovoru se menja samo status', async () => {
    const id = await request(ana, bora, 'Zdravo');
    expect(
      await failure(() =>
        db.as(bora, () => db.query("update public.connections set status = 'accepted', message = 'drugo' where id = $1", [id])),
      ),
    ).toMatch(/samo status/);
  });

  it('treća osoba ne vidi tuđe zahteve ni tuđe kontakte', async () => {
    const id = await request(ana, bora);
    await answer(bora, id, 'accepted');
    expect(await ids(ceca, 'select id from public.connections')).toEqual([]);
    expect(await ids(ceca, 'select id from public.contacts')).toEqual([]);
    const stolen = await db.as(ceca, () =>
      db.query("update public.contacts set note = 'X' where owner_id = $1 returning id", [ana]),
    );
    expect(stolen.rows).toHaveLength(0);
  });
});

describe('slepo interesovanje', () => {
  it('druga strana ne vidi tuđe interesovanje, a uzajamno odmah povezuje', async () => {
    await interest(ana, bora);
    expect(await ids(bora, 'select id from public.interests')).toEqual([]);
    expect(await ids(bora, 'select id from public.connections')).toEqual([]);
    expect(await contactOf(ana, bora)).toBeNull();

    await interest(bora, ana);
    const link = await db.as(ana, () => db.query<{ status: string; source: string }>('select status, source from public.connections'));
    expect(link.rows).toEqual([{ status: 'accepted', source: 'match' }]);
    expect(await contactOf(ana, bora)).toEqual({ email: 'bora@primer.com', phone: '+381 60 111' });
    expect(await contactOf(bora, ana)).not.toBeNull();
  });

  it('preskakanje ne povezuje, a interesovanje ide samo za ljude sa eventa', async () => {
    await interest(ana, bora);
    await interest(bora, ana, 'skipped');
    expect(await ids(ana, 'select id from public.connections')).toEqual([]);
    expect(await failure(() => interest(ana, dejan))).not.toBeNull();
    expect(await failure(() => interest(ana, ana))).not.toBeNull();
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query("insert into public.interests (event_id, user_id, target_user_id, kind) values ($1, $2, $3, 'interested')", [
            eventId,
            bora,
            ceca,
          ]),
        ),
      ),
    ).not.toBeNull();
  });

  it('šesto otvoreno interesovanje staje u bazi', async () => {
    const extra: string[] = [];
    for (let index = 1; index <= 5; index += 1) {
      const id = `00000000-0000-4000-8000-0000000001${index.toString().padStart(2, '0')}`;
      await createUser(db, id, `Gost ${index}`, `gost${index}@primer.com`);
      await db.query('insert into public.event_attendees (event_id, user_id) values ($1, $2)', [eventId, id]);
      extra.push(id);
    }
    for (const target of [bora, ceca, ...extra.slice(0, 3)]) {
      await interest(ana, target);
    }
    expect(await failure(() => interest(ana, extra[3]))).toMatch(/5 otvorenih/);
    expect(await failure(() => interest(ana, extra[4], 'skipped'))).toBeNull();
  });
});

describe('razmena kontakta uživo', () => {
  it('vlasnika i trajanje koda određuje server, i kod vidi samo vlasnik', async () => {
    await db.as(bora, () =>
      db.query("insert into public.swap_tokens (owner_id, event_id, token, expires_at) values ($1, $2, $3, now() + interval '30 days')", [
        bora,
        eventId,
        swapCode,
      ]),
    );
    const stored = await db.query<{ owner_id: string; minutes: number }>(
      'select owner_id, round(extract(epoch from expires_at - now()) / 60)::int as minutes from public.swap_tokens',
    );
    expect(stored.rows).toEqual([{ owner_id: bora, minutes: 5 }]);
    expect(await ids(ana, 'select id from public.swap_tokens')).toEqual([]);
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query("insert into public.swap_tokens (owner_id, event_id, token) values ($1, $2, 'kod-sa-tudjeg-eventa')", [ana, otherEventId]),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it('skeniran kod daje kontakt odmah, ali samo jednom', async () => {
    await makeSwapCode(bora);
    const contactId = await swap(ana);
    const contact = await db.as(ana, () =>
      db.query<{ id: string; phone: string | null }>('select id, phone from public.contacts where contact_user_id = $1', [bora]),
    );
    expect(contact.rows).toEqual([{ id: contactId, phone: '+381 60 111' }]);
    expect(await contactOf(bora, ana)).not.toBeNull();
    expect(await failure(() => swap(ceca))).toMatch(/istekao/);
  });

  it('svoj, istekao ili kod sa drugog eventa ne prolazi', async () => {
    await makeSwapCode(bora);
    expect(await failure(() => swap(bora))).toMatch(/tvoj kod/);
    expect(await failure(() => swap(dejan))).toMatch(/drugog eventa/);
    expect(await failure(() => db.asAnon(() => db.query('select public.swap_contact($1)', [swapCode])))).toMatch(/permission denied/);
    await db.query("update public.swap_tokens set expires_at = now() - interval '1 minute'");
    expect(await failure(() => swap(ana))).toMatch(/istekao/);
    expect(await contactOf(ana, bora)).toBeNull();
  });

  it('posle odbijenog zahteva kod ne deli kontakt', async () => {
    const id = await request(ana, bora);
    await answer(bora, id, 'declined');
    await makeSwapCode(bora);
    expect(await failure(() => swap(ana))).toMatch(/odbijena/);
    expect(await contactOf(ana, bora)).toBeNull();
  });
});

describe('lični podaci samo vlasniku', () => {
  it('push token vidi, menja i briše samo vlasnik', async () => {
    await db.as(ana, () => db.query("insert into public.push_tokens (user_id, token) values ($1, 'ExponentPushToken[ana]')", [ana]));
    expect(await ids(bora, 'select token as id from public.push_tokens')).toEqual([]);
    expect(
      await failure(() => db.as(bora, () => db.query("insert into public.push_tokens (user_id, token) values ($1, 'lazni')", [ana]))),
    ).toMatch(/row-level security/);
    const removed = await db.as(bora, () => db.query('delete from public.push_tokens where user_id = $1 returning token', [ana]));
    expect(removed.rows).toHaveLength(0);
    const own = await db.as(ana, () => db.query('delete from public.push_tokens returning token'));
    expect(own.rows).toHaveLength(1);
  });

  it('predloge za mreženje vidi samo onaj kome su namenjeni, i telefon ih ne piše', async () => {
    await db.query(
      'insert into public.match_suggestions (event_id, user_id, suggested_user_id, score) values ($1, $2, $3, 8), ($1, $3, $4, 6)',
      [eventId, ana, bora, ceca],
    );
    expect(await ids(ana, 'select suggested_user_id as id from public.match_suggestions')).toEqual([bora]);
    expect(await ids(ceca, 'select suggested_user_id as id from public.match_suggestions')).toEqual([]);
    expect(
      await failure(() =>
        db.as(ana, () =>
          db.query('insert into public.match_suggestions (event_id, user_id, suggested_user_id, score) values ($1, $2, $3, 10)', [eventId, ana, ceca]),
        ),
      ),
    ).toMatch(/permission denied/);
  });

  it('serverske tabele brojača telefon ne vidi', async () => {
    for (const table of ['match_runs', 'voice_note_runs']) {
      expect(await failure(() => db.as(ana, () => db.query(`select 1 from public.${table}`)))).toMatch(/permission denied/);
    }
  });
});
