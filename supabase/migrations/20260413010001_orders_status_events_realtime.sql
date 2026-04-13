-- Habilita realtime para order_status_events
alter publication supabase_realtime add table public.order_status_events;

-- RLS: cliente lê eventos dos próprios pedidos
drop policy if exists "users read own order events" on public.order_status_events;
create policy "users read own order events"
  on public.order_status_events for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = order_status_events.order_id
        and public.orders.profile_id = auth.uid()
    )
  );
