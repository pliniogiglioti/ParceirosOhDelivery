## Exemplo de Banco

Este diretório tem um exemplo simples de banco compatível com o painel parceiro.

Arquivos:
- `schema.sql`: cria as tabelas usadas pela dashboard
- `seed.sql`: popula uma loja demo chamada `Oh Burger House`

Fluxo sugerido:
1. Crie um banco Postgres ou Supabase vazio.
2. Rode `schema.sql`.
3. Rode `seed.sql`.
4. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`.

Tabelas incluídas:
- `store_categories`
- `stores`
- `store_hours`
- `product_categories`
- `products`
- `orders`
- `order_items`
- `chat_sessions`
- `chat_messages`

Observacao:
Este exemplo foi feito para demonstracao local do painel parceiro. Ele mantem os nomes e colunas principais que o app usa, mas nao inclui toda a parte de auth e RLS do projeto principal.
