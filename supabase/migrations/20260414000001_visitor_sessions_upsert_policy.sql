-- Garante políticas completas para upsert anônimo em visitor_sessions
drop policy if exists "anon_insert_visitor_sessions" on public.visitor_sessions;
drop policy if exists "anon_update_visitor_sessions" on public.visitor_sessions;
drop policy if exists "authenticated can insert visitor sessions" on public.visitor_sessions;

create policy "anon_insert_visitor_sessions"
  on public.visitor_sessions for insert
  to anon, authenticated
  with check (guest_token is not null);

create policy "anon_update_visitor_sessions"
  on public.visitor_sessions for update
  to anon, authenticated
  using (guest_token is not null);
