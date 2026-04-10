alter table public.stores
  drop column if exists tagline,
  drop column if exists accent_color,
  drop column if exists slug;
