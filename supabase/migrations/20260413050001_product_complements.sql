-- ─────────────────────────────────────────────────────────────────────────────
-- Biblioteca de complementos da loja
-- Itens reutilizáveis criados pelo parceiro (nome, descrição, preço)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.complement_library (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grupos de complementos de um produto
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.product_complement_groups (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  required    boolean not null default false,
  min_qty     integer not null default 0,
  max_qty     integer not null default 1,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Itens dentro de cada grupo
-- Pode vir da biblioteca (source = 'biblioteca') ou de um industrializado
-- Os dados são desnormalizados para evitar joins no checkout
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.product_complement_items (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.product_complement_groups(id) on delete cascade,
  store_id          uuid not null references public.stores(id) on delete cascade,
  source            text not null default 'biblioteca'
                      check (source in ('biblioteca', 'industrializado')),
  library_item_id   uuid references public.complement_library(id) on delete set null,
  industrialized_id bigint references public.industrializados(id) on delete set null,
  -- dados desnormalizados
  name              text not null,
  description       text,
  price             numeric(10,2) not null default 0,
  image_url         text,
  sort_order        integer not null default 0,
  active            boolean not null default true,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_complement_library_store
  on public.complement_library(store_id);

create index if not exists idx_product_complement_groups_product
  on public.product_complement_groups(product_id);

create index if not exists idx_product_complement_groups_store
  on public.product_complement_groups(store_id);

create index if not exists idx_product_complement_items_group
  on public.product_complement_items(group_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists complement_library_set_updated_at on public.complement_library;
create trigger complement_library_set_updated_at
  before update on public.complement_library
  for each row execute function public.set_updated_at();

drop trigger if exists product_complement_groups_set_updated_at on public.product_complement_groups;
create trigger product_complement_groups_set_updated_at
  before update on public.product_complement_groups
  for each row execute function public.set_updated_at();

drop trigger if exists product_complement_items_set_updated_at on public.product_complement_items;
create trigger product_complement_items_set_updated_at
  before update on public.product_complement_items
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.complement_library enable row level security;
alter table public.product_complement_groups enable row level security;
alter table public.product_complement_items enable row level security;

-- complement_library
drop policy if exists "complement_library_owner" on public.complement_library;
create policy "complement_library_owner"
  on public.complement_library
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "complement_library_public_read" on public.complement_library;
create policy "complement_library_public_read"
  on public.complement_library
  for select
  using (active = true);

-- product_complement_groups
drop policy if exists "complement_groups_owner" on public.product_complement_groups;
create policy "complement_groups_owner"
  on public.product_complement_groups
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "complement_groups_public_read" on public.product_complement_groups;
create policy "complement_groups_public_read"
  on public.product_complement_groups
  for select
  using (true);

-- product_complement_items
drop policy if exists "complement_items_owner" on public.product_complement_items;
create policy "complement_items_owner"
  on public.product_complement_items
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "complement_items_public_read" on public.product_complement_items;
create policy "complement_items_public_read"
  on public.product_complement_items
  for select
  using (active = true);
