-- support_tickets: chamados abertos pelos parceiros na Central de Ajuda
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  protocol    text not null,
  title       text not null,
  category    text not null check (category in ('financeiro', 'pedido', 'cardapio', 'tecnico', 'outro')),
  description text not null default '',
  status      text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índice para buscas por loja
create index if not exists support_tickets_store_id_idx on public.support_tickets(store_id);

-- RLS
alter table public.support_tickets enable row level security;

-- Parceiro pode ver apenas os chamados da própria loja
create policy "partner_select_own_tickets"
  on public.support_tickets for select
  using (
    store_id in (
      select id from public.stores
      where partner_email = (auth.jwt() ->> 'email')
    )
  );

-- Parceiro pode inserir chamados apenas para a própria loja
create policy "partner_insert_own_tickets"
  on public.support_tickets for insert
  with check (
    store_id in (
      select id from public.stores
      where partner_email = (auth.jwt() ->> 'email')
    )
  );

-- Trigger para manter updated_at sincronizado
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();
