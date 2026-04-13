-- Garante que cliente (anon + authenticated) consegue ler lojas e produtos
-- independente das policies do painel parceiro/admin

-- STORES: leitura pública para lojas ativas e aprovadas
drop policy if exists "public can read active stores" on public.stores;
drop policy if exists "stores_select_own" on public.stores;

-- Policy para parceiro ver a própria loja (inclui não aprovadas)
create policy "stores_select_own"
  on public.stores for select
  to authenticated
  using (partner_email = auth.email());

-- Policy pública para cliente ver lojas aprovadas e ativas
create policy "public can read active stores"
  on public.stores for select
  using (active = true and registration_status = 'aprovado');

-- PRODUCTS: leitura pública
drop policy if exists "public can read active products" on public.products;
drop policy if exists "products_all" on public.products;

create policy "products_all"
  on public.products for all
  to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.partner_email = auth.email()
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.partner_email = auth.email()
    )
  );

create policy "public can read active products"
  on public.products for select
  using (active = true);

-- PRODUCT_CATEGORIES: leitura pública
drop policy if exists "public can read product categories" on public.product_categories;
drop policy if exists "product_categories_all" on public.product_categories;

create policy "product_categories_all"
  on public.product_categories for all
  to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.partner_email = auth.email()
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.partner_email = auth.email()
    )
  );

create policy "public can read product categories"
  on public.product_categories for select
  using (active = true);

-- STORE_BANNERS: leitura pública
drop policy if exists "public can read store banners" on public.store_banners;
create policy "public can read store banners"
  on public.store_banners for select
  using (active = true);

notify pgrst, 'reload schema';
