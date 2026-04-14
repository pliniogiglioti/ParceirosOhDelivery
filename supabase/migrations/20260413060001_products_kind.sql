alter table public.products
  add column if not exists kind text not null default 'industrializado'
    check (kind in ('industrializado', 'preparado'));
