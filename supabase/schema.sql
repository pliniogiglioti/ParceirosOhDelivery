create extension if not exists pgcrypto;

-- Dados principais do estabelecimento consumidos pelo painel parceiro.
-- A pagina "Loja" usa principalmente: slug, is_open, eta_min, eta_max,
-- delivery_fee, tagline e os metadados visuais da loja.
create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default 'MENU',
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

-- Grade semanal exibida e editada na pagina de horarios.
create table if not exists public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  week_day smallint not null check (week_day between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  icon text not null default 'MENU',
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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_name text not null,
  store_slug text,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'confirmado', 'preparo', 'a_caminho', 'entregue', 'cancelado')),
  fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery', 'pickup')),
  payment_method text not null default 'Pix'
    check (payment_method in ('Pix', 'Cartao', 'Dinheiro')),
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
  updated_at timestamptz not null default timezone('utc', now())
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

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  order_code text not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('user', 'store')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_stores_active_sort on public.stores(active, sort_order);
create index if not exists idx_store_hours_store_day on public.store_hours(store_id, week_day);
create index if not exists idx_products_store_sort on public.products(store_id, sort_order);
create index if not exists idx_product_categories_store_sort on public.product_categories(store_id, sort_order);
create index if not exists idx_orders_store_created on public.orders(store_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_chat_sessions_store_updated on public.chat_sessions(store_id, updated_at desc);
create index if not exists idx_chat_messages_chat_created on public.chat_messages(chat_id, created_at asc);
