-- Adiciona status aguardando_pagamento e campo payment_expires_at em orders

-- 1. Atualiza o check constraint de status para incluir aguardando_pagamento
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('aguardando_pagamento', 'aguardando', 'confirmado', 'preparo', 'a_caminho', 'entregue', 'cancelado'));

-- 2. Adiciona coluna payment_expires_at (quando o pagamento expira)
alter table public.orders
  add column if not exists payment_expires_at timestamptz;

-- 3. Índice para o job de cancelamento automático
create index if not exists idx_orders_payment_expires
  on public.orders(payment_expires_at)
  where status = 'aguardando_pagamento';

-- 4. Função que cancela pedidos com pagamento expirado
create or replace function public.cancel_expired_payment_orders()
returns integer
language plpgsql
security definer
as $$
declare
  cancelled_count integer;
begin
  update public.orders
  set
    status = 'cancelado',
    cancellation_reason = 'Pagamento nao realizado dentro do prazo de 15 minutos.',
    updated_at = timezone('utc', now())
  where
    status = 'aguardando_pagamento'
    and payment_expires_at < timezone('utc', now());

  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$$;

-- 5. Habilita pg_cron se disponível e agenda o job a cada minuto
-- (só executa se a extensão pg_cron estiver disponível)
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'cancel-expired-payments',
      '* * * * *',
      'select public.cancel_expired_payment_orders()'
    );
  end if;
exception when others then
  -- pg_cron não disponível, ignora silenciosamente
  null;
end;
$$;

NOTIFY pgrst, 'reload schema';
