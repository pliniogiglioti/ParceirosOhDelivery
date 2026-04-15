-- Eventos de funil de vendas por loja
-- Enviados pelo app do cliente em cada etapa
create table if not exists public.store_funnel_events (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  event_type text not null check (event_type in (
    'visita',           -- usuário abre a página da loja
    'visualizacao',     -- usuário abre a página de um produto
    'sacola',           -- usuário adiciona item ao carrinho
    'revisao',          -- usuário abre o checkout/revisão do pedido
    'venda'             -- pedido confirmado (pode ser calculado de orders)
  )),
  session_id  text,
  product_id  uuid references public.products(id) on delete set null,
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists idx_store_funnel_events_store_type_created
  on public.store_funnel_events(store_id, event_type, created_at desc);

alter table public.store_funnel_events enable row level security;

-- Parceiro lê os eventos da própria loja
drop policy if exists "funnel_events_owner_read" on public.store_funnel_events;
create policy "funnel_events_owner_read"
  on public.store_funnel_events for select to authenticated
  using (public.is_store_owner(store_id));

-- App do cliente insere eventos
drop policy if exists "funnel_events_insert" on public.store_funnel_events;
create policy "funnel_events_insert"
  on public.store_funnel_events for insert
  to anon, authenticated
  with check (true);
