## Banco Supabase

Este diretorio tem o schema usado pelo painel parceiro.

Arquivos:
- `schema.sql`: cria as tabelas usadas pela dashboard

Fluxo:
1. Crie um banco Supabase vazio.
2. Rode `schema.sql`.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no Vercel.

Tabelas incluídas:
- `store_categories`
- `stores`
- `store_hours`
- `product_categories`
- `products`
- `delivery_areas`
- `store_reviews`
- `orders`
- `order_items`
- `chat_sessions`
- `chat_messages`
