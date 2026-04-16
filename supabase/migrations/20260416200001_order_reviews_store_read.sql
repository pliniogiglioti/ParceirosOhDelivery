-- Permite que a loja leia as avaliações dos seus pedidos
drop policy if exists "store_read_order_reviews" on public.order_reviews;
create policy "store_read_order_reviews"
  on public.order_reviews
  for select to authenticated
  using (public.is_store_owner(store_id));

-- Permite que a loja responda (owner_reply)
alter table public.order_reviews
  add column if not exists owner_reply text,
  add column if not exists owner_replied_at timestamptz;

drop policy if exists "store_update_order_reviews" on public.order_reviews;
create policy "store_update_order_reviews"
  on public.order_reviews
  for update to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- Busca o nome do autor via join com profiles
-- (a página vai fazer join com profiles para pegar o nome)

NOTIFY pgrst, 'reload schema';
