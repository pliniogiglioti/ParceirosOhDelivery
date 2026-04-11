alter table public.stores
  add column if not exists contract boolean;

update public.stores
set contract = false
where contract is null;

alter table public.stores
  alter column contract set default false;

alter table public.stores
  alter column contract set not null;
