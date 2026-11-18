-- Dobrodošlica pre prijave čita samo javne podatke o eventu i sesijama.

create policy events_select_anon on public.events
  for select to anon
  using (true);

create policy event_sessions_select_anon on public.event_sessions
  for select to anon
  using (true);

grant select on public.events to anon;
grant select on public.event_sessions to anon;
