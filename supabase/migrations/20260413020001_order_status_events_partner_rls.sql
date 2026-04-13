-- Parceiro pode inserir eventos de status para pedidos da loja
drop policy if exists "store owner insert order events" on public.order_status_events;
create policy "store owner insert order events"
  on public.order_status_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where public.orders.id = order_status_events.order_id
        and public.is_store_owner(public.orders.store_id)
    )
  );

-- Parceiro pode ler eventos de status dos pedidos da loja
drop policy if exists "store owner read order events" on public.order_status_events;
create policy "store owner read order events"
  on public.order_status_events for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = order_status_events.order_id
        and public.is_store_owner(public.orders.store_id)
    )
  );
