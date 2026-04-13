-- Corrige RLS de orders para o cliente conseguir criar e ler seus pedidos

-- ORDERS
drop policy if exists "users read own orders" on public.orders;
drop policy if exists "users create own orders" on public.orders;
drop policy if exists "guests can create orders" on public.orders;
drop policy if exists "orders_store_owner" on public.orders;

-- Cliente autenticado lê seus próprios pedidos
create policy "users read own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = profile_id);

-- Cliente autenticado cria pedidos
create policy "users create own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- Parceiro lê pedidos da própria loja
create policy "orders_store_owner"
  on public.orders for all
  to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- ORDER ITEMS
drop policy if exists "users read own order items" on public.order_items;
drop policy if exists "users create own order items" on public.order_items;
drop policy if exists "order_items_store_owner" on public.order_items;

create policy "users read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.profile_id = auth.uid()
    )
  );

create policy "users create own order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.profile_id = auth.uid()
    )
  );

create policy "order_items_store_owner"
  on public.order_items for all
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.is_store_owner(o.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.is_store_owner(o.store_id)
    )
  );

notify pgrst, 'reload schema';
