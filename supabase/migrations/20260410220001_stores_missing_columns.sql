alter table public.stores
  add column if not exists pickup_eta integer not null default 15,
  add column if not exists address_street text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip text,
  add column if not exists partner_name text,
  add column if not exists partner_email text,
  add column if not exists partner_role text,
  add column if not exists logistics_courier_mode text;

alter table public.stores
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
