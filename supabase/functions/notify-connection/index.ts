import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

type ConnectionRow = {
  id?: string;
  event_id?: string;
  requester_id?: string;
  receiver_id?: string;
  status?: string;
};

type Ticket = {
  details?: { error?: string };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Samo POST.' }, 405);

  const secret = Deno.env.get('WEBHOOK_SECRET');
  const header = request.headers.get('x-webhook-secret');
  if (!secret || header !== secret) return json({ error: 'Neispravan secret.' }, 401);

  let payload: { type?: unknown; table?: unknown; record?: unknown; old_record?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Neispravan payload.' }, 400);
  }

  if (typeof payload.table === 'string' && payload.table !== 'connections') return json({ ok: true });

  const type = typeof payload.type === 'string' ? payload.type.toUpperCase() : '';
  const record = row(payload.record);
  const previous = row(payload.old_record);

  try {
    const admin = serviceClient();
    if (type === 'INSERT' && record?.status === 'pending') {
      await notifyNewRequest(admin, record);
    } else if (type === 'UPDATE' && previous?.status === 'pending' && record?.status === 'accepted') {
      await notifyAccepted(admin, record);
    }
    return json({ ok: true });
  } catch (cause) {
    console.error(cause);
    return json({ error: 'Slanje nije uspelo.' }, 500);
  }
});

async function notifyNewRequest(admin: SupabaseClient, record: ConnectionRow) {
  const eventId = required(record.event_id);
  const requesterId = required(record.requester_id);
  const receiverId = required(record.receiver_id);
  if (!eventId || !requesterId || !receiverId) return;

  const [name, event] = await Promise.all([profileName(admin, requesterId), eventInfo(admin, eventId)]);
  if (!event) return;

  await sendPush(admin, receiverId, {
    title: 'Novi zahtev za povezivanje',
    body: `${name} sa eventa ${event.name} želi da se poveže`,
    url: requestsUrl(event.slug),
  });
}

async function notifyAccepted(admin: SupabaseClient, record: ConnectionRow) {
  const eventId = required(record.event_id);
  const requesterId = required(record.requester_id);
  const receiverId = required(record.receiver_id);
  if (!eventId || !requesterId || !receiverId) return;

  const [name, event] = await Promise.all([profileName(admin, receiverId), eventInfo(admin, eventId)]);
  if (!event) return;

  await sendPush(admin, requesterId, {
    title: 'Zahtev je prihvaćen',
    body: `${name} je prihvatio/la tvoj zahtev`,
    url: requestsUrl(event.slug),
  });
}

async function profileName(admin: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return clip(data?.full_name, 'Neko');
}

async function eventInfo(admin: SupabaseClient, eventId: string): Promise<{ name: string; slug: string } | null> {
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
      throw new Error('Expo push nije primio poruku.');
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

function requestsUrl(slug: string): string {
  return `/people?view=requests&slug=${encodeURIComponent(slug)}`;
}

function row(value: unknown): ConnectionRow | null {
  if (!value || typeof value !== 'object') return null;
  return value as ConnectionRow;
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
  if (!url || !key) throw new Error('Service role klijent nije podešen.');
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
