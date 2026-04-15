-- Adiciona coluna de resposta do dono na tabela store_reviews
alter table public.store_reviews
  add column if not exists owner_reply text,
  add column if not exists owner_replied_at timestamptz;

-- Permite que o dono da loja atualize a resposta
drop policy if exists "store_reviews_owner_reply" on public.store_reviews;
create policy "store_reviews_owner_reply" on public.store_reviews
  for update to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

NOTIFY pgrst, 'reload schema';
