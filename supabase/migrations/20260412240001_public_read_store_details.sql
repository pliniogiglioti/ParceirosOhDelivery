-- Leitura pública: meios de pagamento, avaliações e horários
drop policy if exists "public_read_store_payment_methods" on public.store_payment_methods;
create policy "public_read_store_payment_methods"
  on public.store_payment_methods for select
  using (active = true);

drop policy if exists "public_read_store_payment_brands" on public.store_payment_brands;
create policy "public_read_store_payment_brands"
  on public.store_payment_brands for select
  using (active = true);

drop policy if exists "public_read_store_reviews" on public.store_reviews;
create policy "public_read_store_reviews"
  on public.store_reviews for select
  using (true);

notify pgrst, 'reload schema';
