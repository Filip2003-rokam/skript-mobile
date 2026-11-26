-- Sastanci, „Moj dan“ i zvonce, kao u Skript demou i web aplikaciji.
-- Telefon sme samo da predloži sastanak i da na njega odgovori. Status, vreme
-- odgovora i obaveštenja upisuje baza.

-- Jezik naloga: push i podsetnici idu na jeziku koji je korisnik izabrao.
alter table public.profiles
  add column language text not null default 'sr',
  add constraint profiles_language_check check (language in ('sr', 'en'));

-- 1. Sačuvana predavanja („Moj dan“). Svako vidi i menja samo svoja.

create table public.saved_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.event_sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

alter table public.saved_sessions enable row level security;

create policy saved_sessions_own on public.saved_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.saved_sessions from anon, authenticated;
grant select, insert, delete on public.saved_sessions to authenticated;
grant all on public.saved_sessions to service_role;

-- 2. Sastanci. Predlog ne traži obostrano interesovanje, ali važi tek kad druga strana prihvati.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  proposer_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  day int not null,
  start_time time not null,
  place text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint meetings_not_self check (proposer_id <> invitee_id),
  constraint meetings_place_length check (char_length(btrim(place)) between 1 and 60),
  constraint meetings_day_positive check (day >= 1)
);

create index meetings_event_proposer_idx on public.meetings (event_id, proposer_id);
create index meetings_event_invitee_idx on public.meetings (event_id, invitee_id);

-- Isti par ne može imati dva otvorena predloga u isto vreme, u bilo kom smeru.
create unique index meetings_one_open_per_pair
  on public.meetings (event_id, least(proposer_id, invitee_id), greatest(proposer_id, invitee_id))
  where status = 'pending';

-- Proverava predlog i odgovor. Menja se samo status, i to samo dozvoljenim putem.
create function public.guard_meeting()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  open_count int;
  event_days int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.proposer_id <> auth.uid() then
      raise exception 'Sastanak predlažeš samo u svoje ime.';
    end if;
    new.status = 'pending';
    new.responded_at = null;
    new.place = btrim(new.place);

    select days into event_days from public.events where id = new.event_id;
    if event_days is not null and new.day > event_days then
      raise exception 'Taj dan nije deo eventa.';
    end if;

    perform pg_advisory_xact_lock(hashtext(new.proposer_id::text || new.event_id::text));
    select count(*) into open_count
    from public.meetings
    where event_id = new.event_id and proposer_id = new.proposer_id and status = 'pending';
    if open_count >= 5 then
      raise exception 'Imaš već 5 otvorenih predloga za sastanak. Sačekaj odgovor ili otkaži jedan.';
    end if;

    if exists (
      select 1 from public.meetings
      where event_id = new.event_id
        and proposer_id = new.proposer_id
        and invitee_id = new.invitee_id
        and status = 'declined'
    ) then
      raise exception 'Ova osoba je već odbila sastanak sa tobom.';
    end if;
    return new;
  end if;

  if new.event_id is distinct from old.event_id
    or new.proposer_id is distinct from old.proposer_id
    or new.invitee_id is distinct from old.invitee_id
    or new.day is distinct from old.day
    or new.start_time is distinct from old.start_time
    or new.place is distinct from old.place
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Može se menjati samo status sastanka.';
  end if;

  if old.status <> 'pending' then
    raise exception 'Na ovaj sastanak je već odgovoreno.';
  end if;

  if auth.uid() is not null then
    if auth.uid() = old.invitee_id and new.status not in ('accepted', 'declined') then
      raise exception 'Možeš samo da prihvatiš ili odbiješ.';
    end if;
    if auth.uid() = old.proposer_id and new.status <> 'cancelled' then
      raise exception 'Svoj predlog možeš samo da otkažeš.';
    end if;
  end if;

  new.responded_at = now();
  return new;
end;
$$;

create trigger meetings_guard
  before insert or update on public.meetings
  for each row execute function public.guard_meeting();

alter table public.meetings enable row level security;

create policy meetings_select on public.meetings
  for select to authenticated
  using (proposer_id = auth.uid() or invitee_id = auth.uid());

create policy meetings_insert on public.meetings
  for insert to authenticated
  with check (
    proposer_id = auth.uid()
    and exists (
      select 1 from public.event_attendees mine
      where mine.event_id = meetings.event_id and mine.user_id = auth.uid()
    )
    and exists (
      select 1 from public.event_attendees other
      where other.event_id = meetings.event_id and other.user_id = meetings.invitee_id
    )
  );

create policy meetings_update on public.meetings
  for update to authenticated
  using ((invitee_id = auth.uid() or proposer_id = auth.uid()) and status = 'pending')
  with check (invitee_id = auth.uid() or proposer_id = auth.uid());

revoke all on public.meetings from anon, authenticated;
grant select, insert, update on public.meetings to authenticated;
grant all on public.meetings to service_role;

-- 3. Obaveštenja za zvonce. Upisuje ih samo baza; korisnik ih čita i označava kao pročitana.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in (
    'connection_request', 'connection_accepted', 'meeting_proposed', 'meeting_accepted', 'meeting_declined'
  )),
  ref_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create function public.guard_notification_read()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.event_id is distinct from old.event_id
    or new.actor_id is distinct from old.actor_id
    or new.kind is distinct from old.kind
    or new.ref_id is distinct from old.ref_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Obaveštenje se može samo označiti kao pročitano.';
  end if;
  return new;
end;
$$;

create trigger notifications_guard
  before update on public.notifications
  for each row execute function public.guard_notification_read();

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- Okidači koji pišu obaveštenja. Rade kao vlasnik tabele, jer korisnik ne sme sam da piše tuđa obaveštenja.

create function public.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, event_id, actor_id, kind, ref_id)
    values (new.receiver_id, new.event_id, new.requester_id, 'connection_request', new.id);
  elsif (tg_op = 'INSERT' and new.status = 'accepted')
    or (tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted') then
    -- Obostrano interesovanje: obe strane saznaju. Prihvaćen zahtev: saznaje onaj ko je pitao.
    insert into public.notifications (user_id, event_id, actor_id, kind, ref_id)
    values (new.requester_id, new.event_id, new.receiver_id, 'connection_accepted', new.id);
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, event_id, actor_id, kind, ref_id)
      values (new.receiver_id, new.event_id, new.requester_id, 'connection_accepted', new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger connections_notify
  after insert or update on public.connections
  for each row execute function public.notify_connection_change();

create function public.notify_meeting_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, event_id, actor_id, kind, ref_id)
    values (new.invitee_id, new.event_id, new.proposer_id, 'meeting_proposed', new.id);
  elsif old.status = 'pending' and new.status in ('accepted', 'declined') then
    insert into public.notifications (user_id, event_id, actor_id, kind, ref_id)
    values (new.proposer_id, new.event_id, new.invitee_id, 'meeting_' || new.status, new.id);
  end if;
  return new;
end;
$$;

create trigger meetings_notify
  after insert or update on public.meetings
  for each row execute function public.notify_meeting_change();

revoke all on function public.guard_meeting() from public, anon, authenticated;
revoke all on function public.guard_notification_read() from public, anon, authenticated;
revoke all on function public.notify_connection_change() from public, anon, authenticated;
revoke all on function public.notify_meeting_change() from public, anon, authenticated;
