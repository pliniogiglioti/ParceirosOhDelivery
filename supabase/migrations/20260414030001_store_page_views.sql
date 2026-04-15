-- Visitas à página da loja (enviadas pelo app do cliente)
create table if not exists public.store_page_views (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  session_id text,                    -- identificador anônimo da sessão
  source     text,                    -- ex: 'home', 'search', 'direct'
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_store_page_views_store_created
  on public.store_page_views(store_id, created_at desc);

alter table public.store_page_views enable row level security;

-- Parceiro lê as visitas da própria loja
drop policy if exists "store_page_views_owner_read" on public.store_page_views;
create policy "store_page_views_owner_read"
  on public.store_page_views for select to authenticated
  using (public.is_store_owner(store_id));

-- App do cliente (anon/authenticated) pode inserir visitas
drop policy if exists "store_page_views_insert" on public.store_page_views;
create policy "store_page_views_insert"
  on public.store_page_views for insert
  to anon, authenticated
  with check (true);
