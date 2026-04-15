-- ─────────────────────────────────────────────────────────────────────────────
-- Sabores de pizza
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pizza_flavors (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  description text,
  image_url   text,
  active      boolean not null default true,
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- Preços do sabor por tamanho
create table if not exists public.pizza_flavor_prices (
  id        uuid primary key default gen_random_uuid(),
  flavor_id uuid not null references public.pizza_flavors(id) on delete cascade,
  size_id   uuid not null references public.pizza_sizes(id) on delete cascade,
  store_id  uuid not null references public.stores(id) on delete cascade,
  price     numeric(10,2) not null default 0,
  unique (flavor_id, size_id)
);

-- Índices
create index if not exists idx_pizza_flavors_category on public.pizza_flavors(category_id);
create index if not exists idx_pizza_flavors_store    on public.pizza_flavors(store_id);
create index if not exists idx_pizza_flavor_prices_flavor on public.pizza_flavor_prices(flavor_id);

-- Trigger updated_at
drop trigger if exists pizza_flavors_set_updated_at on public.pizza_flavors;
create trigger pizza_flavors_set_updated_at
  before update on public.pizza_flavors
  for each row execute function public.set_updated_at();

-- RLS
alter table public.pizza_flavors        enable row level security;
alter table public.pizza_flavor_prices  enable row level security;

drop policy if exists "pizza_flavors_owner" on public.pizza_flavors;
create policy "pizza_flavors_owner"
  on public.pizza_flavors for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "pizza_flavors_public_read" on public.pizza_flavors;
create policy "pizza_flavors_public_read"
  on public.pizza_flavors for select using (active = true);

drop policy if exists "pizza_flavor_prices_owner" on public.pizza_flavor_prices;
create policy "pizza_flavor_prices_owner"
  on public.pizza_flavor_prices for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "pizza_flavor_prices_public_read" on public.pizza_flavor_prices;
create policy "pizza_flavor_prices_public_read"
  on public.pizza_flavor_prices for select using (true);
