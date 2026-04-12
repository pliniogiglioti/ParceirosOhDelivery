alter table public.stores
  add column if not exists rejected_at timestamptz,
  add column if not exists reapply_available_at timestamptz;

update public.stores
set
  rejected_at = coalesce(rejected_at, updated_at, created_at),
  reapply_available_at = coalesce(reapply_available_at, coalesce(rejected_at, updated_at, created_at) + interval '48 hours')
where registration_status = 'rejeitado';

update public.stores
set
  rejected_at = null,
  reapply_available_at = null
where registration_status <> 'rejeitado';

create index if not exists idx_stores_partner_email_reapply_window
  on public.stores (lower(partner_email), reapply_available_at desc);

create or replace function public.handle_store_rejection_window()
returns trigger
language plpgsql
as $$
begin
  if new.registration_status = 'rejeitado' then
    if tg_op = 'INSERT' or old.registration_status is distinct from 'rejeitado' then
      new.rejected_at := coalesce(new.rejected_at, timezone('utc', now()));
    end if;

    new.reapply_available_at := coalesce(
      new.reapply_available_at,
      coalesce(new.rejected_at, timezone('utc', now())) + interval '48 hours'
    );
  else
    new.rejected_at := null;
    new.reapply_available_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists stores_rejection_window_trigger on public.stores;
create trigger stores_rejection_window_trigger
before insert or update of registration_status, rejected_at, reapply_available_at
on public.stores
for each row
execute function public.handle_store_rejection_window();

create or replace function public.prevent_store_reapply_before_window()
returns trigger
language plpgsql
as $$
declare
  blocked_until timestamptz;
begin
  select store.reapply_available_at
    into blocked_until
  from public.stores as store
  where lower(coalesce(store.partner_email, '')) = lower(coalesce(new.partner_email, ''))
    and store.registration_status = 'rejeitado'
    and store.reapply_available_at is not null
    and store.reapply_available_at > timezone('utc', now())
  order by store.reapply_available_at desc
  limit 1;

  if blocked_until is not null then
    raise exception 'REAPPLY_BLOCKED'
      using detail = blocked_until::text,
            hint = 'Aguarde 48 horas antes de cadastrar novamente.';
  end if;

  return new;
end;
$$;

drop trigger if exists stores_prevent_reapply_trigger on public.stores;
create trigger stores_prevent_reapply_trigger
before insert on public.stores
for each row
execute function public.prevent_store_reapply_before_window();
