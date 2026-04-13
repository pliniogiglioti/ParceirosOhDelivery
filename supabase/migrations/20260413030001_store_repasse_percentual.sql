-- Adiciona percentual de repasse e data de assinatura do contrato na tabela stores.
-- O percentual padrão é 5% e pode ser alterado pelo admin via painel Supabase ou futura interface administrativa.

alter table public.stores
  add column if not exists repasse_percentual numeric(5,2) not null default 5,
  add column if not exists contract_signed_at timestamptz;

comment on column public.stores.repasse_percentual is
  'Percentual de repasse ao parceiro sobre o faturamento bruto. Padrão: 5%. Configurável pelo admin.';

comment on column public.stores.contract_signed_at is
  'Data e hora em que o parceiro assinou o contrato eletronicamente.';
