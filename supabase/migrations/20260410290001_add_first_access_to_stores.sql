alter table public.stores
  add column if not exists first_access boolean;

update public.stores
set first_access = true
where first_access is null;

alter table public.stores
  alter column first_access set default false;

alter table public.stores
  alter column first_access set not null;
