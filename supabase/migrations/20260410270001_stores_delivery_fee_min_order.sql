alter table public.stores
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists min_order_amount numeric(10,2) not null default 0;
