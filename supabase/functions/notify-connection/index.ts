import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

type ConnectionRow = {
  id?: string;
  event_id?: string;
  requester_id?: string;
  receiver_id?: string;
  status?: string;
  source?: string;
};

type MeetingRow = {
  id?: string;
  event_id?: string;
  proposer_id?: string;
  invitee_id?: string;
  day?: number;
  start_time?: string;
  place?: string;
  status?: string;
};

type Ticket = {
  details?: { error?: string };
};

type Lang = 'sr' | 'en';
type Person = { name: string; lang: Lang };
type EventInfo = { name: string; slug: string };

// Tekst ide na jeziku primaoca (profiles.language), ne pošiljaoca.
const texts = {
  sr: {
    someone: 'Neko',
    requestTitle: 'Novi zahtev za povezivanje',
    requestBody: (name: string, event: string) => `${name} sa eventa ${event} želi da se poveže`,
    acceptedTitle: 'Zahtev je prihvaćen',
    acceptedBody: (name: string) => `${name} je prihvatio/la tvoj zahtev`,
    mutualTitle: 'Povezali ste se',
    mutualBody: (name: string, event: string) => `${name} i ti ste se povezali na eventu ${event}`,
    meetingTitle: 'Predlog sastanka',
    meetingBody: (name: string, when: string) => `${name} predlaže sastanak: ${when}`,
    meetingAcceptedTitle: 'Sastanak je zakazan',
    meetingAcceptedBody: (name: string, when: string) => `${name} je prihvatio/la sastanak: ${when}`,
    meetingDeclinedTitle: 'Sastanak nije prihvaćen',
    meetingDeclinedBody: (name: string) => `${name} ne može u predloženom terminu`,
    day: (day: number) => `dan ${day}`,
  },
  en: {
    someone: 'Someone',
    requestTitle: 'New connection request',
    requestBody: (name: string, event: string) => `${name} from ${event} wants to connect`,
    acceptedTitle: 'Request accepted',
    acceptedBody: (name: string) => `${name} accepted your request`,
    mutualTitle: 'You are connected',
    mutualBody: (name: string, event: string) => `You and ${name} connected at ${event}`,
    meetingTitle: 'Meeting proposal',
    meetingBody: (name: string, when: string) => `${name} suggests a meeting: ${when}`,
    meetingAcceptedTitle: 'Meeting confirmed',
    meetingAcceptedBody: (name: string, when: string) => `${name} accepted the meeting: ${when}`,
    meetingDeclinedTitle: 'Meeting declined',
    meetingDeclinedBody: (name: string) => `${name} can't make the proposed time`,
    day: (day: number) => `day ${day}`,
  },
} as const;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST only.' }, 405);

  const secret = Deno.env.get('WEBHOOK_SECRET');
  const header = request.headers.get('x-webhook-secret');
  if (!secret || header !== secret) return json({ error: 'Invalid secret.' }, 401);

  let payload: { type?: unknown; table?: unknown; record?: unknown; old_record?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid payload.' }, 400);
  }

  const table = typeof payload.table === 'string' ? payload.table : 'connections';
  const type = typeof payload.type === 'string' ? payload.type.toUpperCase() : '';

  try {
    const admin = serviceClient();
    if (table === 'connections') {
      const record = row<ConnectionRow>(payload.record);
      const previous = row<ConnectionRow>(payload.old_record);
      if (type === 'INSERT' && record?.status === 'pending') {
        await notifyNewRequest(admin, record);
      } else if (type === 'INSERT' && record?.status === 'accepted' && record?.source === 'match') {
        await notifyMutual(admin, record);
      } else if (type === 'UPDATE' && previous?.status === 'pending' && record?.status === 'accepted') {
        await notifyAccepted(admin, record);
      }
    } else if (table === 'meetings') {
      const record = row<MeetingRow>(payload.record);
      const previous = row<MeetingRow>(payload.old_record);
      if (type === 'INSERT' && record?.status === 'pending') {
        await notifyMeeting(admin, record, 'proposed');
      } else if (type === 'UPDATE' && previous?.status === 'pending' && record?.status === 'accepted') {
        await notifyMeeting(admin, record, 'accepted');
      } else if (type === 'UPDATE' && previous?.status === 'pending' && record?.status === 'declined') {
        await notifyMeeting(admin, record, 'declined');
      }
    }
    return json({ ok: true });
  } catch (cause) {
    console.error(cause);
    return json({ error: 'Sending failed.' }, 500);
  }
});

async function notifyNewRequest(admin: SupabaseClient, record: ConnectionRow) {
  const eventId = required(record.event_id);
  const requesterId = required(record.requester_id);
  const receiverId = required(record.receiver_id);
  if (!eventId || !requesterId || !receiverId) return;

  const [from, to, event] = await Promise.all([person(admin, requesterId), person(admin, receiverId), eventInfo(admin, eventId)]);
  if (!event) return;
  const text = texts[to.lang];

  await sendPush(admin, receiverId, {
    title: text.requestTitle,
    body: text.requestBody(named(from, to.lang), event.name),
    url: peopleUrl('requests', event.slug),
  });
}

async function notifyAccepted(admin: SupabaseClient, record: ConnectionRow) {
  const eventId = required(record.event_id);
  const requesterId = required(record.requester_id);
  const receiverId = required(record.receiver_id);
  if (!eventId || !requesterId || !receiverId) return;

  const [from, to, event] = await Promise.all([person(admin, receiverId), person(admin, requesterId), eventInfo(admin, eventId)]);
  if (!event) return;
  const text = texts[to.lang];

  await sendPush(admin, requesterId, {
    title: text.acceptedTitle,
    body: text.acceptedBody(named(from, to.lang)),
    url: peopleUrl('requests', event.slug),
  });
}

async function notifyMutual(admin: SupabaseClient, record: ConnectionRow) {
  const eventId = required(record.event_id);
  const requesterId = required(record.requester_id);
  const receiverId = required(record.receiver_id);
  if (!eventId || !requesterId || !receiverId) return;

  const [requester, receiver, event] = await Promise.all([
    person(admin, requesterId),
    person(admin, receiverId),
    eventInfo(admin, eventId),
  ]);
  if (!event) return;

  const url = peopleUrl('connected', event.slug);
  await sendPush(admin, requesterId, {
    title: texts[requester.lang].mutualTitle,
    body: texts[requester.lang].mutualBody(named(receiver, requester.lang), event.name),
    url,
  });
  await sendPush(admin, receiverId, {
    title: texts[receiver.lang].mutualTitle,
    body: texts[receiver.lang].mutualBody(named(requester, receiver.lang), event.name),
    url,
  });
}

async function notifyMeeting(admin: SupabaseClient, record: MeetingRow, change: 'proposed' | 'accepted' | 'declined') {
  const eventId = required(record.event_id);
  const proposerId = required(record.proposer_id);
  const inviteeId = required(record.invitee_id);
  if (!eventId || !proposerId || !inviteeId) return;

  // Predlog ide pozvanom, odgovor ide onome ko je predložio.
  const [actorId, targetId] = change === 'proposed' ? [proposerId, inviteeId] : [inviteeId, proposerId];
  const [actor, target, event] = await Promise.all([person(admin, actorId), person(admin, targetId), eventInfo(admin, eventId)]);
  if (!event) return;
  const text = texts[target.lang];
  const name = named(actor, target.lang);
  const when = meetingWhen(record, target.lang);
  const url = `/agenda?view=myDay&slug=${encodeURIComponent(event.slug)}`;

  if (change === 'proposed') {
    await sendPush(admin, targetId, { title: text.meetingTitle, body: text.meetingBody(name, when), url });
  } else if (change === 'accepted') {
    await sendPush(admin, targetId, { title: text.meetingAcceptedTitle, body: text.meetingAcceptedBody(name, when), url });
  } else {
    await sendPush(admin, targetId, { title: text.meetingDeclinedTitle, body: text.meetingDeclinedBody(name), url });
  }
}

function meetingWhen(record: MeetingRow, lang: Lang): string {
  const parts: string[] = [];
  if (typeof record.day === 'number') parts.push(texts[lang].day(record.day));
  if (typeof record.start_time === 'string') parts.push(record.start_time.slice(0, 5));
  if (typeof record.place === 'string' && record.place.trim()) parts.push(clip(record.place, ''));
  return parts.join(', ');
}

async function person(admin: SupabaseClient, userId: string): Promise<Person> {
  const { data, error } = await admin.from('profiles').select('full_name, language').eq('id', userId).maybeSingle();
  if (error) throw error;
  return { name: clip(data?.full_name, ''), lang: data?.language === 'en' ? 'en' : 'sr' };
}

function named(who: Person, lang: Lang): string {
  return who.name || texts[lang].someone;
}

async function eventInfo(admin: SupabaseClient, eventId: string): Promise<EventInfo | null> {
  const { data, error } = await admin.from('events').select('name, slug').eq('id', eventId).maybeSingle();
  if (error) throw error;
  if (!data?.slug || !data.name) return null;
  return { name: clip(data.name, 'event'), slug: data.slug };
}

async function sendPush(
  admin: SupabaseClient,
  userId: string,
  message: { title: string; body: string; url: string },
) {
  const { data, error } = await admin.from('push_tokens').select('token').eq('user_id', userId);
  if (error) throw error;
  const tokens = (data ?? []).map((item) => item.token).filter((token): token is string => typeof token === 'string' && token.length > 0);
  if (tokens.length === 0) return;

  for (let index = 0; index < tokens.length; index += 100) {
    const batch = tokens.slice(index, index + 100);
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: batch,
        title: message.title,
        body: message.body,
        data: { url: message.url },
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }),
    });
    if (!response.ok) {
      console.error(`Expo push ${response.status}: ${await response.text()}`);
      throw new Error('Expo push rejected the message.');
    }

    const stale = unregistered(batch, await response.json());
    if (stale.length === 0) continue;
    const { error: deleteError } = await admin.from('push_tokens').delete().in('token', stale);
    if (deleteError) console.error(deleteError);
  }
}

function unregistered(tokens: string[], body: unknown): string[] {
  const data = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : null;
  const tickets = (Array.isArray(data) ? data : data ? [data] : []) as Ticket[];
  return tokens.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered');
}

function peopleUrl(view: 'requests' | 'connected', slug: string): string {
  return `/people?view=${view}&slug=${encodeURIComponent(slug)}`;
}

function row<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null;
  return value as T;
}

function required(value: string | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function clip(value: string | null | undefined, fallback: string): string {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKey();
  if (!url || !key) throw new Error('Service role client is not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function secretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return undefined;
  try {
    const keys = JSON.parse(raw) as Record<string, string>;
    return keys.default;
  } catch {
    return undefined;
  }
}
