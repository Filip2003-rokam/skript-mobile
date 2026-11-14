-- Učesnik vidi ime i mrežni profil samo ljudi sa istog eventa.
-- Funkcija je security definer da čitanje event_attendees ne poziva sopstvenu politiku.

create function public.shares_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_attendees
    where event_id = target_event_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.shares_event(uuid) from public;
grant execute on function public.shares_event(uuid) to authenticated;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.event_attendees theirs
      where theirs.user_id = profiles.id
        and public.shares_event(theirs.event_id)
    )
  );

drop policy event_attendees_select on public.event_attendees;
create policy event_attendees_select on public.event_attendees
  for select to authenticated
  using (public.shares_event(event_id));
