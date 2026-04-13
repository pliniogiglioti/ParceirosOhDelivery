-- Remove o check constraint que limita os meios de pagamento
-- Agora aceita qualquer string (ex: "Cartao de Credito • Mastercard final 1451")
alter table public.orders
  drop constraint if exists orders_payment_method_check;
