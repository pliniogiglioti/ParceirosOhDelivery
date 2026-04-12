create extension if not exists pgcrypto;

create sequence if not exists public.order_code_seq start 1001;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.next_order_code()
returns text
language sql
as $$
  select '#' || lpad(nextval('public.order_code_seq')::text, 4, '0');
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  marketing_opt_in boolean not null default true,
  order_updates_opt_in boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_token text not null unique,
  display_name text,
  email text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default '🍽️',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.store_categories(id) on delete set null,
  category_name text,
  name text not null,
  slug text not null unique,
  tagline text,
  description text,
  description_long text,
  cover_image_url text,
  logo_image_url text,
  accent_color text not null default '#335374',
  delivery_fee numeric(10,2) not null default 0,
  eta_min integer not null default 20,
  eta_max integer not null default 40,
  min_order_amount numeric(10,2) not null default 0,
  rating numeric(3,2) not null default 4.5,
  review_count integer not null default 0,
  is_featured boolean not null default false,
  is_open boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  week_day smallint not null check (week_day between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  store_slug text,
  title text not null,
  subtitle text,
  cta_label text not null default 'Ver loja',
  gradient_class text not null default 'from-coral-400 via-coral-500 to-sand-500',
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  icon text not null default '🍽️',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  prep_time_label text,
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_token text,
  label text not null,
  street text not null,
  number text not null,
  neighborhood text not null,
  city text not null,
  state text not null,
  zip_code text,
  complement text,
  instructions text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint addresses_owner_check check (profile_id is not null or guest_token is not null)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default public.next_order_code(),
  store_id uuid not null references public.stores(id) on delete restrict,
  store_name text not null,
  store_slug text,
  profile_id uuid references public.profiles(id) on delete set null,
  guest_token text,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'confirmado', 'preparo', 'a_caminho', 'entregue', 'cancelado')),
  fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery', 'pickup')),
  payment_method text not null default 'Pix'
    check (payment_method in ('Pix', 'Cartão', 'Dinheiro')),
  payment_status text not null default 'pendente'
    check (payment_status in ('pendente', 'confirmado', 'estornado')),
  eta_max_minutes integer,
  subtotal_amount numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  service_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  address_label text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_owner_check check (profile_id is not null or guest_token is not null)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  selected_options jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null
    check (status in ('aguardando', 'confirmado', 'preparo', 'a_caminho', 'entregue', 'cancelado')),
  label text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.favorite_stores (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, store_id)
);

create index if not exists idx_stores_active_sort on public.stores(active, sort_order);
create index if not exists idx_stores_slug on public.stores(slug);
create index if not exists idx_products_store_sort on public.products(store_id, sort_order);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_product_categories_store_sort on public.product_categories(store_id, sort_order);
create index if not exists idx_orders_profile_created on public.orders(profile_id, created_at desc);
create index if not exists idx_orders_guest_created on public.orders(guest_token, created_at desc);
create index if not exists idx_orders_store_created on public.orders(store_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_addresses_profile on public.addresses(profile_id);
create index if not exists idx_favorite_stores_profile on public.favorite_stores(profile_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = timezone('utc', now());

  insert into public.user_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.store_categories enable row level security;
alter table public.stores enable row level security;
alter table public.store_hours enable row level security;
alter table public.store_banners enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.favorite_stores enable row level security;

drop policy if exists "public can read active store categories" on public.store_categories;
create policy "public can read active store categories"
on public.store_categories
for select
using (active = true);

drop policy if exists "public can read active stores" on public.stores;
create policy "public can read active stores"
on public.stores
for select
using (active = true);

drop policy if exists "public can read store banners" on public.store_banners;
create policy "public can read store banners"
on public.store_banners
for select
using (active = true);

drop policy if exists "public can read product categories" on public.product_categories;
create policy "public can read product categories"
on public.product_categories
for select
using (active = true);

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products
for select
using (active = true);

drop policy if exists "public can read store hours" on public.store_hours;
create policy "public can read store hours"
on public.store_hours
for select
using (true);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users read own preferences" on public.user_preferences;
create policy "users read own preferences"
on public.user_preferences
for select
using (auth.uid() = profile_id);

drop policy if exists "users update own preferences" on public.user_preferences;
create policy "users update own preferences"
on public.user_preferences
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "authenticated can insert visitor sessions" on public.visitor_sessions;
create policy "authenticated can insert visitor sessions"
on public.visitor_sessions
for insert
to authenticated, anon
with check (guest_token is not null);

drop policy if exists "users read own addresses" on public.addresses;
create policy "users read own addresses"
on public.addresses
for select
using (auth.uid() = profile_id);

drop policy if exists "users manage own addresses" on public.addresses;
create policy "users manage own addresses"
on public.addresses
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "guests can create addresses" on public.addresses;
create policy "guests can create addresses"
on public.addresses
for insert
to anon
with check (guest_token is not null and profile_id is null);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
on public.orders
for select
using (auth.uid() = profile_id);

drop policy if exists "users create own orders" on public.orders;
create policy "users create own orders"
on public.orders
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "guests can create orders" on public.orders;
create policy "guests can create orders"
on public.orders
for insert
to anon
with check (guest_token is not null and profile_id is null);

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.profile_id = auth.uid()
  )
);

drop policy if exists "users create own order items" on public.order_items;
create policy "users create own order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.profile_id = auth.uid()
  )
);

drop policy if exists "guests can create order items" on public.order_items;
create policy "guests can create order items"
on public.order_items
for insert
to anon
with check (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.guest_token is not null
  )
);

drop policy if exists "users read own order events" on public.order_status_events;
create policy "users read own order events"
on public.order_status_events
for select
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_status_events.order_id
      and public.orders.profile_id = auth.uid()
  )
);

drop policy if exists "users manage favorite stores" on public.favorite_stores;
create policy "users manage favorite stores"
on public.favorite_stores
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);


