-- ─────────────────────────────────────────────────────────────────────────────
-- Coluna template em product_categories (padrao | pizza)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.product_categories
  add column if not exists template text not null default 'padrao'
    check (template in ('padrao', 'pizza'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Tamanhos de pizza por categoria
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pizza_sizes (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  slices      integer not null default 8,
  max_flavors integer not null default 1 check (max_flavors between 1 and 4),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Massas por tamanho de pizza
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pizza_crusts (
  id         uuid primary key default gen_random_uuid(),
  size_id    uuid not null references public.pizza_sizes(id) on delete cascade,
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  price      numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Bordas por tamanho de pizza
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pizza_edges (
  id         uuid primary key default gen_random_uuid(),
  size_id    uuid not null references public.pizza_sizes(id) on delete cascade,
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  price      numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_pizza_sizes_category on public.pizza_sizes(category_id);
create index if not exists idx_pizza_sizes_store    on public.pizza_sizes(store_id);
create index if not exists idx_pizza_crusts_size    on public.pizza_crusts(size_id);
create index if not exists idx_pizza_edges_size     on public.pizza_edges(size_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists pizza_sizes_set_updated_at on public.pizza_sizes;
create trigger pizza_sizes_set_updated_at
  before update on public.pizza_sizes
  for each row execute function public.set_updated_at();

drop trigger if exists pizza_crusts_set_updated_at on public.pizza_crusts;
create trigger pizza_crusts_set_updated_at
  before update on public.pizza_crusts
  for each row execute function public.set_updated_at();

drop trigger if exists pizza_edges_set_updated_at on public.pizza_edges;
create trigger pizza_edges_set_updated_at
  before update on public.pizza_edges
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pizza_sizes  enable row level security;
alter table public.pizza_crusts enable row level security;
alter table public.pizza_edges  enable row level security;

-- pizza_sizes
drop policy if exists "pizza_sizes_owner" on public.pizza_sizes;
create policy "pizza_sizes_owner"
  on public.pizza_sizes for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "pizza_sizes_public_read" on public.pizza_sizes;
create policy "pizza_sizes_public_read"
  on public.pizza_sizes for select using (true);

-- pizza_crusts
drop policy if exists "pizza_crusts_owner" on public.pizza_crusts;
create policy "pizza_crusts_owner"
  on public.pizza_crusts for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "pizza_crusts_public_read" on public.pizza_crusts;
create policy "pizza_crusts_public_read"
  on public.pizza_crusts for select using (true);

-- pizza_edges
drop policy if exists "pizza_edges_owner" on public.pizza_edges;
create policy "pizza_edges_owner"
  on public.pizza_edges for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "pizza_edges_public_read" on public.pizza_edges;
create policy "pizza_edges_public_read"
  on public.pizza_edges for select using (true);
