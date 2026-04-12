-- Restaura colunas que o painel parceiro removeu mas o app de delivery precisa
alter table public.stores
  add column if not exists slug text,
  add column if not exists tagline text,
  add column if not exists accent_color text not null default '#335374';

create unique index if not exists idx_stores_slug_unique on public.stores(slug) where slug is not null;

-- RLS: cliente (anon/authenticated) pode ler lojas aprovadas e ativas
drop policy if exists "public can read active stores" on public.stores;
create policy "public can read active stores"
  on public.stores for select
  using (active = true and registration_status = 'aprovado');

-- RLS: cliente pode ler produtos ativos de lojas aprovadas
drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
  on public.products for select
  using (
    active = true
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.active = true and s.registration_status = 'aprovado'
    )
  );

-- RLS: cliente pode ler categorias de produto de lojas aprovadas
drop policy if exists "public can read product categories" on public.product_categories;
create policy "public can read product categories"
  on public.product_categories for select
  using (
    active = true
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.active = true and s.registration_status = 'aprovado'
    )
  );

notify pgrst, 'reload schema';
