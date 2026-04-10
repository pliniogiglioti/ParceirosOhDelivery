-- Cria as tabelas delivery_areas e store_reviews que estavam no schema mas não nas migrations

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  eta_label text,
  fee numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_delivery_areas_store_sort on public.delivery_areas(store_id, sort_order);

alter table public.delivery_areas enable row level security;

drop policy if exists "delivery_areas_all" on public.delivery_areas;
create policy "delivery_areas_all" on public.delivery_areas
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_store_reviews_store_created on public.store_reviews(store_id, created_at desc);

alter table public.store_reviews enable row level security;

drop policy if exists "store_reviews_store_owner" on public.store_reviews;
create policy "store_reviews_store_owner" on public.store_reviews
  for select to authenticated
  using (public.is_store_owner(store_id));

NOTIFY pgrst, 'reload schema';
