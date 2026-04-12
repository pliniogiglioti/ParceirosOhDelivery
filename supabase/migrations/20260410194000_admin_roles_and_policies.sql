-- Align profiles with the admin app contract and allow admin users to manage the platform.
alter table public.profiles
  add column if not exists name text,
  add column if not exists roles text[] not null default '{customer}'::text[];

update public.profiles
set name = coalesce(name, full_name)
where name is null
  and full_name is not null;

update public.profiles
set roles = array_append(roles, 'store_owner')
where email in (
  select distinct partner_email
  from public.stores
  where partner_email is not null
)
and not ('store_owner' = any(roles));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, full_name, name, roles)
  values (new.id, new.email, profile_name, profile_name, '{customer}'::text[])
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and 'admin' = any(roles)
  );
$$;

grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

drop policy if exists admin_profiles_select_all on public.profiles;
create policy admin_profiles_select_all
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists admin_stores_all on public.stores;
create policy admin_stores_all
on public.stores
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admin_orders_select_all on public.orders;
create policy admin_orders_select_all
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists admin_order_items_select_all on public.order_items;
create policy admin_order_items_select_all
on public.order_items
for select
to authenticated
using (public.is_admin());

drop policy if exists admin_store_categories_all on public.store_categories;
create policy admin_store_categories_all
on public.store_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
