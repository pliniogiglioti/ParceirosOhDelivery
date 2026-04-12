alter table public.addresses
add column if not exists formatted_address text;
