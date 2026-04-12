alter table public.store_categories
  alter column icon set default '🍽️';

alter table public.product_categories
  alter column icon set default '🍽️';

alter table public.orders
  add column if not exists store_slug text,
  add column if not exists fulfillment_type text default 'delivery',
  add column if not exists eta_max_minutes integer;

update public.orders
set fulfillment_type = case
  when coalesce(address_label, '') ilike '%retirar%' then 'pickup'
  else 'delivery'
end
where fulfillment_type is null;

alter table public.orders
  alter column fulfillment_type set not null,
  alter column fulfillment_type set default 'delivery';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_fulfillment_type_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_fulfillment_type_check
      check (fulfillment_type in ('delivery', 'pickup'));
  end if;
end
$$;

alter table public.order_items
  add column if not exists selected_options jsonb not null default '[]'::jsonb;

create index if not exists idx_orders_store_created on public.orders(store_id, created_at desc);
create index if not exists idx_favorite_stores_profile on public.favorite_stores(profile_id);
