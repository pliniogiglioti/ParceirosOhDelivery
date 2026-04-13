-- Adiciona motivo de cancelamento ao pedido
-- O app do cliente pode exibir este campo no detalhe do pedido

alter table public.orders
  add column if not exists cancellation_reason text;
