-- Nacrt follow-up mejla ostaje na kontaktu. Telefon ga ne šalje.
alter table public.contacts
  add column follow_up_draft text;

-- Broj obrada od ponoći. Telefon ovu tabelu ne čita i ne piše.
create table public.voice_note_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index voice_note_runs_user_idx on public.voice_note_runs (user_id, created_at);

alter table public.voice_note_runs enable row level security;

revoke all on public.voice_note_runs from anon, authenticated;
grant all on public.voice_note_runs to service_role;
