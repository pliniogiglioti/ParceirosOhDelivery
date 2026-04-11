create table if not exists public.store_payment_methods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, code)
);

create table if not exists public.store_payment_brands (
  id uuid primary key default gen_random_uuid(),
  store_payment_method_id uuid not null references public.store_payment_methods(id) on delete cascade,
  code text not null,
  label text not null,
  logo text not null,
  color text not null,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_payment_method_id, code)
);

create table if not exists public.store_couriers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  name text,
  status text not null default 'pendente'
    check (status in ('ativo', 'pendente')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, email)
);

create index if not exists idx_store_payment_methods_store_sort on public.store_payment_methods(store_id, sort_order);
create index if not exists idx_store_payment_brands_method_sort on public.store_payment_brands(store_payment_method_id, sort_order);
create index if not exists idx_store_couriers_store_created on public.store_couriers(store_id, created_at desc);

alter table public.store_payment_methods enable row level security;
alter table public.store_payment_brands enable row level security;
alter table public.store_couriers enable row level security;

drop policy if exists "store_payment_methods_all" on public.store_payment_methods;
create policy "store_payment_methods_all" on public.store_payment_methods
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

drop policy if exists "store_payment_brands_all" on public.store_payment_brands;
create policy "store_payment_brands_all" on public.store_payment_brands
  for all to authenticated
  using (
    exists (
      select 1
      from public.store_payment_methods spm
      where spm.id = store_payment_method_id
        and public.is_store_owner(spm.store_id)
    )
  )
  with check (
    exists (
      select 1
      from public.store_payment_methods spm
      where spm.id = store_payment_method_id
        and public.is_store_owner(spm.store_id)
    )
  );

drop policy if exists "store_couriers_all" on public.store_couriers;
create policy "store_couriers_all" on public.store_couriers
  for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

notify pgrst, 'reload schema';
