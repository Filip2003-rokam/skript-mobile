-- Odjava briše token ovog uređaja. Bez ove politike delete ne skida nijedan red.

create policy push_tokens_delete on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());

grant delete on public.push_tokens to authenticated;
