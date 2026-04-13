-- ============================================================
-- Tabela: home_highlights
-- Card "Promoção do dia" e outros cards fixos da home
-- Controlado pelo admin
-- ============================================================
create table if not exists public.home_highlights (
  id          uuid primary key default gen_random_uuid(),
  slot        text not null unique, -- ex: 'promo_do_dia'
  title       text not null,
  subtitle    text not null default '',
  cta_label   text not null default 'Ver ofertas',
  cta_route   text not null default '/app/busca', -- rota interna do app
  image_url   text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger home_highlights_set_updated_at
  before update on public.home_highlights
  for each row execute function public.set_updated_at();

-- RLS: leitura pública, escrita só admin
alter table public.home_highlights enable row level security;

create policy "public_read_home_highlights"
  on public.home_highlights for select
  using (active = true);

create policy "admin_all_home_highlights"
  on public.home_highlights for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- store_banners: adiciona campo type para diferenciar
-- 'destaque' = carrossel de destaques
-- ============================================================
alter table public.store_banners
  add column if not exists type text not null default 'destaque'
    check (type in ('destaque'));

-- RLS admin para store_banners
create policy "admin_all_store_banners"
  on public.store_banners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Seed: card padrão "Promoção do dia"
-- ============================================================
insert into public.home_highlights (slot, title, subtitle, cta_label, cta_route, image_url, active, sort_order)
values (
  'promo_do_dia',
  'Promoção do dia',
  'Cupons, combos e lojas com entrega rápida',
  'Ver ofertas',
  '/app/busca',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  true,
  1
)
on conflict (slot) do nothing;

notify pgrst, 'reload schema';
