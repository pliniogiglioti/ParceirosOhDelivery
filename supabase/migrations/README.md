Ordem inicial das migrations:

1. [20260407000100_initial_schema.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260407000100_initial_schema.sql)
2. [20260407000300_payment_cards.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260407000300_payment_cards.sql)
3. [20260407000400_addresses_formatted_address.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260407000400_addresses_formatted_address.sql)
4. [20260408000100_align_checkout_order_fields.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260408000100_align_checkout_order_fields.sql)
5. [20260408000200_chat_support.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260408000200_chat_support.sql)
6. [20260407000200_seed_marketplace.sql](/Users/renan/Documents/OhDelivery/supabase/migrations/20260407000200_seed_marketplace.sql)

Recomendação:
- novas mudanças de banco devem entrar sempre como novos arquivos incrementais;
- mantenha `schema.sql` e `seed.sql` apenas como snapshot opcional, se quiser;
- não edite migrations antigas depois que elas já tiverem sido aplicadas em produção.
