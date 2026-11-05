-- Model podataka za Skript. Pristup je u politikama ispod, bez pomoćnih funkcija.
-- Funkcije koje postoje služe samo trigerima: Postgres ne ume triger bez funkcije.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  linkedin_url text,
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text,
  dates_label text,
  starts_on date,
  days int,
  rooms text[] not null default '{}',
  color text,
  cover_url text,
  logo_url text,
  matching_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  room text,
  day int,
  start_time time,
  duration_min int,
  speakers text[] not null default '{}'
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  why text[] not null default '{}',
  role text,
  company text,
  offers text[] not null default '{}',
  needs text[] not null default '{}',
  in_room boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (event_id, user_id),
  constraint event_attendees_why_check check (
    why <@ array['Sell', 'Find clients', 'Buy', 'Invest', 'Raise', 'Hire', 'Find partners', 'Learn']::text[]
  ),
  constraint event_attendees_role_check check (
    role is null or role in (
      'Founder', 'Investor', 'Sales', 'Product', 'Engineering', 'Marketing', 'Student', 'Other'
    )
  ),
  constraint event_attendees_offers_check check (
    offers <@ array['Software development', 'Design', 'Funding', 'Sales intros', 'Marketing', 'Mentoring']::text[]
  ),
  constraint event_attendees_needs_check check (
    needs <@ array['Clients', 'Funding', 'Developers', 'Partners', 'Hiring', 'Marketing']::text[]
  )
);

create table public.saved_people (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  saved_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id, saved_user_id)
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text,
  source text not null check (source in ('match', 'qr')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (event_id, requester_id, receiver_id),
  constraint connections_not_self check (requester_id <> receiver_id),
  constraint connections_message_length check (message is null or char_length(message) <= 280)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  full_name text not null,
  job_title text,
  company text,
  email text,
  phone text,
  linkedin_url text,
  note text,
  follow_up_date date,
  follow_up_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, contact_user_id)
);

create table public.match_suggestions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  suggested_user_id uuid not null references auth.users (id) on delete cascade,
  score int not null check (score between 1 and 10),
  why text,
  matched_mine text,
  matched_theirs text,
  openers text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (event_id, user_id, suggested_user_id),
  constraint match_suggestions_not_self check (user_id <> suggested_user_id)
);

create table public.match_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text primary key,
  platform text,
  updated_at timestamptz not null default now()
);

create index event_sessions_event_id_idx on public.event_sessions (event_id);
create index event_attendees_user_id_idx on public.event_attendees (user_id);
create index saved_people_event_id_idx on public.saved_people (event_id);
create index saved_people_saved_user_id_idx on public.saved_people (saved_user_id);
create index connections_requester_id_idx on public.connections (requester_id);
create index connections_receiver_id_idx on public.connections (receiver_id);
create index contacts_contact_user_id_idx on public.contacts (contact_user_id);
create index contacts_event_id_idx on public.contacts (event_id);
create index match_suggestions_user_id_idx on public.match_suggestions (user_id);
create index match_runs_user_event_idx on public.match_runs (user_id, event_id);
create index push_tokens_user_id_idx on public.push_tokens (user_id);

-- Novi nalog dobija javni profil i privatni red sa mejlom.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''));

  insert into public.profile_private (user_id, email)
  values (new.id, new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prihvaćen zahtev upisuje vreme odgovora i po jedan kontakt za obe strane.
create function public.handle_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  side record;
begin
  if new.requester_id is distinct from old.requester_id
    or new.receiver_id is distinct from old.receiver_id
    or new.event_id is distinct from old.event_id
    or new.message is distinct from old.message
    or new.source is distinct from old.source
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Može se menjati samo status zahteva';
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
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
  end if;

  return new;
end;
$$;

create trigger on_connection_accepted
  before update on public.connections
  for each row execute function public.handle_connection_accepted();

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.events enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_attendees enable row level security;
alter table public.saved_people enable row level security;
alter table public.connections enable row level security;
alter table public.contacts enable row level security;
alter table public.match_suggestions enable row level security;
alter table public.match_runs enable row level security;
alter table public.push_tokens enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profile_private_all on public.profile_private
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy events_select on public.events
  for select to authenticated
  using (true);

create policy event_sessions_select on public.event_sessions
  for select to authenticated
  using (true);

create policy event_attendees_select on public.event_attendees
  for select to authenticated
  using (true);

create policy event_attendees_insert on public.event_attendees
  for insert to authenticated
  with check (user_id = auth.uid());

create policy event_attendees_update on public.event_attendees
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy event_attendees_delete on public.event_attendees
  for delete to authenticated
  using (user_id = auth.uid());

create policy saved_people_own on public.saved_people
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy connections_select on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

create policy connections_insert on public.connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.event_attendees mine
      where mine.event_id = connections.event_id and mine.user_id = auth.uid()
    )
    and exists (
      select 1 from public.event_attendees other
      where other.event_id = connections.event_id and other.user_id = connections.receiver_id
    )
  );

create policy connections_update on public.connections
  for update to authenticated
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid() and status in ('accepted', 'declined'));

create policy contacts_own on public.contacts
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy match_suggestions_select on public.match_suggestions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_tokens_select on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_tokens_update on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.profiles, public.profile_private, public.events, public.event_sessions,
  public.event_attendees, public.saved_people, public.connections, public.contacts,
  public.match_suggestions, public.match_runs, public.push_tokens
  from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_private to authenticated;
grant select on public.events to authenticated;
grant select on public.event_sessions to authenticated;
grant select, insert, update, delete on public.event_attendees to authenticated;
grant select, insert, update, delete on public.saved_people to authenticated;
grant select, insert, update on public.connections to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select on public.match_suggestions to authenticated;
grant select, insert, update on public.push_tokens to authenticated;

grant all on public.profiles, public.profile_private, public.events, public.event_sessions,
  public.event_attendees, public.saved_people, public.connections, public.contacts,
  public.match_suggestions, public.match_runs, public.push_tokens
  to service_role;
