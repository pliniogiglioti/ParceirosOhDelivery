create table if not exists public.store_order_counters (
  store_id uuid primary key references public.stores(id) on delete cascade,
  last_order_number bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders
  add column if not exists store_order_number bigint;

alter table public.orders
  alter column order_code drop default;

alter table public.orders
  drop constraint if exists orders_order_code_key;

drop trigger if exists orders_assign_store_order_number on public.orders;
drop function if exists public.assign_store_order_number();
drop function if exists public.next_order_code();

drop sequence if exists public.order_code_seq;

with ranked_orders as (
  select
    id,
    row_number() over (
      partition by store_id
      order by created_at asc, id asc
    ) as next_number
  from public.orders
)
update public.orders as orders
set
  store_order_number = ranked_orders.next_number,
  order_code = '#' || ranked_orders.next_number::text
from ranked_orders
where orders.id = ranked_orders.id;

update public.chat_sessions as chat_sessions
set order_code = orders.order_code
from public.orders as orders
where chat_sessions.order_id = orders.id
  and chat_sessions.order_code is distinct from orders.order_code;

insert into public.store_order_counters (store_id, last_order_number)
select
  store_id,
  max(store_order_number) as last_order_number
from public.orders
group by store_id
on conflict (store_id) do update
set
  last_order_number = excluded.last_order_number,
  updated_at = timezone('utc', now());

alter table public.orders
  alter column store_order_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_store_id_store_order_number_key'
  ) then
    alter table public.orders
      add constraint orders_store_id_store_order_number_key unique (store_id, store_order_number);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_store_id_order_code_key'
  ) then
    alter table public.orders
      add constraint orders_store_id_order_code_key unique (store_id, order_code);
  end if;
end
$$;

create index if not exists idx_orders_store_number on public.orders(store_id, store_order_number desc);

create or replace function public.assign_store_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  if new.store_id is null then
    raise exception 'store_id is required to assign store order number';
  end if;

  if new.store_order_number is null then
    insert into public.store_order_counters (store_id, last_order_number)
    values (new.store_id, 1)
    on conflict (store_id) do update
    set
      last_order_number = public.store_order_counters.last_order_number + 1,
      updated_at = timezone('utc', now())
    returning last_order_number into next_number;

    new.store_order_number := next_number;
  else
    insert into public.store_order_counters (store_id, last_order_number)
    values (new.store_id, new.store_order_number)
    on conflict (store_id) do update
    set
      last_order_number = greatest(public.store_order_counters.last_order_number, excluded.last_order_number),
      updated_at = timezone('utc', now());
  end if;

  new.order_code := '#' || new.store_order_number::text;

  return new;
end;
$$;

create trigger orders_assign_store_order_number
before insert on public.orders
for each row execute function public.assign_store_order_number();
