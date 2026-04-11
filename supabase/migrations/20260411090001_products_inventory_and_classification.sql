alter table public.products
  add column if not exists manage_stock boolean not null default false,
  add column if not exists gelada boolean not null default false;

alter table public.products
  alter column stock_quantity drop not null;

update public.products
set manage_stock = true
where stock_quantity is not null;
