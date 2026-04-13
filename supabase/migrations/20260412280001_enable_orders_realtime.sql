-- Habilita o Realtime para a tabela orders
-- Necessário para que novos pedidos apareçam em tempo real no painel do parceiro

alter publication supabase_realtime add table public.orders;
