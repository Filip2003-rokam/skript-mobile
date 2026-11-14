-- Slepo interesovanje. Kontakte i dalje pravi samo handle_connection_accepted.

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('interested', 'skipped')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id, target_user_id),
  constraint interests_not_self check (user_id <> target_user_id)
);

create index interests_user_event_idx on public.interests (user_id, event_id);

insert into public.interests (event_id, user_id, target_user_id, kind, created_at)
select event_id, requester_id, receiver_id, 'interested', created_at
from public.connections
where source = 'match' and status = 'pending';

delete from public.connections
where source = 'match' and status = 'pending';

-- Isti upis kontakata za UPDATE pending -> accepted i za INSERT koji je već accepted.
create or replace function public.handle_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  side record;
begin
  if tg_op = 'UPDATE' then
    if new.requester_id is distinct from old.requester_id
      or new.receiver_id is distinct from old.receiver_id
      or new.event_id is distinct from old.event_id
      or new.message is distinct from old.message
      or new.source is distinct from old.source
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Može se menjati samo status zahteva';
    end if;

    if old.status is distinct from 'pending' or new.status is distinct from 'accepted' then
      return new;
    end if;
  elsif new.status is distinct from 'accepted' then
    return new;
  end if;

  new.responded_at = now();

  for side in
    select new.requester_id as owner_id, new.receiver_id as other_id
    union all
    select new.receiver_id, new.requester_id
  loop
    insert into public.contacts (
      owner_id, contact_user_id, event_id, full_name, job_title, company, email, phone, linkedin_url
    )
    select
      side.owner_id,
      side.other_id,
      new.event_id,
      coalesce(p.full_name, ''),
      a.role,
      a.company,
      priv.email,
      priv.phone,
      priv.linkedin_url
    from public.profiles p
    left join public.event_attendees a
      on a.event_id = new.event_id and a.user_id = side.other_id
    left join public.profile_private priv
      on priv.user_id = side.other_id
    where p.id = side.other_id
    on conflict (owner_id, contact_user_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger on_connection_accepted on public.connections;

create trigger on_connection_accepted
  before insert or update on public.connections
  for each row execute function public.handle_connection_accepted();

-- Šesto otvoreno interesovanje staje ovde, ne na ekranu.
create function public.limit_open_interests()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  open_count int;
begin
  if new.kind <> 'interested' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text || new.event_id::text));

  select count(*) into open_count
  from public.interests i
  where i.event_id = new.event_id
    and i.user_id = new.user_id
    and i.kind = 'interested'
    and not exists (
      select 1
      from public.connections c
      where c.event_id = i.event_id
        and c.status = 'accepted'
        and (
          (c.requester_id = i.user_id and c.receiver_id = i.target_user_id)
          or (c.requester_id = i.target_user_id and c.receiver_id = i.user_id)
        )
    );

  if open_count >= 5 then
    raise exception 'Imaš već 5 otvorenih interesovanja. Povuci jedno pa pokušaj ponovo.';
  end if;

  return new;
end;
$$;

-- Vidi i tuđe interesovanje, koje politika krije, i upisuje prihvaćenu vezu.
create function public.match_mutual_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'interested' then
    return new;
  end if;

  if not exists (
    select 1
    from public.interests other
    where other.event_id = new.event_id
      and other.user_id = new.target_user_id
      and other.target_user_id = new.user_id
      and other.kind = 'interested'
  ) then
    return new;
  end if;

  -- Bilo koji stari red, u bilo kom smeru, ostaje. Odbijen i QR se ne prepisuju.
  if exists (
    select 1
    from public.connections c
    where c.event_id = new.event_id
      and (
        (c.requester_id = new.user_id and c.receiver_id = new.target_user_id)
        or (c.requester_id = new.target_user_id and c.receiver_id = new.user_id)
      )
  ) then
    return new;
  end if;

  begin
    insert into public.connections (event_id, requester_id, receiver_id, status, message, source)
    values (new.event_id, new.target_user_id, new.user_id, 'accepted', null, 'match');
  exception
    when unique_violation then
      null;
  end;

  return new;
end;
$$;

create trigger interests_limit
  before insert on public.interests
  for each row execute function public.limit_open_interests();

create trigger interests_mutual
  after insert on public.interests
  for each row execute function public.match_mutual_interest();

insert into public.connections (event_id, requester_id, receiver_id, status, message, source)
select a.event_id, a.user_id, a.target_user_id, 'accepted', null, 'match'
from public.interests a
join public.interests b
  on b.event_id = a.event_id
 and b.user_id = a.target_user_id
 and b.target_user_id = a.user_id
 and a.kind = 'interested'
 and b.kind = 'interested'
 and a.user_id < a.target_user_id
where not exists (
  select 1
  from public.connections c
  where c.event_id = a.event_id
    and (
      (c.requester_id = a.user_id and c.receiver_id = a.target_user_id)
      or (c.requester_id = a.target_user_id and c.receiver_id = a.user_id)
    )
);

alter table public.interests enable row level security;

create policy interests_select on public.interests
  for select to authenticated
  using (user_id = auth.uid());

create policy interests_insert on public.interests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and user_id <> target_user_id
    and exists (
      select 1 from public.event_attendees mine
      where mine.event_id = interests.event_id and mine.user_id = auth.uid()
    )
    and exists (
      select 1 from public.event_attendees other
      where other.event_id = interests.event_id and other.user_id = interests.target_user_id
    )
  );

create policy interests_delete on public.interests
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.interests from anon, authenticated;
grant select, insert, delete on public.interests to authenticated;
grant all on public.interests to service_role;

revoke all on function public.limit_open_interests() from public, anon, authenticated;
revoke all on function public.match_mutual_interest() from public, anon, authenticated;
