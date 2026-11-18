-- Jednokratni kod za razmenu kontakta uživo. Klijent i dalje ne sme sam da upiše accepted.

create table public.swap_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint swap_tokens_length check (char_length(token) between 16 and 80)
);

create index swap_tokens_owner_event_idx on public.swap_tokens (owner_id, event_id);

-- Trajanje i vlasnik dolaze sa servera, ne iz telefona.
create function public.stamp_swap_token()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.owner_id = auth.uid();
    new.expires_at = now() + interval '5 minutes';
    new.used_at = null;
  end if;
  return new;
end;
$$;

create trigger swap_tokens_stamp
  before insert on public.swap_tokens
  for each row execute function public.stamp_swap_token();

create function public.swap_contact(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  pass public.swap_tokens;
  existing public.connections;
  contact_id uuid;
begin
  if me is null then
    raise exception 'Nisi prijavljen.';
  end if;
  if token is null or char_length(token) < 16 or char_length(token) > 80 then
    raise exception 'Ovaj kod nije ispravan. Skeniraj ponovo.';
  end if;

  select * into pass
  from public.swap_tokens
  where swap_tokens.token = swap_contact.token
  for update;

  if not found or pass.used_at is not null or pass.expires_at <= now() then
    raise exception 'Ovaj kod je istekao. Zamoli osobu da otvori Razmeni kontakt ponovo.';
  end if;
  if pass.owner_id = me then
    raise exception 'Ovo je tvoj kod. Skeniraj tuđi.';
  end if;
  if not exists (
    select 1 from public.event_attendees mine
    where mine.event_id = pass.event_id and mine.user_id = me
  ) then
    raise exception 'Ovaj kod je sa drugog eventa. Skeniraj kod osobe sa ovog eventa.';
  end if;
  if not exists (
    select 1 from public.event_attendees owner
    where owner.event_id = pass.event_id and owner.user_id = pass.owner_id
  ) then
    raise exception 'Ova osoba nije na ovom eventu.';
  end if;

  select * into existing
  from public.connections
  where event_id = pass.event_id
    and (
      (requester_id = me and receiver_id = pass.owner_id)
      or (requester_id = pass.owner_id and receiver_id = me)
    )
  limit 1;

  if existing.id is null then
    insert into public.connections (event_id, requester_id, receiver_id, status, source)
    values (pass.event_id, me, pass.owner_id, 'accepted', 'qr');
  elsif existing.status = 'pending' then
    update public.connections set status = 'accepted' where id = existing.id;
  elsif existing.status is distinct from 'accepted' then
    raise exception 'Ova razmena je ranije odbijena. Kontakt se ne deli ponovo.';
  end if;

  update public.swap_tokens set used_at = now() where id = pass.id;

  select id into contact_id
  from public.contacts
  where owner_id = me and contact_user_id = pass.owner_id;

  if contact_id is null then
    raise exception 'Kontakt nije napravljen. Pokušaj ponovo.';
  end if;
  return contact_id;
end;
$$;

alter table public.swap_tokens enable row level security;

create policy swap_tokens_select on public.swap_tokens
  for select to authenticated
  using (owner_id = auth.uid());

create policy swap_tokens_insert on public.swap_tokens
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.event_attendees mine
      where mine.event_id = swap_tokens.event_id and mine.user_id = auth.uid()
    )
  );

create policy swap_tokens_delete on public.swap_tokens
  for delete to authenticated
  using (owner_id = auth.uid() and used_at is null);

revoke all on public.swap_tokens from anon, authenticated;
grant select, insert, delete on public.swap_tokens to authenticated;

revoke all on function public.swap_contact(text) from public, anon;
grant execute on function public.swap_contact(text) to authenticated;
